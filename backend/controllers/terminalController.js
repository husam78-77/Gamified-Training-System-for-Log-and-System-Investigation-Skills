/**
 * terminalController.js
 * The core terminal engine — processes every command the user types.
 *
 * Routes served:
 *   POST /api/terminal/execute   → executeCommand
 *   GET  /api/terminal/history/:sessionId → getHistory
 *
 * Architecture note — dual evaluation strategy:
 *
 *   1. DIRECT STEP MATCH (legacy, always runs)
 *      Checks the command against expected_steps exactly.
 *      Keeps the hint level system 100% functional.
 *
 *   2. DISCOVERY MATCH (new, runs in parallel when scenario has discoveries)
 *      Checks the command against discovery_triggers.
 *      Any trigger in any discovery can fire for the same command.
 *      When a discovery fires it optionally credits maps_to_step_order
 *      so the hint system stays in sync even when the player used an
 *      alternative investigation path.
 *
 *   The two systems are additive: a command can satisfy both, one, or neither.
 *   File revelation and objective completion respond to both systems.
 */

const terminalModel = require('../models/terminalModel');
const scenarioModel = require('../models/scenarioModel');
const sessionModel  = require('../models/sessionModel');
const hintModel     = require('../models/hintModel');
const discoveryModel = require('../models/discoveryModel');
const { parseCommand, buildErrorOutput } = require('../utils/terminalParser');
const evaluationService = require('../services/evaluationService');
const { matchDiscoveries } = require('../services/discoveryService');
const { evaluateAutoTrigger, generateAutoHint } = require('../services/autoTriggerService');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

/**
 * POST /api/terminal/execute
 * Processes a single terminal command.
 *
 * Body: { session_id, command, current_path }
 *
 * Flow:
 *  1. Validate session ownership and in_progress status
 *  2. Parse the raw command string
 *  3. If invalid → return error, save to history as unmatched
 *  4. Load scenario data (steps, files, objectives, discoveries) in parallel
 *  5. Run direct step match + discovery match
 *  6. Determine effective match state (union of both systems)
 *  7. Save command to history (with match_type)
 *  8. Save newly unlocked discoveries to session_discoveries
 *  9. Build terminal output from virtual filesystem
 * 10. Resolve revealed files (step-based + discovery-based)
 * 11. Resolve newly completed objectives
 * 12. Auto-trigger hint evaluation (non-blocking)
 * 13. Return response including newDiscoveries
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
                newlyRevealedFiles: [],
                completedObjectiveIds: [],
                newDiscoveries: [],
            });
        }

        // ── Load all scenario data in parallel ────────────────────────────────
        const [expectedSteps, virtualFiles, objectives, discoveries] = await Promise.all([
            scenarioModel.getExpectedStepsByScenario(session.scenario_id),
            scenarioModel.getVirtualFilesByScenario(session.scenario_id),
            scenarioModel.getObjectivesByScenario(session.scenario_id),
            discoveryModel.getDiscoveriesWithTriggers(session.scenario_id),
        ]);

        // ── Current progress state ────────────────────────────────────────────
        const [matchedHistory, completedDiscoveryIds] = await Promise.all([
            terminalModel.getMatchedCommands(sessionId),
            discoveryModel.getSessionDiscoveryIds(sessionId),
        ]);
        const completedStepOrders = matchedHistory.map(c => c.match_step_order);

        // ── Strategy 1: Direct step match ────────────────────────────────────
        const { matched: directMatch, step: matchedStep } = evaluationService.matchCommand(
            parsed,
            expectedSteps,
            completedStepOrders,
            current_path
        );

        // ── Strategy 2: Discovery match ───────────────────────────────────────
        const newDiscoveries = matchDiscoveries(
            parsed,
            discoveries,
            completedDiscoveryIds,
            current_path
        );

        // ── Fetch prior history for the `history` command (before saving) ─────
        let commandHistoryForOutput = [];
        if (parsed.command === 'history') {
            commandHistoryForOutput = await terminalModel.getCommandHistory(sessionId);
        }

        // ── Determine effective match for command_history record ──────────────
        //
        // Priority:
        //  - If direct match fired: use that step_order, type='direct'
        //  - Else if a discovery credits an uncompleted step: use that, type='discovery'
        //  - Else: no match
        //
        // If BOTH fire for the same step_order, only one record is saved (direct wins).
        let saveMatchExpected = directMatch;
        let saveStepOrder     = directMatch ? matchedStep.step_order : null;
        let saveMatchType     = directMatch ? 'direct' : null;

        if (!directMatch && newDiscoveries.length > 0) {
            // Find the first discovery that credits a step not yet completed
            const discoveryWithStep = newDiscoveries.find(d =>
                d.maps_to_step_order !== null &&
                d.maps_to_step_order !== undefined &&
                !completedStepOrders.includes(d.maps_to_step_order)
            );
            if (discoveryWithStep) {
                saveMatchExpected = true;
                saveStepOrder     = discoveryWithStep.maps_to_step_order;
                saveMatchType     = 'discovery';
            }
        }

        // ── Save command to history ───────────────────────────────────────────
        await terminalModel.saveCommand({
            sessionId,
            commandEntered: command,
            matchExpected:  saveMatchExpected,
            matchStepOrder: saveStepOrder,
            matchType:      saveMatchType,
        });

        // ── Save newly unlocked discoveries ───────────────────────────────────
        for (const discovery of newDiscoveries) {
            await discoveryModel.saveDiscovery({
                sessionId,
                discoveryId:       discovery.discovery_id,
                discoveryKey:      discovery.discovery_key,
                triggeredByCommand: command,
            });
        }

        // ── Build all updated step orders (for reveal + objective resolution) ─
        const updatedStepOrders = [...completedStepOrders];
        if (saveMatchExpected && saveStepOrder && !updatedStepOrders.includes(saveStepOrder)) {
            updatedStepOrders.push(saveStepOrder);
        }
        // Credit any additional discovery-mapped steps (for scenarios where one
        // command unlocks multiple discoveries mapping to different steps)
        for (const disc of newDiscoveries) {
            if (disc.maps_to_step_order && !updatedStepOrders.includes(disc.maps_to_step_order)) {
                updatedStepOrders.push(disc.maps_to_step_order);
            }
        }

        // ── Build terminal output ─────────────────────────────────────────────
        // Pass only visible files (is_hidden=false) to the output builder.
        // Hidden files are intentionally excluded until revealed.
        const visibleFiles = virtualFiles.filter(f => !f.is_hidden);
        const output = buildTerminalOutput(parsed, visibleFiles, current_path, commandHistoryForOutput);

        // ── Resolve newly revealed files ──────────────────────────────────────
        // Two revelation systems run in parallel:
        //   reveal_at_step         : revealed when a specific step_order is credited
        //   reveal_at_discovery_key: revealed when a named discovery is unlocked

        const newDiscoveryKeys = newDiscoveries.map(d => d.discovery_key);

        let newlyRevealedFiles = [];

        // Step-based reveals (direct match OR discovery credited the same step)
        if (directMatch) {
            newlyRevealedFiles.push(...virtualFiles.filter(
                f => f.is_hidden && f.reveal_at_step === matchedStep.step_order
            ));
        }
        if (saveMatchType === 'discovery' && saveStepOrder) {
            newlyRevealedFiles.push(...virtualFiles.filter(
                f => f.is_hidden && f.reveal_at_step === saveStepOrder &&
                     !newlyRevealedFiles.some(r => r.virtual_file_id === f.virtual_file_id)
            ));
        }

        // Discovery-key-based reveals (new system)
        if (newDiscoveryKeys.length > 0) {
            newlyRevealedFiles.push(...virtualFiles.filter(
                f => f.is_hidden &&
                     f.reveal_at_discovery_key &&
                     newDiscoveryKeys.includes(f.reveal_at_discovery_key) &&
                     !newlyRevealedFiles.some(r => r.virtual_file_id === f.virtual_file_id)
            ));
        }

        // ── Resolve newly completed objectives ────────────────────────────────
        const completedObjectiveIds = evaluationService.resolveCompletedObjectives(
            objectives,
            updatedStepOrders
        );

        // ── Phase 5: Auto-trigger evaluation ─────────────────────────────────
        // Runs after all processing. Never blocks or alters the command result.
        let autoHint = null;

        try {
            const freshHistory = await terminalModel.getCommandHistory(sessionId);

            const triggerResult = await evaluateAutoTrigger({
                sessionId,
                scenarioId:          session.scenario_id,
                commandHistory:      freshHistory,
                expectedSteps,
                completedStepOrders: updatedStepOrders,
                sessionStartTime:    session.start_time,
            });

            if (triggerResult.shouldTrigger) {
                const [previousHintRows, scenario] = await Promise.all([
                    hintModel.getHintsBySession(sessionId),
                    scenarioModel.getScenarioById(session.scenario_id),
                ]);
                const previousHints = previousHintRows.map(h => h.hint_returned);

                autoHint = await generateAutoHint({
                    sessionId,
                    scenarioId:          session.scenario_id,
                    commandHistory:      freshHistory,
                    expectedSteps,
                    completedStepOrders: updatedStepOrders,
                    previousHints,
                    scenarioTitle:       scenario.title,
                    missionBrief:        scenario.mission_brief,
                    sessionStartTime:    session.start_time,
                    triggerReason:       triggerResult.reason,
                });
            }
        } catch (autoTriggerErr) {
            // Auto-trigger failure must NEVER affect the command response
            console.error('[AutoTrigger] Evaluation error (suppressed):', autoTriggerErr.message);
        }

        // ── Response ──────────────────────────────────────────────────────────
        return response.success(res, 200, MESSAGES.COMMAND_PROCESSED, {
            output,
            matched: directMatch || newDiscoveries.length > 0,
            matchedStep: directMatch ? {
                step_order:  matchedStep.step_order,
                description: matchedStep.description,
            } : null,
            newlyRevealedFiles,
            completedObjectiveIds,
            newDiscoveries: newDiscoveries.map(d => ({
                discovery_key: d.discovery_key,
                title:         d.title,
                description:   d.description,
                evidence_tags: d.evidence_tags,
                is_critical:   d.is_critical,
                reveal_hint:   d.reveal_hint,
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
 * Used to restore terminal output on page refresh.
 */
const getHistory = async (req, res) => {
    try {
        const userId    = req.user.user_id;
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

// =============================================================================
// TERMINAL OUTPUT BUILDER
// Simulates a real Linux filesystem from virtual_files rows.
// =============================================================================

/**
 * Build the terminal output string for a valid command
 * against the virtual filesystem.
 *
 * @param {Object} parsed       - Parsed command object
 * @param {Array}  virtualFiles - Visible virtual_files rows for this scenario
 * @param {string} currentPath  - User's current directory
 * @param {Array}  commandHistory - Prior command history (for `history` command)
 * @returns {string} Terminal output to display
 */
const buildTerminalOutput = (parsed, virtualFiles, currentPath, commandHistory = []) => {
    const { command, target } = parsed;

    switch (command) {
        case 'ls':      return handleLs(target || currentPath, virtualFiles);
        case 'cat':     return handleCat(target, virtualFiles, currentPath);
        case 'pwd':     return currentPath;
        case 'whoami':  return 'root';
        case 'cd':      return '';
        case 'grep':    return handleGrep(parsed, virtualFiles, currentPath);
        case 'find':    return handleFind(parsed, virtualFiles, currentPath);
        case 'ps':      return handlePs(parsed);
        case 'locate':  return handleLocate(parsed, virtualFiles);
        case 'strings': return handleStrings(parsed, virtualFiles, currentPath);
        case 'history': return handleHistory(commandHistory);
        case 'clear':   return '__CLEAR__';
        case 'help':    return buildHelp();
        default:        return `bash: ${command}: command not found`;
    }
};

const handleLs = (path, virtualFiles) => {
    const normalizedPath = normalizePath(path);

    const items = virtualFiles.filter(f => {
        const filePath = normalizePath(f.file_path);
        const parent = getParentPath(filePath);
        return parent === normalizedPath;
    });

    if (items.length === 0) {
        const dirExists = virtualFiles.some(f =>
            normalizePath(f.file_path).startsWith(normalizedPath + '/')
        );
        if (!dirExists && normalizedPath !== '/') {
            return `ls: cannot access '${path}': No such file or directory`;
        }
    }

    const subdirs = new Set();
    virtualFiles.forEach(f => {
        const filePath = normalizePath(f.file_path);
        if (filePath.startsWith(normalizedPath + '/')) {
            const remainder = filePath.slice(normalizedPath.length + 1);
            const firstSegment = remainder.split('/')[0];
            if (remainder.includes('/')) {
                subdirs.add(firstSegment + '/');
            }
        }
    });

    const fileNames = items.map(f => f.file_name || f.file_path.split('/').pop());
    const dirNames  = Array.from(subdirs);

    return [...dirNames, ...fileNames].join('  ') || '(empty directory)';
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

    const pattern    = positional[0];
    const targetArg  = positional[positional.length - 1];
    const targetPath = resolvePath(targetArg, currentPath);

    const caseInsensitive = flags.some(f => f.includes('i'));
    const showLineNums    = flags.some(f => f.includes('n'));
    const invertMatch     = flags.some(f => f.includes('v'));
    const recursive       = flags.some(f => f.includes('r') || f.includes('R'));

    const hits = (line) => {
        const hay    = caseInsensitive ? line.toLowerCase() : line;
        const needle = caseInsensitive ? pattern.toLowerCase() : pattern;
        const match  = hay.includes(needle);
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

    const rawPath    = positional.length > 0 ? positional[0] : currentPath;
    const searchPath = resolvePath(rawPath, currentPath);
    const normalizedRoot = normalizePath(searchPath);

    const nameIdx   = args.indexOf('-name');
    const nameFilter = nameIdx !== -1 && args[nameIdx + 1] ? args[nameIdx + 1] : null;

    const typeIdx   = args.indexOf('-type');
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

const getParentPath = (filePath) => {
    const parts = filePath.split('/');
    parts.pop();
    return parts.join('/') || '/';
};

const resolvePath = (target, currentPath) => {
    if (target.startsWith('/')) return target;
    return normalizePath(currentPath + '/' + target);
};

module.exports = {
    executeCommand,
    getHistory,
};
