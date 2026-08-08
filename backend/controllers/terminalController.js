/**
 * terminalController.js
 * The core terminal engine — processes every command the user types.
 *
 * Routes served:
 *   POST /api/terminal/execute            → executeCommand
 *   GET  /api/terminal/history/:sessionId → getHistory
 *   GET  /api/terminal/resume/:sessionId  → getResumeState
 *
 * Architecture (Phase 2/3/4/5 — content-driven):
 *
 *   The virtual filesystem always comes from the Environment Engine
 *   (template + incident evidence pack), overlaid with the player's saved
 *   Investigation Report so Terminal and File Manager show identical
 *   content (dev rules #4, #10, #11).
 *
 *   Progress is evidence-based, not command-based: every command is
 *   checked against the incident's discoveries.json. Any of a discovery's
 *   registered triggers can fire it — there is no single "correct"
 *   command (dev rule #7). Objectives complete when their required
 *   discoveries are all unlocked (dev rule #8) — never from command or
 *   filename matching.
 *
 *   Every command is recorded in command_history — the single official
 *   source of terminal history (dev rule #28). Discovery unlocks and
 *   objective completions are recorded as generic Investigation Events
 *   (dev rule #15); commands are NOT duplicated into investigation_events
 *   (dev rule #29) — Event Analytics reads command_history directly for
 *   command-derived metrics and investigation_events for everything else.
 */

const terminalModel = require('../models/terminalModel');
const scenarioModel = require('../models/scenarioModel');
const sessionModel = require('../models/sessionModel');
const hintModel = require('../models/hintModel');
const investigationDiscoveryModel = require('../models/investigationDiscoveryModel');
const { parseCommand, buildErrorOutput } = require('../utils/terminalParser');
const discoveryEngine = require('../services/investigation/discoveryEngine');
const objectiveEngine = require('../services/investigation/objectiveEngine');
const eventEngine = require('../services/investigation/eventEngine');
const reportEngine = require('../services/investigation/reportEngine');
const { evaluateAutoTrigger, generateAutoHint } = require('../services/autoTriggerService');
const { buildEnvironment } = require('../services/environment/environmentEngine');
const { resolveIncidentId } = require('../services/environment/incidentResolver');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

/**
 * POST /api/terminal/execute
 * Body: { session_id, command, current_path }
 */
const executeCommand = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { session_id, command, current_path = '/' } = req.body;

        if (!session_id || !command) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const sessionId = parseInt(session_id, 10);

        // ── Validate session ──────────────────────────────────────────────────
        const session = await sessionModel.getSessionById(sessionId, userId);
        if (!session) {
            return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
        }
        if (session.status !== 'in_progress') {
            return response.error(res, 400, MESSAGES.SESSION_ALREADY_CLOSED);
        }

        // ── Parse ─────────────────────────────────────────────────────────────
        const parsed = parseCommand(command);

        // ── Handle invalid / unknown command ──────────────────────────────────
        if (!parsed.valid) {
            await terminalModel.saveCommand({
                sessionId,
                commandEntered: command,
                matchExpected: false,
                matchStepOrder: null,
                matchType: null,
            });

            return response.success(res, 200, MESSAGES.COMMAND_PROCESSED, {
                output: buildErrorOutput(parsed),
                matched: false,
                completedObjectiveIds: [],
                newDiscoveries: [],
            });
        }

        // ── Resolve incident + load content in parallel ────────────────────────
        // incidentId is resolved from this session's own scenario — never
        // trusted from the client, never hardcoded.
        const scenario = await scenarioModel.getScenarioById(session.scenario_id);
        const incidentId = resolveIncidentId(scenario.type);

        const [environment, discoveries, objectives, unlockedKeysBefore] = await Promise.all([
            buildEnvironment(incidentId),
            discoveryEngine.getDiscoveries(incidentId),
            objectiveEngine.getObjectives(incidentId),
            investigationDiscoveryModel.getUnlockedKeys(sessionId),
        ]);

        // The player's saved report overrides the starter template so
        // Terminal `cat` always shows their latest edits.
        await reportEngine.applyReportOverlay(environment.virtualFiles, environment.incident, sessionId);

        // ── Discovery matching ───────────────────────────────────────────────
        const newDiscoveries = discoveryEngine.matchDiscoveries(
            parsed, discoveries, unlockedKeysBefore, current_path
        );

        for (const discovery of newDiscoveries) {
            await investigationDiscoveryModel.saveDiscovery({
                sessionId,
                discoveryKey: discovery.key,
                triggeredByCommand: command,
            });
            await eventEngine.logEvent(sessionId, eventEngine.EVENT_TYPES.DISCOVERY_UNLOCKED, {
                key: discovery.key,
                title: discovery.title,
                source: 'command',
            });
        }

        const unlockedKeysAfter = [...unlockedKeysBefore, ...newDiscoveries.map(d => d.key)];

        // ── Objective completion ─────────────────────────────────────────────
        const completedBefore = objectiveEngine.resolveCompletedObjectives(objectives, unlockedKeysBefore);
        const completedObjectiveIds = objectiveEngine.resolveCompletedObjectives(objectives, unlockedKeysAfter);
        const newlyCompletedObjectiveIds = completedObjectiveIds.filter(id => !completedBefore.includes(id));

        for (const objectiveId of newlyCompletedObjectiveIds) {
            await eventEngine.logEvent(sessionId, eventEngine.EVENT_TYPES.OBJECTIVE_COMPLETED, { objectiveId });
        }

        // ── Fetch prior history for the `history` command (before saving) ─────
        let commandHistoryForOutput = [];
        if (parsed.command === 'history') {
            commandHistoryForOutput = await terminalModel.getCommandHistory(sessionId);
        }

        // ── Save command to history ───────────────────────────────────────────
        const matched = newDiscoveries.length > 0;
        await terminalModel.saveCommand({
            sessionId,
            commandEntered: command,
            matchExpected: matched,
            matchStepOrder: null,
            matchType: matched ? 'discovery' : null,
        });

        // ── Build terminal output ─────────────────────────────────────────────
        // The new content-driven filesystem has no hidden/reveal mechanic
        // (dev rule: "the scenario intentionally avoids hidden information") —
        // every evidence file is visible from the start.
        const output = buildTerminalOutput(parsed, environment.virtualFiles, current_path, commandHistoryForOutput);

        // ── Auto-trigger hint evaluation (non-blocking, never affects response) ─
        let autoHint = null;
        try {
            const freshHistory = await terminalModel.getCommandHistory(sessionId);

            const triggerResult = await evaluateAutoTrigger({
                sessionId,
                scenarioId: session.scenario_id,
                commandHistory: freshHistory,
                discoveries,
                objectives,
                unlockedKeys: unlockedKeysAfter,
                sessionStartTime: session.start_time,
            });

            if (triggerResult.shouldTrigger) {
                const previousHintRows = await hintModel.getHintsBySession(sessionId);
                const previousHints = previousHintRows.map(h => h.hint_returned);

                autoHint = await generateAutoHint({
                    sessionId,
                    scenarioId: session.scenario_id,
                    commandHistory: freshHistory,
                    discoveries,
                    objectives,
                    unlockedKeys: unlockedKeysAfter,
                    previousHints,
                    scenarioTitle: scenario.title,
                    missionBrief: scenario.mission_brief,
                    sessionStartTime: session.start_time,
                    triggerReason: triggerResult.reason,
                });
            }
        } catch (autoTriggerErr) {
            console.error('[AutoTrigger] Evaluation error (suppressed):', autoTriggerErr.message);
        }

        // ── Response ──────────────────────────────────────────────────────────
        return response.success(res, 200, MESSAGES.COMMAND_PROCESSED, {
            output,
            matched,
            completedObjectiveIds,
            newlyCompletedObjectiveIds,
            newDiscoveries: newDiscoveries.map(d => ({
                key: d.key,
                title: d.title,
                description: d.description,
                category: d.category,
                weight: d.weight,
                required: d.required,
            })),
            auto_hint: autoHint,
        });

    } catch (err) {
        console.error('executeCommand error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * GET /api/terminal/history/:sessionId
 * Returns full command history for a session.
 */
const getHistory = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const sessionId = parseInt(req.params.sessionId, 10);

        if (isNaN(sessionId)) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const session = await sessionModel.getSessionById(sessionId, userId);
        if (!session) {
            return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
        }

        const history = await terminalModel.getCommandHistory(sessionId);

        return response.success(res, 200, MESSAGES.HISTORY_FETCHED, { history });
    } catch (err) {
        console.error('getHistory error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

/**
 * GET /api/terminal/resume/:sessionId
 * Read-only rehydration snapshot for an in-progress session — what this
 * session has already legitimately unlocked, so a page refresh doesn't
 * lose progress state the frontend has no other way to reconstruct.
 */
const getResumeState = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const sessionId = parseInt(req.params.sessionId, 10);

        if (isNaN(sessionId)) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const session = await sessionModel.getSessionById(sessionId, userId);
        if (!session) {
            return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
        }

        const scenario = await scenarioModel.getScenarioById(session.scenario_id);
        const incidentId = resolveIncidentId(scenario.type);

        const [discoveries, objectives, unlockedKeys] = await Promise.all([
            discoveryEngine.getDiscoveries(incidentId),
            objectiveEngine.getObjectives(incidentId),
            investigationDiscoveryModel.getUnlockedKeys(sessionId),
        ]);

        const completedObjectiveIds = objectiveEngine.resolveCompletedObjectives(objectives, unlockedKeys);
        const unlockedDiscoveries = discoveries
            .filter(d => unlockedKeys.includes(d.key))
            .map(d => ({ key: d.key, title: d.title, description: d.description, category: d.category }));

        return response.success(res, 200, MESSAGES.RESUME_STATE_FETCHED, {
            completedObjectiveIds,
            unlockedDiscoveries,
        });
    } catch (err) {
        console.error('getResumeState error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

// =============================================================================
// TERMINAL OUTPUT BUILDER
// Simulates a real Linux filesystem from virtualFiles entries.
// =============================================================================

/**
 * Build the terminal output string for a valid command
 * against the virtual filesystem.
 *
 * @param {Object} parsed       - Parsed command object
 * @param {Array}  virtualFiles - Virtual filesystem entries for this incident
 * @param {string} currentPath  - User's current directory
 * @param {Array}  commandHistory - Prior command history (for `history` command)
 * @returns {string} Terminal output to display
 */
const buildTerminalOutput = (parsed, virtualFiles, currentPath, commandHistory = []) => {
    const { command, target } = parsed;

    switch (command) {
        case 'ls': return handleLs(resolvePath(target, currentPath), virtualFiles);
        case 'cat': return handleCat(target, virtualFiles, currentPath);
        case 'pwd': return currentPath;
        case 'whoami': return 'root';
        case 'cd': return handleCd(target, virtualFiles, currentPath);
        case 'grep': return handleGrep(parsed, virtualFiles, currentPath);
        case 'find': return handleFind(parsed, virtualFiles, currentPath);
        case 'ps': return handlePs(parsed);
        case 'locate': return handleLocate(parsed, virtualFiles);
        case 'strings': return handleStrings(parsed, virtualFiles, currentPath);
        case 'history': return handleHistory(commandHistory);
        case 'clear': return '__CLEAR__';
        case 'help': return buildHelp();
        default: return `bash: ${command}: command not found`;
    }
};

const handleLs = (path, virtualFiles) => {
    const normalizedPath = normalizePath(path);
    // Correct prefix for root vs non-root — avoids the '//' bug
    const prefix = normalizedPath === '/' ? '/' : normalizedPath + '/';

    // Step 1: collect immediate subdirectory names (stored WITHOUT trailing slash)
    const subdirs = new Set();
    virtualFiles.forEach(f => {
        const fp = normalizePath(f.file_path);
        if (fp.startsWith(prefix) && fp.length > prefix.length) {
            const remainder = normalizedPath === '/'
                ? fp.slice(1)
                : fp.slice(prefix.length);
            if (remainder.includes('/')) {
                subdirs.add(remainder.split('/')[0]);
            }
        }
    });

    // Step 2: collect direct file children — skip anything already captured as a subdir
    const fileNames = [];
    const seenFiles = new Set();
    virtualFiles.forEach(f => {
        const fp = normalizePath(f.file_path);
        if (getParentPath(fp) === normalizedPath) {
            const name = f.file_name || fp.split('/').pop();
            if (!subdirs.has(name) && !seenFiles.has(name)) {
                seenFiles.add(name);
                fileNames.push(name);
            }
        }
    });

    if (subdirs.size === 0 && fileNames.length === 0) {
        const dirExists = normalizedPath === '/' ||
            virtualFiles.some(f => normalizePath(f.file_path).startsWith(prefix));
        if (!dirExists) {
            return `ls: cannot access '${path}': No such file or directory`;
        }
        return '(empty directory)';
    }

    return [
        ...Array.from(subdirs).sort().map(d => d + '/'),
        ...fileNames.sort(),
    ].join('  ');
};

const handleCd = (target, virtualFiles, currentPath) => {
    if (!target) return '';

    const resolvedPath = resolvePath(target, currentPath);
    const normalizedPath = normalizePath(resolvedPath);

    // Look up the explicit entry stored at exactly this path
    const entry = virtualFiles.find(f =>
        normalizePath(f.file_path) === normalizedPath
    );

    if (entry) {
        // Explicit entry found — accept only if it is a directory
        return entry.file_type === 'directory'
            ? ''
            : `bash: cd: ${target}: Not a directory`;
    }

    // No explicit entry — accept if files live beneath this path (inferred directory)
    const prefix = normalizedPath === '/' ? '/' : normalizedPath + '/';
    const hasChildren = normalizedPath === '/' ||
        virtualFiles.some(f => normalizePath(f.file_path).startsWith(prefix));

    return hasChildren
        ? ''
        : `bash: cd: ${target}: No such file or directory`;
};

const handleCat = (target, virtualFiles, currentPath) => {
    if (!target) return 'cat: missing operand';

    const resolvedPath = resolvePath(target, currentPath);
    const file = virtualFiles.find(f =>
        normalizePath(f.file_path) === normalizePath(resolvedPath)
    );

    if (!file) return `cat: ${target}: No such file or directory`;

    return file.content || '(empty file)';
};

const handleGrep = (parsed, virtualFiles, currentPath) => {
    const { positional, flags } = parsed;

    if (positional.length < 2) {
        return 'Usage: grep [options] [pattern] [file|path]\r\nOptions: -r recursive  -i case-insensitive  -n line numbers  -v invert';
    }

    const pattern = positional[0];
    const targetArg = positional[positional.length - 1];
    const targetPath = resolvePath(targetArg, currentPath);

    const caseInsensitive = flags.some(f => f.includes('i'));
    const showLineNums = flags.some(f => f.includes('n'));
    const invertMatch = flags.some(f => f.includes('v'));
    const recursive = flags.some(f => f.includes('r') || f.includes('R'));

    const hits = (line) => {
        const hay = caseInsensitive ? line.toLowerCase() : line;
        const needle = caseInsensitive ? pattern.toLowerCase() : pattern;
        const match = hay.includes(needle);
        return invertMatch ? !match : match;
    };

    const fmt = (line, idx, filePath, showFile) =>
        `${showFile ? filePath + ':' : ''}${showLineNums ? (idx + 1) + ':' : ''}${line}`;

    if (recursive) {
        const normalizedTarget = normalizePath(targetPath);
        const filesToSearch = virtualFiles.filter(f =>
            normalizePath(f.file_path).startsWith(normalizedTarget)
        );
        if (filesToSearch.length === 0) {
            return `grep: ${targetArg}: No such file or directory`;
        }
        const results = [];
        filesToSearch.forEach(file => {
            (file.content || '').split('\n').forEach((line, idx) => {
                if (hits(line)) results.push(fmt(line, idx, file.file_path, true));
            });
        });
        return results.length > 0 ? results.join('\r\n') : `(no matches for '${pattern}')`;
    }

    const file = virtualFiles.find(f =>
        normalizePath(f.file_path) === normalizePath(targetPath)
    );
    if (!file) return `grep: ${targetArg}: No such file or directory`;

    const results = [];
    (file.content || '').split('\n').forEach((line, idx) => {
        if (hits(line)) results.push(fmt(line, idx, file.file_path, false));
    });
    return results.length > 0 ? results.join('\r\n') : `(no matches for '${pattern}')`;
};

// Simple wildcard matcher: supports * as multi-char wildcard
const matchesWildcard = (name, pattern) => {
    if (!pattern || !name) return false;
    if (!pattern.includes('*')) return name.toLowerCase().includes(pattern.toLowerCase());
    const parts = pattern.toLowerCase().split('*');
    let pos = 0;
    const lower = name.toLowerCase();
    for (const part of parts) {
        if (!part) continue;
        const found = lower.indexOf(part, pos);
        if (found === -1) return false;
        pos = found + part.length;
    }
    return true;
};

const handleFind = (parsed, virtualFiles, currentPath) => {
    const { positional, args } = parsed;

    const rawPath = positional.length > 0 ? positional[0] : currentPath;
    const searchPath = resolvePath(rawPath, currentPath);
    const normalizedRoot = normalizePath(searchPath);

    const nameIdx = args.indexOf('-name');
    const nameFilter = nameIdx !== -1 && args[nameIdx + 1] ? args[nameIdx + 1] : null;

    const typeIdx = args.indexOf('-type');
    const typeFilter = typeIdx !== -1 && args[typeIdx + 1] ? args[typeIdx + 1] : null;

    const rootExists = normalizedRoot === '/' || virtualFiles.some(f => {
        const fp = normalizePath(f.file_path);
        return fp === normalizedRoot || fp.startsWith(normalizedRoot + '/');
    });

    if (!rootExists) return `find: '${rawPath}': No such file or directory`;

    if (typeFilter === 'd') {
        const dirs = new Set([normalizedRoot]);
        virtualFiles.forEach(f => {
            const fp = normalizePath(f.file_path);
            if (fp.startsWith(normalizedRoot === '/' ? '/' : normalizedRoot + '/')) {
                const parts = fp.split('/').filter(Boolean);
                for (let i = 1; i < parts.length; i++) {
                    dirs.add('/' + parts.slice(0, i).join('/'));
                }
            }
        });
        let results = Array.from(dirs).sort();
        if (nameFilter) {
            results = results.filter(d => matchesWildcard(d.split('/').pop() || '/', nameFilter));
        }
        return results.join('\r\n') || '(no directories found)';
    }

    let found = virtualFiles.filter(f => {
        const fp = normalizePath(f.file_path);
        return fp === normalizedRoot || fp.startsWith(normalizedRoot === '/' ? '/' : normalizedRoot + '/');
    });

    if (nameFilter) {
        found = found.filter(f => {
            const name = f.file_name || f.file_path.split('/').pop();
            return matchesWildcard(name, nameFilter);
        });
    }

    if (found.length === 0) {
        return nameFilter
            ? `(no files matching '${nameFilter}' found under ${rawPath})`
            : `find: '${rawPath}': No such file or directory`;
    }

    return found.map(f => f.file_path).join('\r\n');
};

const handlePs = (parsed) => {
    const fullStyle =
        parsed.positional.some(p => /^-?aux?$/.test(p)) ||
        parsed.flags.some(f => /[auxef]/.test(f));

    if (fullStyle) {
        return [
            'USER       PID  %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
            'root         1   0.0  0.1   4236  1024 ?        Ss   08:00   0:01 /sbin/init',
            'root       412   0.0  0.2   6012  2048 ?        Ss   08:00   0:00 /usr/sbin/sshd',
            'www-data   891   0.1  0.5  18356  5120 ?        Ss   08:01   0:03 /usr/sbin/apache2',
            'root      1024   0.0  0.1   2988   724 ?        Ss   08:00   0:00 /usr/sbin/crond',
            'root      1337   0.0  0.1   3712   756 pts/0    Ss   09:15   0:00 -bash',
            'root      2048   0.2  1.2  45320 12288 ?        Sl   09:16   0:12 python3 /opt/scripts/monitor.py',
            'root      3127   0.4  0.6   8192  6144 ?        S    09:45   0:05 /bin/sh /tmp/.update.sh',
            'root      4200   0.0  0.0   2784   512 pts/0    R+   10:23   0:00 ps aux',
            'root      4150   0.0  0.1   5120  1024 pts/1    Ss   02:15   0:00 sshd: developer@pts/1',
        ].join('\r\n');
    }

    return [
        '  PID TTY          TIME CMD',
        '    1 ?        00:00:01 init',
        '  412 ?        00:00:00 sshd',
        '  891 ?        00:00:03 apache2',
        ' 1024 ?        00:00:00 crond',
        ' 1337 pts/0    00:00:00 bash',
        ' 2048 ?        00:00:12 python3',
        ' 3127 ?        00:00:05 sh',
        ' 4200 pts/0    00:00:00 ps',
    ].join('\r\n');
};

const handleLocate = (parsed, virtualFiles) => {
    const searchTerm = parsed.positional[0] || parsed.target;
    if (!searchTerm) return 'Usage: locate [filename]';

    const lower = searchTerm.toLowerCase();
    const matches = virtualFiles.filter(f => {
        const name = (f.file_name || f.file_path.split('/').pop()).toLowerCase();
        return name.includes(lower) || f.file_path.toLowerCase().includes(lower);
    });

    if (matches.length === 0) return `locate: no results found for '${searchTerm}'`;
    return matches.map(f => f.file_path).join('\r\n');
};

const handleStrings = (parsed, virtualFiles, currentPath) => {
    const target = parsed.target;
    if (!target) return 'Usage: strings [file]';

    const resolvedPath = resolvePath(target, currentPath);
    const file = virtualFiles.find(f =>
        normalizePath(f.file_path) === normalizePath(resolvedPath)
    );

    if (!file) return `strings: ${target}: No such file or directory`;

    const content = file.content || '';
    const extracted = content.match(/[ -~\t]{4,}/g) || [];
    if (extracted.length === 0) return '(no printable strings found)';

    return [...new Set(extracted)].join('\r\n');
};

const handleHistory = (commandHistory) => {
    if (!commandHistory || commandHistory.length === 0) return '(no command history)';
    return commandHistory
        .map((entry, i) => `  ${String(i + 1).padStart(4)}  ${entry.command_entered}`)
        .join('\r\n');
};

const buildHelp = () => {
    return [
        'Available commands:',
        '  ls [path]                    List directory contents',
        '  cat [file]                   Display file contents',
        '  grep [-r|-i|-n|-v] [p] [f]  Search file/directory for pattern',
        '  find [path] [-name p]        Find files under path',
        '  locate [name]                Locate files by name across filesystem',
        '  ps [aux]                     Show running processes',
        '  strings [file]               Extract printable strings from file',
        '  history                      Show command history for this session',
        '  cd [path]                    Change directory',
        '  pwd                          Print working directory',
        '  whoami                       Print current user',
        '  clear                        Clear terminal',
        '  help                         Show this message',
    ].join('\r\n');
};

// Path utilities

const normalizePath = (path) => {
    if (!path) return '/';
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
};

// Resolve . and .. segments in an already-absolute path
const resolveAbsPath = (absPath) => {
    const parts = absPath.split('/').filter(p => p !== '');
    const out = [];
    for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') { out.pop(); }
        else out.push(part);
    }
    return '/' + out.join('/') || '/';
};

const getParentPath = (filePath) => {
    const n = normalizePath(filePath);
    if (n === '/') return '/';
    const idx = n.lastIndexOf('/');
    return idx === 0 ? '/' : n.slice(0, idx);
};

// Resolves relative, absolute, .., ., and ~/ paths
const resolvePath = (target, currentPath) => {
    if (!target) return normalizePath(currentPath);
    // ~ expands to root in this simulated environment
    const expanded = target === '~' ? '/'
        : target.startsWith('~/') ? '/' + target.slice(2)
            : target;
    if (expanded.startsWith('/')) {
        return resolveAbsPath(normalizePath(expanded));
    }
    const base = currentPath === '/' ? '' : currentPath;
    return resolveAbsPath(normalizePath(base + '/' + expanded));
};

module.exports = {
    executeCommand,
    getHistory,
    getResumeState,
};
