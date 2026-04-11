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
const { parseCommand, buildErrorOutput } = require('../utils/terminalParser');
const evaluationService = require('../services/evaluationService');
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

        // Evaluate the command
        const { matched, step } = evaluationService.matchCommand(
            parsed,
            expectedSteps,
            completedStepOrders
        );

        // Save command to history
        await terminalModel.saveCommand({
            sessionId,
            commandEntered: command,
            matchExpected: matched,
            matchStepOrder: matched ? step.step_order : null,
        });

        // Build terminal output from the virtual filesystem
        const output = buildTerminalOutput(parsed, virtualFiles, current_path);

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

        return response.success(res, 200, MESSAGES.COMMAND_PROCESSED, {
            output,
            matched,
            matchedStep: matched ? {
                step_order: step.step_order,
                description: step.description,
            } : null,
            newlyRevealedFiles,
            completedObjectiveIds,
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
const buildTerminalOutput = (parsed, virtualFiles, currentPath) => {
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
            // cd output is empty (path change is handled on frontend state)
            return '';

        case 'grep':
            return handleGrep(parsed, virtualFiles, currentPath);

        case 'find':
            return handleFind(target || currentPath, virtualFiles);

        case 'clear':
            // Signal to frontend to clear terminal
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
    const { positional } = parsed;

    if (positional.length < 2) {
        return 'Usage: grep [pattern] [file]';
    }

    const pattern = positional[0];
    const targetPath = resolvePath(positional[positional.length - 1], currentPath);

    const file = virtualFiles.find(f =>
        normalizePath(f.file_path) === normalizePath(targetPath)
    );

    if (!file) return `grep: ${positional[positional.length - 1]}: No such file or directory`;

    const lines = (file.content || '').split('\n');
    const matches = lines.filter(line =>
        line.toLowerCase().includes(pattern.toLowerCase())
    );

    return matches.length > 0
        ? matches.join('\r\n')
        : `(no matches for '${pattern}')`;
};

const handleFind = (path, virtualFiles) => {
    const normalizedPath = normalizePath(path);
    const found = virtualFiles.filter(f =>
        normalizePath(f.file_path).startsWith(normalizedPath)
    );

    if (found.length === 0) return `find: '${path}': No such file or directory`;

    return found.map(f => f.file_path).join('\r\n');
};

const buildHelp = () => {
    return [
        'Available commands:',
        '  ls [path]          List directory contents',
        '  cat [file]         Display file contents',
        '  grep [str] [file]  Search file for string',
        '  cd [path]          Change directory',
        '  pwd                Print working directory',
        '  find [path]        Find files under path',
        '  whoami             Print current user',
        '  clear              Clear terminal',
        '  help               Show this message',
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