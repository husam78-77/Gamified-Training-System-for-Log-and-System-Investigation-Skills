/**
 * useTerminal.js
 * The core terminal hook. Manages the xterm.js instance and
 * all terminal interaction logic.
 *
 * Responsibilities:
 * - Initialize and mount xterm.js into a DOM ref
 * - Handle user input character by character (with full inline cursor navigation)
 * - Submit commands on Enter, call terminalService
 * - Write output back to the terminal
 * - Track current virtual filesystem path
 * - Maintain local virtualFiles state (including newly revealed files)
 * - Expose command history (for hint context) via ref
 * - Handle 'clear' command signal from backend
 * - Intercept frontend-only commands (note, cat/grep/strings/locate on notes file)
 * - Emit discovery events to parent via onDiscovery callback
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { executeCommand, fetchCommandHistory, fetchResumeState } from '../services/terminalService';

// ── Module-level path utilities (pure, no React deps) ────────────────────────

const normalizeFSPath = (p) => {
    if (!p) return '/';
    return p.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
};

// Resolve . and .. segments in an absolute path string
const resolveAbsFSPath = (absPath) => {
    const parts = absPath.split('/').filter(p => p !== '');
    const out = [];
    for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') { out.pop(); }
        else out.push(part);
    }
    return '/' + out.join('/') || '/';
};

// Resolve any path (relative, absolute, .., ., ~/) against the current directory
const resolveFSPath = (target, currentPath) => {
    if (!target) return normalizeFSPath(currentPath);
    const expanded = target === '~' ? '/'
        : target.startsWith('~/') ? '/' + target.slice(2)
            : target;
    if (expanded.startsWith('/')) {
        return resolveAbsFSPath(normalizeFSPath(expanded));
    }
    const base = currentPath === '/' ? '' : currentPath;
    return resolveAbsFSPath(normalizeFSPath(base + '/' + expanded));
};

const getFSParent = (p) => {
    const n = normalizeFSPath(p);
    if (n === '/') return '/';
    const idx = n.lastIndexOf('/');
    return idx === 0 ? '/' : n.slice(0, idx);
};

// ── Prompt helpers ────────────────────────────────────────────────────────────

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
    'clear', 'help', 'ps', 'locate', 'strings', 'history', 'note',
];

// Investigator notes virtual file path — frontend-only, never in DB
const NOTES_FILE_PATH = '/tmp/investigator_notes.txt';

/**
 * @param {object} params
 * @param {number}   params.sessionId           - Active session ID
 * @param {string}   params.token               - JWT from useAuth()
 * @param {Array}    params.initialFiles        - virtualFiles from scenario load
 * @param {Function} params.onStepMatched       - Callback(matchedStep) when a step is matched
 * @param {Function} params.onFilesRevealed     - Callback(newFiles) when hidden files are revealed
 * @param {Function} params.onObjectivesUpdated - Callback(completedIds) on objective completion
 * @param {Function} params.onAutoHint          - Callback(autoHint) when backend pushes an auto-triggered hint
 * @param {Function} params.onDiscovery         - Callback(discoveries[]) when new discoveries are unlocked
 */
export const useTerminal = ({
    sessionId,
    token,
    initialFiles = [],
    onStepMatched,
    onFilesRevealed,
    onObjectivesUpdated,
    onAutoHint,
    onDiscovery,
}) => {
    const terminalRef = useRef(null);   // DOM element ref (attach xterm here)
    const xtermRef = useRef(null);   // xterm Terminal instance
    const fitAddonRef = useRef(null);   // FitAddon instance
    const inputBuffer = useRef('');     // Current line being typed
    const isProcessing = useRef(false);  // Prevent double-submit while awaiting API

    // cursorPosRef: distance from the END of inputBuffer.current (0 = cursor at end)
    const cursorPosRef = useRef(0);

    const [currentPath, setCurrentPath] = useState('/');
    const [virtualFiles, setVirtualFiles] = useState(initialFiles);
    const [isReady, setIsReady] = useState(false);
    const [isProcessingState, setIsProcessingState] = useState(false);

    // ── Local command history (up/down navigation) ────────────────────────
    const localHistory = useRef([]);
    const historyIndexRef = useRef(-1);
    const savedInputRef = useRef('');

    // Stable function refs so handleKeyInput (useCallback []) can call latest impl
    const navigateHistoryFn = useRef(() => { });
    const tabCompleteFn = useRef(() => { });
    const redrawCurrentLineRef = useRef(() => { });
    const handleLocalCommandRef = useRef(() => false);
    const injectNotesFileRef = useRef(() => { });

    // ── Discovery system ──────────────────────────────────────────────────
    const [discoveredPaths, setDiscoveredPaths] = useState(() => new Set(['/']));

    // Investigator notes — frontend-only in-memory, not persisted to DB
    const investigatorNotesRef = useRef('');

    const discoverPaths = (paths) => {
        setDiscoveredPaths(prev => {
            const next = new Set(prev);
            paths.forEach(p => {
                let current = normalizeFSPath(p);
                while (current && current !== '/') {
                    next.add(current);
                    const lastSlash = current.lastIndexOf('/');
                    current = lastSlash <= 0 ? '/' : current.slice(0, lastSlash);
                }
                next.add('/');
            });
            return next;
        });
    };

    // ── Stable refs ───────────────────────────────────────────────────────
    const sessionIdRef = useRef(null);
    const tokenRef = useRef(null);
    const currentPathRef = useRef('/');
    const onAutoHintRef = useRef(null);
    const onDiscoveryRef = useRef(null);

    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { tokenRef.current = token; }, [token]);
    useEffect(() => { currentPathRef.current = currentPath; }, [currentPath]);
    useEffect(() => { onAutoHintRef.current = onAutoHint; }, [onAutoHint]);
    useEffect(() => { onDiscoveryRef.current = onDiscovery; }, [onDiscovery]);

    // ── Per-render function assignments (updated every render, called via ref) ──

    // Redraws the full input line — used after any mid-line edit
    redrawCurrentLineRef.current = (term) => {
        const buf = inputBuffer.current;
        const pos = cursorPosRef.current;
        term.write('\r\x1b[2K');
        term.write(getPromptInline(currentPathRef.current));
        term.write(buf);
        // Reposition cursor if not at end
        if (pos > 0) {
            term.write(`\x1b[${pos}D`);
        }
    };

    // Injects/updates the synthetic notes file in virtualFiles state
    injectNotesFileRef.current = () => {
        const notesEntry = {
            virtual_file_id: '__investigator_notes__',
            file_path: NOTES_FILE_PATH,
            is_hidden: false,
            content: investigatorNotesRef.current,
            reveal_at_step: null,
            reveal_at_discovery_key: null,
            evidence_tags: null,
            metadata: null,
        };
        setVirtualFiles(prev => {
            const filtered = prev.filter(f => f.virtual_file_id !== '__investigator_notes__');
            return [...filtered, notesEntry];
        });
    };

    // Handles frontend-only commands. Returns true if the command was fully handled.
    handleLocalCommandRef.current = (cmd, term) => {
        const parts = cmd.trim().match(/^(\w+)\s*([\s\S]*)$/);
        if (!parts) return false;
        const command = parts[1].toLowerCase();
        const args = (parts[2] || '').trim();

        // note "..." — append timestamped entry
        if (command === 'note') {
            const text = args.replace(/^["']|["']$/g, '').trim();
            if (!text) {
                term.writeln('\r\x1b[33mnote: provide a message — e.g.  note "cron job found"\x1b[0m');
                return true;
            }
            const ts = new Date().toTimeString().slice(0, 8);
            const entry = `[${ts}] ${text}`;
            investigatorNotesRef.current = investigatorNotesRef.current
                ? investigatorNotesRef.current + '\n' + entry
                : entry;
            injectNotesFileRef.current();
            term.writeln(`\r\x1b[32m[NOTE] Recorded: ${entry}\x1b[0m`);
            return true;
        }

        // cat /tmp/investigator_notes.txt
        if (command === 'cat' && args === NOTES_FILE_PATH) {
            const notes = investigatorNotesRef.current;
            if (!notes) {
                term.writeln('\r\x1b[90m(no notes yet — use:  note "your observation")\x1b[0m');
            } else {
                term.writeln('\r\x1b[33m=== Investigator Notes ===\x1b[0m');
                notes.split('\n').forEach(line => term.writeln('\r' + line));
            }
            return true;
        }

        // strings /tmp/investigator_notes.txt
        if (command === 'strings' && args === NOTES_FILE_PATH) {
            const notes = investigatorNotesRef.current;
            if (!notes) {
                term.writeln('\r\x1b[90m(no notes recorded)\x1b[0m');
            } else {
                notes.split('\n').forEach(line => term.writeln('\r' + line));
            }
            return true;
        }

        // grep <pattern> /tmp/investigator_notes.txt
        if (command === 'grep' && args.includes(NOTES_FILE_PATH)) {
            const beforePath = args.slice(0, args.lastIndexOf(NOTES_FILE_PATH)).trim();
            const flagsPattern = beforePath.match(/^((?:-\w+\s+)*)(.+)$/);
            const rawPattern = flagsPattern ? flagsPattern[2] : beforePath;
            const pattern = rawPattern.replace(/^["']|["']$/g, '').trim();
            const ignoreCase = beforePath.includes('-i');
            const notes = investigatorNotesRef.current;
            if (!notes) {
                term.writeln('\r\x1b[90m(no notes to search)\x1b[0m');
                return true;
            }
            const matched = notes.split('\n').filter(line =>
                ignoreCase
                    ? line.toLowerCase().includes(pattern.toLowerCase())
                    : line.includes(pattern)
            );
            if (matched.length === 0) {
                term.writeln('\r\x1b[90m(no matching notes)\x1b[0m');
            } else {
                matched.forEach(line => term.writeln('\r\x1b[33m' + line + '\x1b[0m'));
            }
            return true;
        }

        // locate investigator_notes
        if (command === 'locate' && args.toLowerCase().includes('investigator_notes')) {
            if (investigatorNotesRef.current) {
                term.writeln('\r' + NOTES_FILE_PATH);
            } else {
                term.writeln('\r\x1b[90m(not found — no notes recorded yet)\x1b[0m');
            }
            return true;
        }

        return false;
    };

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

        cursorPosRef.current = 0;
        term.write('\r\x1b[2K');
        term.write(getPromptInline(currentPathRef.current));
        term.write(cmd);
        inputBuffer.current = cmd;
    };

    tabCompleteFn.current = (term) => {
        const input = inputBuffer.current;
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
                cursorPosRef.current = 0;
            } else {
                term.write('\r\n\r' + matches.join('  ') + '\r\n');
                term.write(getPromptInline(currentPathRef.current) + input);
            }
            return;
        }

        // ── Complete file / directory argument ────────────────────────────
        const lastSpaceIdx = input.lastIndexOf(' ');
        const partial = input.slice(lastSpaceIdx + 1);
        const cmdPrefix = input.slice(0, lastSpaceIdx + 1);

        // Command-aware filtering: cd → dirs only
        const cmdWord = cmdPrefix.trim().split(/\s+/)[0].toLowerCase();
        const dirsOnly = cmdWord === 'cd';

        let baseDir, baseName;
        if (partial.includes('/')) {
            const slashIdx = partial.lastIndexOf('/');
            const dirPart = partial.slice(0, slashIdx) || '/';
            baseName = partial.slice(slashIdx + 1);
            baseDir = resolveFSPath(dirPart, currentPathRef.current);
        } else {
            baseDir = currentPathRef.current || '/';
            baseName = partial;
        }

        const files = virtualFilesRef.current;
        const pfx = baseDir === '/' ? '/' : baseDir + '/';

        // Pass 1 — collect directory names
        // Two sources:
        //   a) explicit file_type==='directory' entries directly under baseDir
        //   b) inferred directories — any file nested deeper than one level under baseDir
        const dirNames = new Set();
        files.forEach(f => {
            const fp = normalizeFSPath(f.file_path || '');
            const parent = getFSParent(fp);
            const name = fp.slice(fp.lastIndexOf('/') + 1);

            // (a) explicit directory entry immediately under baseDir
            if (parent === baseDir && name.startsWith(baseName) && f.file_type === 'directory') {
                dirNames.add(name);
                return;
            }

            // (b) inferred directory — file path that is deeper than one level under baseDir
            if (fp.startsWith(pfx) && fp.length > pfx.length) {
                const remainder = baseDir === '/' ? fp.slice(1) : fp.slice(pfx.length);
                const firstSeg = remainder.split('/')[0];
                if (firstSeg && firstSeg.startsWith(baseName) && remainder.includes('/')) {
                    dirNames.add(firstSeg);
                }
            }
        });
        // Pass 2 — collect direct non-directory file children (skip when dirsOnly)
        const fileNames = new Set();
        if (!dirsOnly) {
            files.forEach(f => {
                const fp = normalizeFSPath(f.file_path || '');
                const parent = getFSParent(fp);
                const name = fp.slice(fp.lastIndexOf('/') + 1);
                if (parent === baseDir && name.startsWith(baseName)
                    && f.file_type !== 'directory'
                    && !dirNames.has(name)) {
                    fileNames.add(name);
                }
            });
        }

        // Build final sorted list: dirs (with /) then files
        const matches = [
            ...Array.from(dirNames).sort().map(d => d + '/'),
            ...Array.from(fileNames).sort(),
        ];
        if (matches.length === 0) return;

        if (matches.length === 1) {
            const addition = matches[0].slice(baseName.length);
            term.write(addition);
            inputBuffer.current = cmdPrefix + partial + addition;
            cursorPosRef.current = 0;
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
            cursorPosRef.current = 0;
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
            const buf = inputBuffer.current;
            const pos = cursorPosRef.current;
            if (buf.length === 0) return;
            if (pos === 0) {
                // Cursor at end — fast path
                inputBuffer.current = buf.slice(0, -1);
                term.write('\b \b');
            } else if (pos < buf.length) {
                // Mid-line — delete the character immediately left of cursor
                const deleteIdx = buf.length - pos - 1;
                inputBuffer.current = buf.slice(0, deleteIdx) + buf.slice(deleteIdx + 1);
                redrawCurrentLineRef.current(term);
            }
            // pos === buf.length means cursor is at start — nothing left to delete
            return;
        }

        // Ctrl+C
        if (domEvent.ctrlKey && domEvent.key === 'c') {
            inputBuffer.current = '';
            cursorPosRef.current = 0;
            historyIndexRef.current = -1;
            term.write('^C');
            term.write(getPrompt(currentPathRef.current));
            return;
        }

        // TAB — auto-complete (always moves cursor to end)
        if (code === 9) {
            cursorPosRef.current = 0;
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

        // Left arrow — move cursor left (deeper into buffer)
        if (code === 37) {
            if (cursorPosRef.current < inputBuffer.current.length) {
                cursorPosRef.current++;
                term.write('\x1b[D');
            }
            return;
        }

        // Right arrow — move cursor right (toward end)
        if (code === 39) {
            if (cursorPosRef.current > 0) {
                cursorPosRef.current--;
                term.write('\x1b[C');
            }
            return;
        }

        // Home key — jump to start of line
        if (code === 36) {
            const buf = inputBuffer.current;
            if (cursorPosRef.current < buf.length) {
                const moves = buf.length - cursorPosRef.current;
                cursorPosRef.current = buf.length;
                term.write(`\x1b[${moves}D`);
            }
            return;
        }

        // End key — jump to end of line
        if (code === 35) {
            if (cursorPosRef.current > 0) {
                term.write(`\x1b[${cursorPosRef.current}C`);
                cursorPosRef.current = 0;
            }
            return;
        }

        // Delete key — delete character at cursor (forward delete)
        if (code === 46) {
            const buf = inputBuffer.current;
            const pos = cursorPosRef.current;
            if (pos > 0) {
                const deleteIdx = buf.length - pos;
                inputBuffer.current = buf.slice(0, deleteIdx) + buf.slice(deleteIdx + 1);
                cursorPosRef.current--;
                redrawCurrentLineRef.current(term);
            }
            return;
        }

        if (domEvent.ctrlKey || domEvent.altKey || domEvent.metaKey) return;
        if (key.length !== 1) return;

        // Regular character — exit history navigation mode
        historyIndexRef.current = -1;
        const buf = inputBuffer.current;
        const pos = cursorPosRef.current;

        if (pos === 0) {
            // Cursor at end — fast path (no full redraw needed)
            inputBuffer.current = buf + key;
            term.write(key);
        } else {
            // Mid-line insert — splice and redraw
            const insertIdx = buf.length - pos;
            inputBuffer.current = buf.slice(0, insertIdx) + key + buf.slice(insertIdx);
            redrawCurrentLineRef.current(term);
        }
    }, []);

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

        const handleResize = () => {
            try {
                fitAddon.fit();
            } catch (e) {
                // Ignore errors if container isn't ready
            }
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
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

    // ── Restore full session state on mount/resume ────────────────────────
    // On a fresh page load, local state (virtualFiles, discoveredPaths,
    // currentPath, objectives) always starts from scratch even when the
    // backend session already has progress. This effect rehydrates all of
    // it from the backend in one pass, instead of waiting for the next
    // command to bring it back (the old "type anything and it reappears"
    // symptom — that happened because executeCommand recomputes the FULL
    // cumulative state every call, but nothing ever fetched that state
    // proactively on mount).
    const restoredRef = useRef(false);

    useEffect(() => {
        if (!sessionId || !token || !isReady || initialFiles.length === 0) return;
        if (restoredRef.current) return;
        restoredRef.current = true;

        const restore = async () => {
            try {
                const [historyData, resumeData] = await Promise.all([
                    fetchCommandHistory(sessionId, token),
                    fetchResumeState(sessionId, token),
                ]);

                const history = historyData.history || [];
                const revealedFiles = resumeData.revealedFiles || [];
                const completedObjectiveIds = resumeData.completedObjectiveIds || [];

                // ── Merge previously revealed hidden files into local state ──
                if (revealedFiles.length > 0) {
                    setVirtualFiles(prev => {
                        const existingIds = new Set(prev.map(f => f.virtual_file_id));
                        const toAdd = revealedFiles.filter(f => !existingIds.has(f.virtual_file_id));
                        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
                    });
                }

                // ── Restore objective completion state (and secret reveals) ──
                if (completedObjectiveIds.length > 0) {
                    onObjectivesUpdated?.(completedObjectiveIds);
                }

                // ── Replay history to reconstruct current path + discovered
                //    file tree, using the same resolution logic live commands
                //    use — just without re-hitting the backend for each one.
                const filesForReplay = [...initialFiles, ...revealedFiles];
                let replayPath = '/';
                const pathsToDiscover = [];

                history.forEach(entry => {
                    const cmd = (entry.command_entered || '').trim();
                    if (!cmd) return;
                    const tokens = cmd.split(/\s+/);
                    const command = tokens[0]?.toLowerCase();
                    const arg = tokens.slice(1).find(t => !t.startsWith('-'));
                    const resolve = (target) => resolveFSPath(target || null, replayPath || '/');

                    if (command === 'cd') {
                        if (!arg) return;
                        const normalized = normalizeFSPath(resolve(arg));
                        const prefix = normalized === '/' ? '/' : normalized + '/';
                        const entryAtPath = filesForReplay.find(
                            f => normalizeFSPath(f.file_path) === normalized
                        );
                        const hasChildren = filesForReplay.some(
                            f => normalizeFSPath(f.file_path).startsWith(prefix)
                        );
                        const isValidDir = normalized === '/'
                            || (entryAtPath ? entryAtPath.file_type === 'directory' : hasChildren);
                        if (isValidDir) {
                            replayPath = normalized;
                            pathsToDiscover.push(normalized, getFSParent(normalized));
                        }
                    } else if (command === 'ls') {
                        const listedPath = resolve(arg || null);
                        pathsToDiscover.push(listedPath);
                        filesForReplay.forEach(f => {
                            const fp = normalizeFSPath(f.file_path);
                            if (getFSParent(fp) === listedPath) pathsToDiscover.push(fp);
                        });
                    } else if (command === 'cat' || command === 'grep') {
                        const fp = resolve(arg || null);
                        pathsToDiscover.push(fp, getFSParent(fp));
                    } else if (command === 'find') {
                        const searchPath = resolve(arg || null);
                        const pfx = searchPath === '/' ? '/' : searchPath + '/';
                        pathsToDiscover.push(searchPath);
                        filesForReplay.forEach(f => {
                            const fp = normalizeFSPath(f.file_path);
                            if (fp.startsWith(pfx) || fp === searchPath) {
                                pathsToDiscover.push(fp, getFSParent(fp));
                            }
                        });
                    }
                });

                if (pathsToDiscover.length > 0) discoverPaths(pathsToDiscover);

                setCurrentPath(replayPath);
                currentPathRef.current = replayPath;

                // ── Replay visible command text, then leave the prompt at the
                //    restored path (was previously hardcoded to '/') ─────────
                const hasRestorableState = history.length > 0
                    || replayPath !== '/'
                    || revealedFiles.length > 0
                    || completedObjectiveIds.length > 0;

                if (hasRestorableState && xtermRef.current) {
                    if (history.length > 0) {
                        xtermRef.current.writeln('\r\x1b[2m-- Restoring previous session --\x1b[0m');
                        history.forEach(entry => {
                            xtermRef.current.writeln(`\r\x1b[90m> ${entry.command_entered}\x1b[0m`);
                        });
                    }
                    xtermRef.current.write(getPromptInline(replayPath));
                }
            } catch (_) { }
        };

        restore();
    }, [sessionId, token, isReady, initialFiles]);

    // ── Submit command to backend ─────────────────────────────────────────
    const submitCommand = useCallback(async (cmd, term) => {
        const sid = sessionIdRef.current;
        const tok = tokenRef.current;
        const path = currentPathRef.current;

        if (!sid || !tok || isProcessing.current) return;

        localHistory.current.push(cmd);

        // Handle frontend-only commands before hitting the backend
        if (handleLocalCommandRef.current(cmd, term)) {
            term.write(getPrompt(currentPathRef.current));
            return;
        }

        isProcessing.current = true;
        setIsProcessingState(true);
        term.write('\x1b[90mprocessing...\x1b[0m');

        try {
            const result = await executeCommand(sid, cmd, path, tok);

            term.write('\r\x1b[2K');

            if (result.output === '__CLEAR__') {
                term.clear();
                term.write(getPrompt(currentPathRef.current));
                return;
            }

            // Augment ls/find /tmp output with notes file when notes are present
            let output = result.output || '';
            if (investigatorNotesRef.current) {
                const trimCmd = cmd.trim();
                const inTmp = path === '/tmp';
                const isTmpLs = /^ls(\s+\/tmp)?\s*$/.test(trimCmd) && (trimCmd.includes('/tmp') || inTmp);
                const isTmpFind = /^find(\s+(\/tmp|\/)\s*)/.test(trimCmd) ||
                    (trimCmd === 'find' && inTmp);
                if (isTmpLs && !output.includes('investigator_notes.txt')) {
                    output += '\r\ninvestigator_notes.txt';
                }
                if (isTmpFind && !output.includes('investigator_notes.txt')) {
                    output += '\r\n/tmp/investigator_notes.txt';
                }
            }

            if (output) {
                const lines = output.split('\r\n');
                lines.forEach(line => term.writeln('\r' + line));
            }

            triggerDiscovery(cmd, path, output);

            if (cmd.startsWith('cd ')) {
                const target = cmd.slice(3).trim();
                handleCdPath(target, result.output, path);
            }

            if (result.matched && result.matchedStep) {
                writeStepMatchFeedback(term, result.matchedStep);
                onStepMatched?.(result.matchedStep);
            }

            // ── Discovery events ──────────────────────────────────────────
            if (result.newDiscoveries?.length > 0) {
                result.newDiscoveries.forEach(d => writeDiscoveryFeedback(term, d));
                onDiscoveryRef.current?.(result.newDiscoveries);
            }

            if (result.newlyRevealedFiles?.length > 0) {
                setVirtualFiles(prev => [...prev, ...result.newlyRevealedFiles]);
                writeRevealFeedback(term, result.newlyRevealedFiles);
                onFilesRevealed?.(result.newlyRevealedFiles);
                const revealedPaths = result.newlyRevealedFiles.flatMap(f => [
                    normalizeFSPath(f.file_path),
                    getFSParent(normalizeFSPath(f.file_path)),
                ]);
                discoverPaths(revealedPaths);
            }

            if (result.completedObjectiveIds?.length > 0) {
                onObjectivesUpdated?.(result.completedObjectiveIds);
            }

            if (result.auto_hint && onAutoHintRef.current) {
                onAutoHintRef.current(result.auto_hint);
                writeAutoHintFeedback(term);
            }

        } catch (err) {
            term.write('\r\x1b[2K');
            term.writeln(`\r\x1b[31mERROR: ${err.message}\x1b[0m`);
        } finally {
            isProcessing.current = false;
            setIsProcessingState(false);
            term.write(getPrompt(currentPathRef.current));
        }
    }, []);

    // ── Path tracking for cd ──────────────────────────────────────────────
    const handleCdPath = useCallback((target, output, currentPathValue) => {
        if (output?.includes('No such file') || output?.includes('Not a directory')) return;
        const newPath = resolveFSPath(target, currentPathValue || '/');
        setCurrentPath(newPath);
        currentPathRef.current = newPath;
    }, []);

    // ── File system discovery ─────────────────────────────────────────────
    const triggerDiscovery = (cmd, currentPathValue, output) => {
        // Do not mark paths as discovered when the command produced an error.
        // This keeps the FileTree consistent with what the player actually saw.
        if (output && (
            output.includes('No such file or directory') ||
            output.includes('cannot access') ||
            output.includes('command not found') ||
            output.includes('Not a directory')
        )) return;

        const tokens = cmd.trim().split(/\s+/);
        const command = tokens[0]?.toLowerCase();
        const arg = tokens.slice(1).find(t => !t.startsWith('-'));
        const resolve = (target) => resolveFSPath(target || null, currentPathValue || '/');

        const toDiscover = [];

        if (command === 'cd') {
            if (arg) {
                const resolved = resolve(arg);
                toDiscover.push(resolved);
                toDiscover.push(getFSParent(resolved));
            }
        } else if (command === 'ls') {
            const listedPath = resolve(arg || null);
            toDiscover.push(listedPath);
            virtualFilesRef.current.forEach(f => {
                const fp = normalizeFSPath(f.file_path);
                if (getFSParent(fp) === listedPath) toDiscover.push(fp);
            });
        } else if (command === 'cat' || command === 'grep') {
            const fp = resolve(arg || null);
            toDiscover.push(fp);
            toDiscover.push(getFSParent(fp));
        } else if (command === 'find') {
            const searchPath = resolve(arg || null);
            const pfx = searchPath === '/' ? '/' : searchPath + '/';
            toDiscover.push(searchPath);
            virtualFilesRef.current.forEach(f => {
                const fp = normalizeFSPath(f.file_path);
                if (fp.startsWith(pfx) || fp === searchPath) {
                    toDiscover.push(fp);
                    toDiscover.push(getFSParent(fp));
                }
            });
        } else if (command === 'locate') {
            if (output) {
                const lines = output.split(/[\r\n]+/);
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('/')) {
                        toDiscover.push(trimmed);
                        toDiscover.push(getFSParent(trimmed));
                    }
                });
            }
        }

        if (toDiscover.length > 0) discoverPaths(toDiscover);
    };

    const virtualFilesRef = useRef(virtualFiles);
    useEffect(() => { virtualFilesRef.current = virtualFiles; }, [virtualFiles]);

    // ── Terminal write helpers ────────────────────────────────────────────
    const writeStepMatchFeedback = (term, step) => {
        term.writeln(`\r\x1b[32m✓ ${step.description}\x1b[0m`);
    };

    const writeDiscoveryFeedback = (term, discovery) => {
        term.writeln(`\r\x1b[36m[DISCOVERY] ${discovery.title}\x1b[0m`);
        if (discovery.reveal_hint) {
            term.writeln(`\r\x1b[90m  → ${discovery.reveal_hint}\x1b[0m`);
        }
    };

    const writeRevealFeedback = (term, files) => {
        files.forEach(f => {
            term.writeln(`\r\x1b[33m[SYSTEM] New file accessible: ${f.file_path}\x1b[0m`);
        });
    };

    const writeAutoHintFeedback = (term) => {
        term.writeln('\r\x1b[35m[ARIA] Intelligence update available — check the ARIA panel.\x1b[0m');
    };

    const writeToTerminal = useCallback((text) => {
        if (xtermRef.current) {
            xtermRef.current.writeln('\r' + text);
        }
    }, []);

    const fit = useCallback(() => {
        if (fitAddonRef.current) {
            try {
                fitAddonRef.current.fit();
            } catch (e) {
                // Ignore errors if container isn't ready
            }
        }
    }, []);

    return {
        terminalRef,
        currentPath,
        virtualFiles,
        discoveredPaths,
        isReady,
        isProcessingState,
        writeToTerminal,
        fit,
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
