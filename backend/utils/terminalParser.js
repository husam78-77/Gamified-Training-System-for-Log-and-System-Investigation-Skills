/**
 * terminalParser.js
 * Parses raw terminal input strings into structured command objects.
 * This is pure logic — no DB calls, no side effects.
 *
 * Supported commands: ls, cat, grep, cd, pwd, find, whoami, clear, help
 */

// Commands the terminal engine recognizes
const SUPPORTED_COMMANDS = [
    'ls', 'cat', 'grep', 'cd', 'pwd', 'find', 'whoami',
    'clear', 'help', 'ps', 'locate', 'strings', 'history',
];

/**
 * Parse a raw input string into a structured command object.
 *
 * Examples:
 *   "ls"                 → { command: 'ls', args: [], flags: [], target: null, raw: 'ls' }
 *   "cat /etc/passwd"    → { command: 'cat', args: ['/etc/passwd'], flags: [], target: '/etc/passwd', raw: '...' }
 *   "grep -r 'admin' /"  → { command: 'grep', args: ['-r', 'admin', '/'], flags: ['-r'], target: '/', raw: '...' }
 *   "ls -la /home"       → { command: 'ls', args: ['-la', '/home'], flags: ['-la'], target: '/home', raw: '...' }
 */
const parseCommand = (rawInput) => {
    if (!rawInput || typeof rawInput !== 'string') {
        return { valid: false, error: 'EMPTY_INPUT', raw: rawInput };
    }

    const trimmed = rawInput.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'EMPTY_INPUT', raw: rawInput };
    }

    // Split respecting quoted strings (e.g. grep "search term" /path)
    const tokens = tokenize(trimmed);

    if (tokens.length === 0) {
        return { valid: false, error: 'EMPTY_INPUT', raw: rawInput };
    }

    const command = tokens[0].toLowerCase();
    const allArgs = tokens.slice(1);

    // Separate flags (start with -) from positional args
    const flags = allArgs.filter(arg => arg.startsWith('-'));
    const positional = allArgs.filter(arg => !arg.startsWith('-'));

    // The target is the last positional argument (path or search term)
    const target = positional.length > 0 ? positional[positional.length - 1] : null;

    if (!SUPPORTED_COMMANDS.includes(command)) {
        return {
            valid: false,
            error: 'UNKNOWN_COMMAND',
            command,
            suggestion: getSuggestion(command),
            raw: trimmed,
        };
    }

    return {
        valid: true,
        command,
        args: allArgs,
        flags,
        positional,
        target,       // Most relevant path/value for evaluation matching
        raw: trimmed,
    };
};

/**
 * Tokenize a string, respecting single and double quoted groups.
 * "grep 'some value' /path" → ['grep', 'some value', '/path']
 */
const tokenize = (input) => {
    const tokens = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (char === "'" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            continue;
        }

        if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            continue;
        }

        if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
            if (current.length > 0) {
                tokens.push(current);
                current = '';
            }
            continue;
        }

        current += char;
    }

    if (current.length > 0) {
        tokens.push(current);
    }

    return tokens;
};

/**
 * Normalize a parsed command for comparison against expected_steps.
 * Strips quotes, lowercases command, resolves relative paths.
 *
 * Returns a normalized key: "command:target"
 * e.g. "cat:/etc/passwd", "ls:/home/user", "grep:/logs"
 */
const normalizeForEvaluation = (parsed) => {
    if (!parsed.valid) return null;

    const command = parsed.command;
    const target = parsed.target ? normalizePath(parsed.target) : null;

    return target ? `${command}:${target}` : command;
};

/**
 * Normalize a file path:
 * - Lowercase
 * - Remove trailing slashes
 * - Collapse double slashes
 */
const normalizePath = (path) => {
    if (!path) return null;
    return path
        .toLowerCase()
        .replace(/\/+/g, '/')       // collapse //
        .replace(/\/$/, '')          // remove trailing slash
        .trim();
};

/**
 * Levenshtein edit distance — used for typo suggestion.
 */
const levenshtein = (a, b) => {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => {
        const row = new Array(n + 1).fill(0);
        row[0] = i;
        return row;
    });
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
};

/**
 * Suggest the closest known command for a typo (max edit distance 2).
 */
const getSuggestion = (unknownCommand) => {
    let best = null, bestDist = Infinity;
    const lower = unknownCommand.toLowerCase();
    for (const cmd of SUPPORTED_COMMANDS) {
        const d = levenshtein(lower, cmd);
        if (d < bestDist && d <= 2) {
            bestDist = d;
            best = cmd;
        }
    }
    return best ? `Did you mean '${best}'?` : null;
};

/**
 * Build the terminal output string for a parsed command result.
 * This is what gets displayed in the xterm.js terminal.
 */
const buildErrorOutput = (parsed) => {
    if (parsed.error === 'EMPTY_INPUT') return '';

    if (parsed.error === 'UNKNOWN_COMMAND') {
        const suggestion = parsed.suggestion ? `\r\n${parsed.suggestion}` : '';
        return `bash: ${parsed.command}: command not found${suggestion}`;
    }

    return `bash: invalid command`;
};

module.exports = {
    parseCommand,
    normalizeForEvaluation,
    normalizePath,
    buildErrorOutput,
    SUPPORTED_COMMANDS,
};