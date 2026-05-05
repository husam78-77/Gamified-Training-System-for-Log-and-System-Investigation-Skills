/**
 * useTerminal.js
 * The core terminal hook. Manages the xterm.js instance and
 * all terminal interaction logic.
 *
 * Responsibilities:
 * - Initialize and mount xterm.js into a DOM ref
 * - Handle user input character by character
 * - Submit commands on Enter, call terminalService
 * - Write output back to the terminal
 * - Track current virtual filesystem path
 * - Maintain local virtualFiles state (including newly revealed files)
 * - Expose command history (for hint context) via ref
 * - Handle 'clear' command signal from backend
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { executeCommand, fetchCommandHistory } from '../services/terminalService';

// Dynamic prompt — shows current path like a real shell
const getPrompt = (path) => {
    const display = path === '/' ? '~' : path;
    return `\r\nroot@hyperion:${display}$ `;
};

// Inline prompt (no leading newline) — used when replacing the current line
const getPromptInline = (path) => {
    const display = path === '/' ? '~' : path;
    return `root@hyperion:${display}$ `;
};

// Must stay in sync with backend SUPPORTED_COMMANDS in terminalParser.js
const SUPPORTED_COMMANDS = [
    'ls', 'cat', 'grep', 'cd', 'pwd', 'find', 'whoami',
    'clear', 'help', 'ps', 'locate', 'strings', 'history',
];

/**
 * @param {object} params
 * @param {number}        params.sessionId      - Active session ID
 * @param {string}        params.token          - JWT from useAuth()
 * @param {Array}         params.initialFiles   - virtualFiles from scenario load
 * @param {Function}      params.onStepMatched  - Callback(matchedStep) when a step is matched
 * @param {Function}      params.onFilesRevealed - Callback(newFiles) when hidden files are revealed
 * @param {Function}      params.onObjectivesUpdated - Callback(completedIds) on objective completion
 * @param {Function}      params.onAutoHint     - Callback(autoHint) when backend pushes an auto-triggered hint
 */
export const useTerminal = ({
    sessionId,
    token,
    initialFiles = [],
    onStepMatched,
    onFilesRevealed,
    onObjectivesUpdated,
    onAutoHint,          // Phase 5 — receives { hint, hintLevel } from execute response
}) => {
    const terminalRef = useRef(null);  // DOM element ref (attach xterm here)
    const xtermRef = useRef(null);  // xterm Terminal instance
    const fitAddonRef = useRef(null);  // FitAddon instance
    const inputBuffer = useRef('');    // Current line being typed
    const isProcessing = useRef(false); // Prevent double-submit while awaiting API

    const [currentPath, setCurrentPath] = useState('/');
    const [virtualFiles, setVirtualFiles] = useState(initialFiles);
    const [isReady, setIsReady] = useState(false);

    // ── Local command history (up/down navigation) ────────────────────────
    const localHistory    = useRef([]);   // commands typed this session
    const historyIndexRef = useRef(-1);   // -1 = not navigating; 0 = most recent
    const savedInputRef   = useRef('');   // input saved before entering history mode

    // Stable function refs so handleKeyInput (useCallback []) can call latest impl
    const navigateHistoryFn = useRef(() => {});
    const tabCompleteFn     = useRef(() => {});

    // ── Discovery system ──────────────────────────────────────────────────
    const [discoveredPaths, setDiscoveredPaths] = useState(() => new Set(['/']));

    const normalizeFSPath = (p) => {
        if (!p) return '/';
        return p.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    };

    const getParent = (p) => {
        const parts = normalizeFSPath(p).split('/').filter(Boolean);
        if (parts.length === 0) return '/';
        parts.pop();
        return '/' + parts.join('/') || '/';
    };

    const discoverPaths = (paths) => {
        setDiscoveredPaths(prev => {
            const next = new Set(prev);
            paths.forEach(p => next.add(normalizeFSPath(p)));
            return next;
        });
    };

    // ── Initialize xterm.js ───────────────────────────────────────────────
    useEffect(() => {
        if (!terminalRef.current || xtermRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            cursorStyle: 'block',
            fontSize: 14,
            fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
            theme: {
                background: '#050505',
                foreground: '#00EBF7',
                cursor: '#FF003C',
                selectionBackground: '#FF003C44',
                black: '#000000',
                red: '#FF003C',
                green: '#00FF88',
                yellow: '#FFD700',
                blue: '#00EBF7',
                white: '#E0E0E0',
                brightBlack: '#444444',
                brightRed: '#FF003C',
                brightCyan: '#00EBF7',
            },
            scrollback: 1000,
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        printBootSequence(term);
        term.write(getPrompt('/'));
        setIsReady(true);

        term.onKey(({ key, domEvent }) => {
            handleKeyInput(key, domEvent, term);
        });

        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            xtermRef.current = null;
        };
    }, [terminalRef.current]);

    // ── Sync initialFiles into state when they load ───────────────────────
    useEffect(() => {
        if (initialFiles.length > 0) {
            setVirtualFiles(initialFiles);
        }
    }, [initialFiles]);

    // ── Restore command history on mount ─────────────────────────────────
    useEffect(() => {
        if (!sessionId || !token || !isReady) return;

        const restore = async () => {
            try {
                const data = await fetchCommandHistory(sessionId, token);
                if (data.history.length > 0 && xtermRef.current) {
                    xtermRef.current.writeln('\r\x1b[2m-- Restoring previous session --\x1b[0m');
                    data.history.forEach(entry => {
                        xtermRef.current.writeln(`\r\x1b[90m> ${entry.command_entered}\x1b[0m`);
                    });
                    xtermRef.current.write(PROMPT);
                }
            } catch (_) { }
        };

        restore();
    }, [sessionId, token, isReady]);

    // ── History navigation & TAB completion (assigned each render; only use refs) ──

    navigateHistoryFn.current = (direction, term) => {
        const hist = localHistory.current;
        if (hist.length === 0) return;

        if (direction === -1) {  // Up — older command
            if (historyIndexRef.current === -1) {
                savedInputRef.current = inputBuffer.current;
            }
            const next = historyIndexRef.current === -1 ? 0 : historyIndexRef.current + 1;
            if (next >= hist.length) return;
            historyIndexRef.current = next;
        } else {                 // Down — newer command
            if (historyIndexRef.current === -1) return;
            historyIndexRef.current -= 1;
        }

        const cmd = historyIndexRef.current === -1
            ? savedInputRef.current
            : hist[hist.length - 1 - historyIndexRef.current];

        term.write('\r\x1b[2K');
        term.write(getPromptInline(currentPathRef.current));
        term.write(cmd);
        inputBuffer.current = cmd;
    };

    tabCompleteFn.current = (term) => {
        const input   = inputBuffer.current;
        const hasSpace = input.includes(' ');

        // ── Complete command name ─────────────────────────────────────────
        if (!hasSpace) {
            const partial = input.toLowerCase();
            if (!partial) return;
            const matches = SUPPORTED_COMMANDS.filter(c => c.startsWith(partial));
            if (matches.length === 0) return;
            if (matches.length === 1) {
                const addition = matches[0].slice(partial.length) + ' ';
                term.write(addition);
                inputBuffer.current = matches[0] + ' ';
            } else {
                term.write('\r\n\r' + matches.join('  ') + '\r\n');
                term.write(getPromptInline(currentPathRef.current) + input);
            }
            return;
        }

        // ── Complete file / directory argument ────────────────────────────
        const lastSpaceIdx = input.lastIndexOf(' ');
        const partial      = input.slice(lastSpaceIdx + 1);
        const prefix       = input.slice(0, lastSpaceIdx + 1);
        const norm         = (p) => p.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

        let baseDir, baseName;
        if (partial.includes('/')) {
            const slashIdx = partial.lastIndexOf('/');
            const dirPart  = partial.slice(0, slashIdx) || '/';
            baseName = partial.slice(slashIdx + 1);
            baseDir  = dirPart.startsWith('/')
                ? norm(dirPart)
                : norm((currentPathRef.current === '/' ? '' : currentPathRef.current) + '/' + dirPart);
        } else {
            baseDir  = currentPathRef.current || '/';
            baseName = partial;
        }

        const files = virtualFilesRef.current;
        const candidates = new Set();

        files.forEach(f => {
            const fp       = norm(f.file_path || '');
            const lastSlash = fp.lastIndexOf('/');
            const dir      = lastSlash === 0 ? '/' : fp.slice(0, lastSlash);
            const name     = fp.slice(lastSlash + 1);

            if (dir === baseDir && name.startsWith(baseName)) {
                candidates.add(name);
            }

            // Sub-directory suggestions
            if (fp.startsWith(baseDir === '/' ? '/' : baseDir + '/')) {
                const remainder = fp.slice(baseDir === '/' ? 1 : baseDir.length + 1);
                const firstSeg  = remainder.split('/')[0];
                if (firstSeg && firstSeg.startsWith(baseName) && remainder.includes('/')) {
                    candidates.add(firstSeg + '/');
                }
            }
        });

        const matches = Array.from(candidates).sort();
        if (matches.length === 0) return;

        if (matches.length === 1) {
            const addition = matches[0].slice(baseName.length);
            term.write(addition);
            inputBuffer.current = prefix + partial + addition;
        } else {
            term.write('\r\n\r' + matches.join('  ') + '\r\n');
            term.write(getPromptInline(currentPathRef.current) + input);
        }
    };

    // ── Key input handler ─────────────────────────────────────────────────
    const handleKeyInput = useCallback((key, domEvent, term) => {
        const code = domEvent.keyCode;

        // Enter
        if (code === 13) {
            const cmd = inputBuffer.current.trim();
            inputBuffer.current = '';
            historyIndexRef.current = -1;
            if (cmd.length === 0) {
                term.write(getPrompt(currentPathRef.current));
                return;
            }
            term.writeln('');
            submitCommand(cmd, term);
            return;
        }

        // Backspace
        if (code === 8) {
            if (inputBuffer.current.length > 0) {
                inputBuffer.current = inputBuffer.current.slice(0, -1);
                term.write('\b \b');
            }
            return;
        }

        // Ctrl+C
        if (domEvent.ctrlKey && domEvent.key === 'c') {
            inputBuffer.current = '';
            historyIndexRef.current = -1;
            term.write('^C');
            term.write(getPrompt(currentPathRef.current));
            return;
        }

        // TAB — auto-complete command or file name
        if (code === 9) {
            tabCompleteFn.current(term);
            return;
        }

        // Up arrow — navigate to older command
        if (code === 38) {
            navigateHistoryFn.current(-1, term);
            return;
        }

        // Down arrow — navigate to newer command
        if (code === 40) {
            navigateHistoryFn.current(1, term);
            return;
        }

        if (domEvent.ctrlKey || domEvent.altKey || domEvent.metaKey) return;
        if (key.length !== 1) return;

        // Regular character — exit history navigation mode
        historyIndexRef.current = -1;
        inputBuffer.current += key;
        term.write(key);
    }, []);

    // ── Stable refs ───────────────────────────────────────────────────────
    const sessionIdRef = useRef(null);
    const tokenRef = useRef(null);
    const currentPathRef = useRef('/');
    const onAutoHintRef = useRef(null);  // Phase 5 — stable ref so submitCommand can call it

    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { tokenRef.current = token; }, [token]);
    useEffect(() => { currentPathRef.current = currentPath; }, [currentPath]);
    useEffect(() => { onAutoHintRef.current = onAutoHint; }, [onAutoHint]); // Phase 5

    // ── Submit command to backend ─────────────────────────────────────────
    const submitCommand = useCallback(async (cmd, term) => {
        const sid = sessionIdRef.current;
        const tok = tokenRef.current;
        const path = currentPathRef.current;

        if (!sid || !tok || isProcessing.current) return;

        // Track in local history for up/down navigation
        localHistory.current.push(cmd);

        isProcessing.current = true;
        term.write('\x1b[90mprocessing...\x1b[0m');

        try {
            const result = await executeCommand(sid, cmd, path, tok);

            term.write('\r\x1b[2K');

            if (result.output === '__CLEAR__') {
                term.clear();
                term.write(getPrompt(currentPathRef.current));
                isProcessing.current = false;
                return;
            }

            if (result.output) {
                const lines = result.output.split('\r\n');
                lines.forEach(line => term.writeln('\r' + line));
            }

            triggerDiscovery(cmd, path, result.output);

            if (cmd.startsWith('cd ')) {
                const target = cmd.slice(3).trim();
                handleCdPath(target, result.output, path);
            }

            if (result.matched && result.matchedStep) {
                writeStepMatchFeedback(term, result.matchedStep);
                onStepMatched?.(result.matchedStep);
            }

            if (result.newlyRevealedFiles?.length > 0) {
                setVirtualFiles(prev => [...prev, ...result.newlyRevealedFiles]);
                writeRevealFeedback(term, result.newlyRevealedFiles);
                onFilesRevealed?.(result.newlyRevealedFiles);
                const revealedPaths = result.newlyRevealedFiles.flatMap(f => [
                    normalizeFSPath(f.file_path),
                    getParent(normalizeFSPath(f.file_path)),
                ]);
                discoverPaths(revealedPaths);
            }

            if (result.completedObjectiveIds?.length > 0) {
                onObjectivesUpdated?.(result.completedObjectiveIds);
            }

            // ── Phase 5: Auto-triggered hint ─────────────────────────────
            // Backend includes auto_hint in the execute response when a trigger
            // condition fires. Pass it to the hint hook via the stable ref.
            // This never throws — if auto_hint is null, nothing happens.
            if (result.auto_hint && onAutoHintRef.current) {
                onAutoHintRef.current(result.auto_hint);
                writeAutoHintFeedback(term);
            }

        } catch (err) {
            term.write('\r\x1b[2K');
            term.writeln(`\r\x1b[31mERROR: ${err.message}\x1b[0m`);
        } finally {
            isProcessing.current = false;
            term.write(getPrompt(currentPathRef.current));
        }
    }, []);

    // ── Path tracking for cd ──────────────────────────────────────────────
    const handleCdPath = useCallback((target, output, currentPathValue) => {
        if (output?.includes('No such file')) return;

        const prev = currentPathValue || '/';
        let newPath;
        if (target === '..') {
            const parts = prev.split('/').filter(Boolean);
            parts.pop();
            newPath = '/' + parts.join('/') || '/';
        } else if (target.startsWith('/')) {
            newPath = target;
        } else {
            newPath = (prev === '/' ? '' : prev) + '/' + target;
        }
        setCurrentPath(newPath);
        currentPathRef.current = newPath;
    }, []);

    // ── File system discovery ─────────────────────────────────────────────
    const triggerDiscovery = (cmd, currentPathValue, output) => {
        const tokens = cmd.trim().split(/\s+/);
        const command = tokens[0]?.toLowerCase();
        const arg = tokens.slice(1).find(t => !t.startsWith('-'));

        const resolve = (target) => {
            if (!target) return currentPathValue || '/';
            if (target.startsWith('/')) return normalizeFSPath(target);
            const base = currentPathValue === '/' ? '' : currentPathValue;
            return normalizeFSPath(`${base}/${target}`);
        };

        const toDiscover = [];

        if (command === 'cd') {
            if (arg) {
                const resolved = resolve(arg);
                toDiscover.push(resolved);
                toDiscover.push(getParent(resolved));
            }
        } else if (command === 'ls') {
            const listedPath = resolve(arg || null);
            toDiscover.push(listedPath);
            const currentFiles = virtualFilesRef.current;
            currentFiles.forEach(f => {
                const filePath = normalizeFSPath(f.file_path);
                const fileParent = getParent(filePath);
                if (fileParent === listedPath) toDiscover.push(filePath);
            });
        } else if (command === 'cat' || command === 'grep') {
            const filePath = resolve(arg || null);
            toDiscover.push(filePath);
            toDiscover.push(getParent(filePath));
        } else if (command === 'find') {
            const searchPath = resolve(arg || null);
            const currentFiles = virtualFilesRef.current;
            toDiscover.push(searchPath);
            currentFiles.forEach(f => {
                const filePath = normalizeFSPath(f.file_path);
                if (filePath.startsWith(searchPath)) {
                    toDiscover.push(filePath);
                    toDiscover.push(getParent(filePath));
                }
            });
        }

        if (toDiscover.length > 0) discoverPaths(toDiscover);
    };

    const virtualFilesRef = useRef(virtualFiles);
    useEffect(() => { virtualFilesRef.current = virtualFiles; }, [virtualFiles]);

    // ── Terminal write helpers ────────────────────────────────────────────
    const writeStepMatchFeedback = (term, step) => {
        term.writeln(`\r\x1b[32m✓ ${step.description}\x1b[0m`);
    };

    const writeRevealFeedback = (term, files) => {
        files.forEach(f => {
            term.writeln(`\r\x1b[33m[SYSTEM] New file accessible: ${f.file_path}\x1b[0m`);
        });
    };

    // Phase 5: Visual indicator in terminal when ARIA auto-intervenes
    const writeAutoHintFeedback = (term) => {
        term.writeln('\r\x1b[35m[ARIA] Intelligence update available — check the ARIA panel.\x1b[0m');
    };

    const writeToTerminal = useCallback((text) => {
        if (xtermRef.current) {
            xtermRef.current.writeln('\r' + text);
        }
    }, []);

    return {
        terminalRef,
        currentPath,
        virtualFiles,
        discoveredPaths,
        isReady,
        writeToTerminal,
    };
};

// ── Boot sequence ─────────────────────────────────────────────────────────────

const printBootSequence = (term) => {
    const lines = [
        '\x1b[31m██╗  ██╗██╗   ██╗██████╗ ███████╗██████╗ ██╗ ██████╗ ███╗   ██╗\x1b[0m',
        '\x1b[31m██║  ██║╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██║██╔═══██╗████╗  ██║\x1b[0m',
        '\x1b[36m███████║ ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║██║   ██║██╔██╗ ██║\x1b[0m',
        '\x1b[36m██╔══██║  ╚██╔╝  ██╔═══╝ ██╔══╝  ██╔══██╗██║██║   ██║██║╚██╗██║\x1b[0m',
        '\x1b[37m██║  ██║   ██║   ██║     ███████╗██║  ██║██║╚██████╔╝██║ ╚████║\x1b[0m',
        '\x1b[37m╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝\x1b[0m',
        '',
        '\x1b[90mHyperion-OS v4.2.0 // Secure Investigation Terminal\x1b[0m',
        '\x1b[90mType \x1b[0mhelp\x1b[90m to list available commands.\x1b[0m',
        '',
    ];
    lines.forEach(line => term.writeln(line));
};