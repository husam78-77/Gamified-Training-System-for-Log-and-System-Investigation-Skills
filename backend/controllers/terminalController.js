/**
 * terminalController.js
 * The core terminal engine — processes every command the user types.
 *
 * Routes served:
 *   POST /api/terminal/execute   → executeCommand
 *   GET  /api/terminal/history/:sessionId → getHistory
 */

const terminalModel = require('../models/terminalModel');
const scenarioModel = require('../models/scenarioModel');
const sessionModel = require('../models/sessionModel');
const hintModel = require('../models/hintModel');
const { parseCommand, buildErrorOutput } = require('../utils/terminalParser');
const evaluationService = require('../services/evaluationService');
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
 *  1. Validate session belongs to user and is in_progress
 *  2. Parse the raw command string
 *  3. If invalid → return error output, save to history as unmatched
 *  4. If valid → match against expected steps
 *  5. Save command to history
 *  6. If matched → check for newly revealed files + objective updates
 *  7. Build terminal output based on command + virtual filesystem
 *  8. Return output + state updates
 */
const executeCommand = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { session_id, command, current_path = '/' } = req.body;

        if (!session_id || !command) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const sessionId = parseInt(session_id, 10);

        // Validate session
        const session = await sessionModel.getSessionById(sessionId, userId);
        if (!session) {
            return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
        }
        if (session.status !== 'in_progress') {
            return response.error(res, 400, MESSAGES.SESSION_ALREADY_CLOSED);
        }

        // Parse the command
        const parsed = parseCommand(command);

        // Handle invalid/unknown commands immediately
        if (!parsed.valid) {
            await terminalModel.saveCommand({
                sessionId,
                commandEntered: command,
                matchExpected: false,
                matchStepOrder: null,
            });

            return response.success(res, 200, MESSAGES.COMMAND_PROCESSED, {
                output: buildErrorOutput(parsed),
                matched: false,
                newlyRevealedFiles: [],
                completedObjectiveIds: [],
            });
        }

        // Load scenario data needed for evaluation
        const [expectedSteps, virtualFiles, objectives] = await Promise.all([
            scenarioModel.getExpectedStepsByScenario(session.scenario_id),
            scenarioModel.getVirtualFilesByScenario(session.scenario_id),
            scenarioModel.getObjectivesByScenario(session.scenario_id),
        ]);

        // Get already-completed steps for this session
        const matchedHistory = await terminalModel.getMatchedCommands(sessionId);
        const completedStepOrders = matchedHistory.map(c => c.match_step_order);

        // Evaluate the command — pass current_path for relative path matching
        const { matched, step } = evaluationService.matchCommand(
            parsed,
            expectedSteps,
            completedStepOrders,
            current_path
        );

        // Fetch history BEFORE saving so the 'history' command shows only prior commands
        let commandHistoryForOutput = [];
        if (parsed.command === 'history') {
            commandHistoryForOutput = await terminalModel.getCommandHistory(sessionId);
        }

        // Save command to history
        await terminalModel.saveCommand({
            sessionId,
            commandEntered: command,
            matchExpected: matched,
            matchStepOrder: matched ? step.step_order : null,
        });

        // Build terminal output from the virtual filesystem
        const output = buildTerminalOutput(parsed, virtualFiles, current_path, commandHistoryForOutput);

        // If matched: check for file reveals and objective completions
        let newlyRevealedFiles = [];
        let completedObjectiveIds = [];

        if (matched) {
            const updatedStepOrders = [...completedStepOrders, step.step_order];

            // Find files that should now be revealed
            newlyRevealedFiles = virtualFiles.filter(
                f => f.is_hidden && f.reveal_at_step === step.step_order
            );

            // Resolve newly completed objectives
            completedObjectiveIds = evaluationService.resolveCompletedObjectives(
                objectives,
                updatedStepOrders
            );
        }

        // ── Phase 5: Auto-trigger evaluation ────────────────────────────
        // Runs after all command processing is complete.
        // Does not block or alter the command result — purely additive.
        // If this entire block throws, the command response is unaffected.
        let autoHint = null;

        try {
            // Re-fetch history so the analyzer includes the command just saved
            const freshHistory = await terminalModel.getCommandHistory(sessionId);

            // updatedStepOrders reflects the current state including this command
            const updatedStepOrders = matched
                ? [...completedStepOrders, step.step_order]
                : completedStepOrders;

            const triggerResult = await evaluateAutoTrigger({
                sessionId,
                scenarioId: session.scenario_id,
                commandHistory: freshHistory,
                expectedSteps,
                completedStepOrders: updatedStepOrders,
                sessionStartTime: session.start_time,
            });

            if (triggerResult.shouldTrigger) {
                const [previousHintRows, scenario] = await Promise.all([
                    hintModel.getHintsBySession(sessionId),
                    scenarioModel.getScenarioById(session.scenario_id),
                ]);
                const previousHints = previousHintRows.map(h => h.hint_returned);

                autoHint = await generateAutoHint({
                    sessionId,
                    scenarioId: session.scenario_id,
                    commandHistory: freshHistory,
                    expectedSteps,
                    completedStepOrders: updatedStepOrders,
                    previousHints,
                    scenarioTitle: scenario.title,
                    missionBrief: scenario.mission_brief,
                    sessionStartTime: session.start_time,
                    triggerReason: triggerResult.reason,
                });
            }
        } catch (autoTriggerErr) {
            // Auto-trigger failure must NEVER affect the command response
            console.error('[AutoTrigger] Evaluation error (suppressed):', autoTriggerErr.message);
        }

        return response.success(res, 200, MESSAGES.COMMAND_PROCESSED, {
            output,
            matched,
            matchedStep: matched ? {
                step_order: step.step_order,
                description: step.description,
            } : null,
            newlyRevealedFiles,
            completedObjectiveIds,
            auto_hint: autoHint,  // null if no trigger fired, { hint, hintLevel } if triggered
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

// =============================================================================
// TERMINAL OUTPUT BUILDER
// Simulates a real Linux filesystem from virtual_files rows.
// =============================================================================

/**
 * Build the terminal output string for a valid command
 * against the virtual filesystem.
 *
 * @param {Object} parsed       - Parsed command object
 * @param {Array}  virtualFiles - All virtual_files rows (visible ones)
 * @param {string} currentPath  - User's current directory
 * @returns {string} Terminal output to display
 */
const buildTerminalOutput = (parsed, virtualFiles, currentPath, commandHistory = []) => {
    const { command, target } = parsed;

    switch (command) {
        case 'ls':
            return handleLs(target || currentPath, virtualFiles);

        case 'cat':
            return handleCat(target, virtualFiles, currentPath);

        case 'pwd':
            return currentPath;

        case 'whoami':
            return 'root';

        case 'cd':
            return '';

        case 'grep':
            return handleGrep(parsed, virtualFiles, currentPath);

        case 'find':
            return handleFind(parsed, virtualFiles, currentPath);

        case 'ps':
            return handlePs(parsed);

        case 'locate':
            return handleLocate(parsed, virtualFiles);

        case 'strings':
            return handleStrings(parsed, virtualFiles, currentPath);

        case 'history':
            return handleHistory(commandHistory);

        case 'clear':
            return '__CLEAR__';

        case 'help':
            return buildHelp();

        default:
            return `bash: ${command}: command not found`;
    }
};

const handleLs = (path, virtualFiles) => {
    const normalizedPath = normalizePath(path);

    // Find all files whose path starts with the requested directory
    const items = virtualFiles.filter(f => {
        const filePath = normalizePath(f.file_path);
        const parent = getParentPath(filePath);
        return parent === normalizedPath;
    });

    if (items.length === 0) {
        // Check if the directory itself exists
        const dirExists = virtualFiles.some(f =>
            normalizePath(f.file_path).startsWith(normalizedPath + '/')
        );
        if (!dirExists && normalizedPath !== '/') {
            return `ls: cannot access '${path}': No such file or directory`;
        }
    }

    // Also find subdirectories
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
    const dirNames = Array.from(subdirs);

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

    const pattern = positional[0];
    const targetArg = positional[positional.length - 1];
    const targetPath = resolvePath(targetArg, currentPath);

    const caseInsensitive = flags.some(f => f.includes('i'));
    const showLineNums   = flags.some(f => f.includes('n'));
    const invertMatch    = flags.some(f => f.includes('v'));
    const recursive      = flags.some(f => f.includes('r') || f.includes('R'));

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

    // First positional is the search root; fall back to currentPath
    const rawPath = positional.length > 0 ? positional[0] : currentPath;
    const searchPath = resolvePath(rawPath, currentPath);
    const normalizedRoot = normalizePath(searchPath);

    // Extract -name filter
    const nameIdx = args.indexOf('-name');
    const nameFilter = nameIdx !== -1 && args[nameIdx + 1] ? args[nameIdx + 1] : null;

    // Extract -type filter ('f' = files, 'd' = directories)
    const typeIdx = args.indexOf('-type');
    const typeFilter = typeIdx !== -1 && args[typeIdx + 1] ? args[typeIdx + 1] : null;

    const rootExists = normalizedRoot === '/' || virtualFiles.some(f => {
        const fp = normalizePath(f.file_path);
        return fp === normalizedRoot || fp.startsWith(normalizedRoot + '/');
    });

    if (!rootExists) return `find: '${rawPath}': No such file or directory`;

    // Enumerate directories from virtual file paths
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

    // Find files
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

// ── New command handlers ──────────────────────────────────────────────────────

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
    // Extract sequences of printable ASCII characters of length >= 4
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

// ─────────────────────────────────────────────────────────────────────────────

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