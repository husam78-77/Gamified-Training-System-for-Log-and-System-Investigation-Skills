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

const PROMPT = '\r\nroot@hyperion:~$ ';

/**
 * @param {object} params
 * @param {number}        params.sessionId      - Active session ID
 * @param {string}        params.token          - JWT from useAuth()
 * @param {Array}         params.initialFiles   - virtualFiles from scenario load
 * @param {Function}      params.onStepMatched  - Callback(matchedStep) when a step is matched
 * @param {Function}      params.onFilesRevealed - Callback(newFiles) when hidden files are revealed
 * @param {Function}      params.onObjectivesUpdated - Callback(completedIds) on objective completion
 */
export const useTerminal = ({
    sessionId,
    token,
    initialFiles = [],
    onStepMatched,
    onFilesRevealed,
    onObjectivesUpdated,
}) => {
    const terminalRef = useRef(null);  // DOM element ref (attach xterm here)
    const xtermRef = useRef(null);  // xterm Terminal instance
    const fitAddonRef = useRef(null);  // FitAddon instance
    const inputBuffer = useRef('');    // Current line being typed
    const isProcessing = useRef(false); // Prevent double-submit while awaiting API

    const [currentPath, setCurrentPath] = useState('/');
    const [virtualFiles, setVirtualFiles] = useState(initialFiles);
    const [isReady, setIsReady] = useState(false);

    // ── Discovery system ──────────────────────────────────────────────────
    // A Set of paths the player has seen. Starts with only root '/'.
    // Never shrinks — once discovered, always visible for this session.
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
                foreground: '#00EBF7',   // --secondary (cyan)
                cursor: '#FF003C',   // --primary (red)
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

        // Print boot sequence
        printBootSequence(term);
        term.write(PROMPT);
        setIsReady(true);

        // Handle key input
        term.onKey(({ key, domEvent }) => {
            handleKeyInput(key, domEvent, term);
        });

        // Fit on window resize
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

    // ── Restore command history on mount (page refresh recovery) ─────────
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
            } catch (_) {
                // Silently ignore restore errors — fresh terminal is fine
            }
        };

        restore();
    }, [sessionId, token, isReady]);

    // ── Key input handler ─────────────────────────────────────────────────
    const handleKeyInput = useCallback((key, domEvent, term) => {
        const code = domEvent.keyCode;

        // Enter — submit command
        if (code === 13) {
            const cmd = inputBuffer.current.trim();
            inputBuffer.current = '';

            if (cmd.length === 0) {
                term.write(PROMPT);
                return;
            }

            term.writeln(''); // Newline after command
            submitCommand(cmd, term);
            return;
        }

        // Backspace
        if (code === 8) {
            if (inputBuffer.current.length > 0) {
                inputBuffer.current = inputBuffer.current.slice(0, -1);
                term.write('\b \b'); // Erase character visually
            }
            return;
        }

        // Ctrl+C — cancel current input
        if (domEvent.ctrlKey && domEvent.key === 'c') {
            inputBuffer.current = '';
            term.write('^C');
            term.write(PROMPT);
            return;
        }

        // Ignore non-printable keys
        if (domEvent.ctrlKey || domEvent.altKey || domEvent.metaKey) return;
        if (key.length !== 1) return;

        // Printable character — append to buffer and echo
        inputBuffer.current += key;
        term.write(key);
    }, []);

    // ── Stable refs for values used inside submitCommand ────────────────
    const sessionIdRef = useRef(null);
    const tokenRef = useRef(null);
    const currentPathRef = useRef('/');

    // Keep refs in sync with state/props
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { tokenRef.current = token; }, [token]);
    useEffect(() => { currentPathRef.current = currentPath; }, [currentPath]);

    // ── Submit command to backend ─────────────────────────────────────────
    const submitCommand = useCallback(async (cmd, term) => {
        const sid = sessionIdRef.current;
        const tok = tokenRef.current;
        const path = currentPathRef.current;

        if (!sid || !tok || isProcessing.current) return;

        isProcessing.current = true;

        // Show processing indicator
        term.write('\x1b[90mprocessing...\x1b[0m');

        try {
            const result = await executeCommand(sid, cmd, path, tok);

            // Clear processing indicator
            term.write('\r\x1b[2K');

            // Handle clear command
            if (result.output === '__CLEAR__') {
                term.clear();
                term.write(PROMPT);
                isProcessing.current = false;
                return;
            }

            // Write output
            if (result.output) {
                const lines = result.output.split('\r\n');
                lines.forEach(line => term.writeln('\r' + line));
            }

            // ── Discovery triggers ────────────────────────────────────────
            triggerDiscovery(cmd, path, result.output);

            // Handle cd — update current path
            if (cmd.startsWith('cd ')) {
                const target = cmd.slice(3).trim();
                handleCdPath(target, result.output, path);
            }

            // Step matched — notify parent
            if (result.matched && result.matchedStep) {
                writeStepMatchFeedback(term, result.matchedStep);
                onStepMatched?.(result.matchedStep);
            }

            // Newly revealed files — add to virtual FS state + auto-discover them
            if (result.newlyRevealedFiles?.length > 0) {
                setVirtualFiles(prev => [...prev, ...result.newlyRevealedFiles]);
                writeRevealFeedback(term, result.newlyRevealedFiles);
                onFilesRevealed?.(result.newlyRevealedFiles);
                // Auto-discover revealed files so they appear in the panel immediately
                const revealedPaths = result.newlyRevealedFiles.flatMap(f => [
                    normalizeFSPath(f.file_path),
                    getParent(normalizeFSPath(f.file_path)),
                ]);
                discoverPaths(revealedPaths);
            }

            // Objectives updated
            if (result.completedObjectiveIds?.length > 0) {
                onObjectivesUpdated?.(result.completedObjectiveIds);
            }

        } catch (err) {
            term.write('\r\x1b[2K');
            term.writeln(`\r\x1b[31mERROR: ${err.message}\x1b[0m`);
        } finally {
            isProcessing.current = false;
            term.write(PROMPT);
        }
    }, []); // Uses refs internally — stable, never recreated

    // ── Path tracking for cd ──────────────────────────────────────────────
    const handleCdPath = useCallback((target, output, currentPathValue) => {
        // If backend returned an error (e.g. "No such file"), don't update path
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

    // ── File system discovery ────────────────────────────────────────────
    /**
     * Called after every successful command.
     * Determines which paths to mark as discovered based on what the
     * player just did.
     *
     * Rules:
     *   cd <target>     → discover the directory navigated into
     *   ls              → discover all direct children of current dir
     *   ls <path>       → discover the path + all its direct children
     *   cat <file>      → discover the file + its parent directory
     *   grep ... <file> → discover the file + its parent directory
     *   find <path>     → discover the path + all descendant paths
     */
    const triggerDiscovery = (cmd, currentPathValue, output) => {
        const tokens = cmd.trim().split(/\s+/);
        const command = tokens[0]?.toLowerCase();
        const arg = tokens.slice(1).find(t => !t.startsWith('-')); // first non-flag arg

        // Resolve arg to absolute path
        const resolve = (target) => {
            if (!target) return currentPathValue || '/';
            if (target.startsWith('/')) return normalizeFSPath(target);
            const base = currentPathValue === '/' ? '' : currentPathValue;
            return normalizeFSPath(`${base}/${target}`);
        };

        const toDiscover = [];

        if (command === 'cd') {
            // Discover the directory navigated into (don't reveal its children yet)
            if (arg) {
                const resolved = resolve(arg);
                toDiscover.push(resolved);
                // Also ensure parent is visible
                toDiscover.push(getParent(resolved));
            }
        }

        else if (command === 'ls') {
            // Discover the listed directory + all its direct children from virtualFiles
            const listedPath = resolve(arg || null);
            toDiscover.push(listedPath);

            // Find all files/dirs whose immediate parent is listedPath
            const currentFiles = virtualFilesRef.current;
            currentFiles.forEach(f => {
                const filePath = normalizeFSPath(f.file_path);
                const fileParent = getParent(filePath);
                if (fileParent === listedPath) {
                    toDiscover.push(filePath);
                }
            });
        }

        else if (command === 'cat' || command === 'grep') {
            // Discover the file itself + its parent
            const filePath = resolve(arg || null);
            toDiscover.push(filePath);
            toDiscover.push(getParent(filePath));
        }

        else if (command === 'find') {
            // Discover everything under the path
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

        if (toDiscover.length > 0) {
            discoverPaths(toDiscover);
        }
    };

    // Stable ref to virtualFiles so triggerDiscovery can read current value
    const virtualFilesRef = useRef(virtualFiles);
    useEffect(() => { virtualFilesRef.current = virtualFiles; }, [virtualFiles]);

    // ── Write a subtle step-match notification to terminal ────────────────
    const writeStepMatchFeedback = (term, step) => {
        term.writeln(`\r\x1b[32m✓ ${step.description}\x1b[0m`);
    };

    // ── Write file reveal notification ────────────────────────────────────
    const writeRevealFeedback = (term, files) => {
        files.forEach(f => {
            term.writeln(`\r\x1b[33m[SYSTEM] New file accessible: ${f.file_path}\x1b[0m`);
        });
    };

    // ── Expose write() so parent can inject system messages ──────────────
    const writeToTerminal = useCallback((text) => {
        if (xtermRef.current) {
            xtermRef.current.writeln('\r' + text);
        }
    }, []);

    return {
        terminalRef,      // Attach to: <div ref={terminalRef} />
        currentPath,
        virtualFiles,
        discoveredPaths,  // Set of paths the player has seen
        isReady,
        writeToTerminal,
    };
};

// ── Boot sequence text ────────────────────────────────────────────────────

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