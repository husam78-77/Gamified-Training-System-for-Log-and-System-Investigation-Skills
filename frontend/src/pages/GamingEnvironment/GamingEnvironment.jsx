/**
 * GamingEnvironment.jsx
 * The core investigation engine. Assembles all hooks and components.
 *
 * Route: /game
 * Receives state: { scenario_id, mode }
 *
 * Hook wiring:
 *   useSession     → session lifecycle, timer, abandon/complete
 *   useTerminal    → xterm.js, command execution, file system
 *   useObjectives  → objective state, step progress tracking
 *   useHint        → AI oracle, hint log, limit tracking
 *
 * Path: frontend/src/pages/GamingEnvironment/GamingEnvironment.jsx
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchFullScenarioData } from '../../services/scenarioService';

import { useSession } from '../../hooks/useSession';
import { useTerminal } from '../../hooks/useTerminal';
import { useObjectives } from '../../hooks/useObjectives';
import { useHint } from '../../hooks/useHint';

import TerminalPanel from '../../components/TerminalPanel';
import ObjectivesPanel from '../../components/ObjectivesPanel';
import HintPanel from '../../components/HintPanel';
import TimerDisplay from '../../components/TimerDisplay';

import './GamingEnvironment.css';

export default function GamingEnvironment() {
    const navigate = useNavigate();
    const { scenario_id } = useParams();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'free';
    const { token } = useAuth();

    // ── Stabilize scenario_id as integer once — never changes ──────────────
    const scenarioIdInt = parseInt(scenario_id, 10);

    // ── Scenario data state (loaded once on mount) ────────────────────────
    const [scenarioData, setScenarioData] = useState(null);
    const [scenarioLoading, setScenarioLoading] = useState(true);
    const [scenarioError, setScenarioError] = useState(null);

    // ── Exit confirmation modal state (timed mode only) ───────────────────
    const [showExitModal, setShowExitModal] = useState(false);

    // ── Guard: invalid URL params → redirect ──────────────────────────────
    useEffect(() => {
        if (!scenarioIdInt || isNaN(scenarioIdInt)) {
            navigate('/mission', { replace: true });
        }
    }, []);

    // ── Load full scenario data — only once on mount ──────────────────────
    useEffect(() => {
        if (!scenarioIdInt || !token) return;
        const load = async () => {
            setScenarioLoading(true);
            setScenarioError(null);
            try {
                const data = await fetchFullScenarioData(scenarioIdInt, token);
                setScenarioData(data);
            } catch (err) {
                setScenarioError(err.message);
            } finally {
                setScenarioLoading(false);
            }
        };
        load();
    }, []); // Empty deps — runs once, values are stable

    // ── SESSION HOOK ──────────────────────────────────────────────────────
    const session = useSession(scenarioIdInt, mode, token);

    // ── OBJECTIVES HOOK ───────────────────────────────────────────────────
    const objectives = useObjectives(scenarioData?.objectives || []);

    // ── Stable callback refs — never recreated, prevent render loops ────────
    const objectivesRef = useRef(null);
    objectivesRef.current = objectives;

    const handleStepMatched = useCallback((matchedStep) => {
        objectivesRef.current?.markStepProgress(matchedStep);
        // Push a live system log entry
        const now = new Date();
        const fmt = (d) => d.toTimeString().slice(0, 8);
        setSystemLogs(prev => [...prev, {
            time: fmt(now),
            message: `STEP_COMPLETE: ${matchedStep.description}`,
            type: 'critical',
        }]);
    }, []); // Empty deps — uses ref internally

    const handleObjectivesUpdated = useCallback((completedIds) => {
        objectivesRef.current?.markObjectivesCompleted(completedIds);
    }, []); // Empty deps — uses ref internally

    const handleFilesRevealed = useCallback((newFiles) => {
        // Files are added to virtualFiles inside useTerminal automatically
        const now = new Date();
        const fmt = (d) => d.toTimeString().slice(0, 8);
        newFiles.forEach(f => {
            setSystemLogs(prev => [...prev, {
                time: fmt(now),
                message: `FILE_UNLOCKED: ${f.file_path}`,
                type: 'critical',
                sub: 'New evidence accessible',
            }]);
        });
    }, []);

    // ── TERMINAL HOOK ─────────────────────────────────────────────────────
    const terminal = useTerminal({
        sessionId: session.sessionId,
        token,
        initialFiles: scenarioData?.virtualFiles || [],
        onStepMatched: handleStepMatched,
        onFilesRevealed: handleFilesRevealed,
        onObjectivesUpdated: handleObjectivesUpdated,
    });

    // ── HINT HOOK ─────────────────────────────────────────────────────────
    const hint = useHint(session.sessionId, token);

    // ── Auto-complete when all required objectives done ───────────────────
    useEffect(() => {
        if (objectives.allRequiredComplete && session.isActive) {
            terminal.writeToTerminal(
                '\x1b[32m[SYSTEM] All objectives complete. Mission ready to finalize.\x1b[0m'
            );
        }
    }, [objectives.allRequiredComplete]);

    // ── Session completed → navigate to results ───────────────────────────
    useEffect(() => {
        if (session.isCompleted && session.evaluation) {
            // Brief delay so user sees the terminal complete message
            const timer = setTimeout(() => {
                navigate('/mission', {
                    state: { evaluation: session.evaluation },
                });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [session.isCompleted, session.evaluation]);

    // ── Session abandoned → navigate away immediately ─────────────────────
    useEffect(() => {
        if (session.isAbandoned) {
            navigate('/mission', { replace: true });
        }
    }, [session.isAbandoned]);

    // ── Exit button handler ───────────────────────────────────────────────
    const handleExitClick = () => {
        if (mode === 'timed') {
            setShowExitModal(true); // Show warning
        } else {
            // Free mode — just complete (saves partial progress)
            session.complete();
        }
    };

    const handleConfirmAbandon = async () => {
        setShowExitModal(false);
        await session.abandon();
    };

    // ── System logs state — updated live as steps are matched ───────────
    const [systemLogs, setSystemLogs] = useState([]);

    // Initialize system logs once scenario data loads
    useEffect(() => {
        if (!scenarioData?.scenario) return;
        setSystemLogs(buildSystemLogs(terminal.virtualFiles, scenarioData.scenario));
    }, [scenarioData?.scenario?.scenario_id]);


    // ── Loading screen ────────────────────────────────────────────────────
    if (scenarioLoading || session.isLoading && !session.sessionId) {
        return <BootScreen />;
    }

    if (scenarioError) {
        return <ErrorScreen error={scenarioError} onBack={() => navigate(-1)} />;
    }

    return (
        <div className="gaming-env-wrapper font-body selection:bg-primary selection:text-white">
            <div className="fixed inset-0 bg-noise z-50 pointer-events-none"></div>

            {/* ── HUD: Top Right — Timer ─────────────────────────────────── */}
            <div className="fixed top-8 right-8 z-40 flex flex-col items-end gap-2">
                <TimerDisplay
                    formattedTime={session.formattedTime}
                    timeRemaining={session.timeRemaining}
                    mode={mode}
                />
            </div>

            {/* ── HUD: Bottom Left — Exit ───────────────────────────────── */}
            <div className="fixed bottom-8 left-8 z-40">
                <button
                    onClick={handleExitClick}
                    disabled={session.isLoading}
                    className="group flex items-center gap-4 bg-surface-container-high/50 border border-white/5 px-8 py-3 skew-x-[-12deg] hover:bg-[#FF003C] transition-all duration-300 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[#FF003C] group-hover:text-black transition-colors">
                        logout
                    </span>
                    <span className="font-label font-bold text-on-surface group-hover:text-black transition-colors tracking-widest">
                        EXIT_SESSION
                    </span>
                </button>
            </div>

            {/* ── HUD: Bottom Right — Complete mission button ───────────── */}
            {objectives.allRequiredComplete && session.isActive && (
                <div className="fixed bottom-8 right-8 z-40">
                    <button
                        onClick={session.complete}
                        className="group flex items-center gap-3 bg-green-500/20 border border-green-500/40 px-6 py-3 skew-x-[-12deg] hover:bg-green-500 transition-all duration-300 animate-pulse"
                    >
                        <span className="material-symbols-outlined text-green-400 group-hover:text-black transition-colors">
                            check_circle
                        </span>
                        <span className="font-label font-bold text-green-400 group-hover:text-black transition-colors tracking-widest text-xs">
                            FINALIZE_MISSION
                        </span>
                    </button>
                </div>
            )}

            {/* ── MAIN LAYOUT ───────────────────────────────────────────── */}
            <main className="h-screen w-full flex p-6 gap-6 relative z-10">

                {/* LEFT PANEL */}
                <aside className="w-[22%] flex flex-col gap-6">

                    {/* SYSTEM LOGS */}
                    <section className="flex-1 bg-surface-container-lowest/80 p-4 flex flex-col gap-4 overflow-hidden relative border-t border-l border-white/5">
                        <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                            <h2 className="font-label text-xs font-bold tracking-widest text-[#FF003C] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[14px]">developer_board</span>
                                SYSTEM_LOGS
                            </h2>
                            <span className="text-[9px] text-[#FF003C]/60 font-label animate-pulse">LIVE_FEED</span>
                        </div>
                        <div className="flex-1 font-label text-[10px] leading-relaxed overflow-y-auto space-y-3 opacity-90 custom-scrollbar">
                            {systemLogs.map((log, i) => (
                                <SystemLogEntry key={i} log={log} />
                            ))}
                        </div>
                    </section>

                    {/* FILE SYSTEM */}
                    <section className="h-2/5 bg-surface-container-low/50 p-4 border-l-2 border-[#00EBF7]/20">
                        <h2 className="font-label text-xs font-bold tracking-widest text-[#00EBF7] mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]">folder_zip</span>
                            FILE_SYSTEM
                        </h2>
                        <div className="font-label text-xs space-y-1 text-[#00EBF7]/60 overflow-y-auto max-h-full custom-scrollbar">
                            <FileTree
                                files={terminal.virtualFiles}
                                currentPath={terminal.currentPath}
                                discoveredPaths={terminal.discoveredPaths}
                            />
                        </div>
                    </section>
                </aside>

                {/* CENTER: Terminal */}
                <div className="flex-1 flex flex-col gap-3">
                    <div className="w-full flex-1 relative min-h-0">
                        <TerminalPanel
                            terminalRef={terminal.terminalRef}
                            currentPath={terminal.currentPath}
                            isReady={terminal.isReady}
                        />
                    </div>

                    {/* Scenario title strip */}
                    <div className="flex items-center justify-between px-4 py-2 bg-surface-container-lowest/60 border border-white/5 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-2 bg-[#FF003C] animate-pulse"></div>
                            <span className="font-label text-[10px] text-white/40 tracking-widest uppercase">
                                {scenarioData?.scenario?.title || 'LOADING...'}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-label text-[9px] text-white/20 tracking-widest uppercase">
                                MODE: {mode?.toUpperCase()}
                            </span>
                            <span className="font-label text-[9px] text-white/20 tracking-widest uppercase">
                                DIFF: {scenarioData?.scenario?.difficulty?.toUpperCase() || '—'}
                            </span>
                            <span className="font-label text-[9px] text-white/20 tracking-widest uppercase">
                                STEPS: {objectives.completedCount}/{objectives.totalRequired}
                            </span>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <aside className="w-[22%] flex flex-col gap-6">

                    {/* Operative status */}
                    <section className="bg-surface-container-high/40 p-4 border-r-2 border-[#FF003C]/60">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-label text-[10px] font-bold tracking-widest text-[#FF003C]">
                                OPERATIVE_STATUS
                            </h2>
                            <span className="material-symbols-outlined text-[#00EBF7] text-base">shield</span>
                        </div>
                        <div className="space-y-4">
                            {/* Completion index */}
                            <div>
                                <div className="flex justify-between text-[9px] font-label text-on-surface/40 mb-1">
                                    <span>COMPLETION_INDEX</span>
                                    <span className="text-[#FF003C]">{objectives.completionPercent}%</span>
                                </div>
                                <div className="h-1 bg-white/5 w-full">
                                    <div
                                        className="h-full bg-[#FF003C] transition-all duration-700 relative"
                                        style={{ width: `${objectives.completionPercent}%` }}
                                    >
                                        <div className="absolute top-0 right-0 h-full w-1 bg-white animate-pulse"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Session ID */}
                            <div className="flex justify-between items-center bg-black/20 p-2">
                                <div className="font-label">
                                    <div className="text-[9px] text-on-surface/40">SESSION_ID</div>
                                    <div className="text-xl font-bold text-[#00EBF7] tracking-tight">
                                        {session.sessionId
                                            ? String(session.sessionId).padStart(8, '0')
                                            : '--------'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* AI HINT PANEL */}
                    <HintPanel
                        latestHint={hint.latestHint}
                        hints={hint.hints}
                        hintsRemaining={hint.hintsRemaining}
                        limitReached={hint.limitReached}
                        isLoading={hint.isLoading}
                        error={hint.error}
                        onRequestHint={hint.getHint}
                    />

                    {/* OBJECTIVES PANEL */}
                    <ObjectivesPanel
                        objectives={objectives.objectives}
                        completedCount={objectives.completedCount}
                        totalRequired={objectives.totalRequired}
                        completionPercent={objectives.completionPercent}
                        secretObjectives={objectives.secretObjectives}
                    />
                </aside>
            </main>

            {/* ── SCANLINE OVERLAY ──────────────────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none z-[60] opacity-[0.06]"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
                }}
            ></div>

            {/* ── EXIT WARNING MODAL (timed mode) ──────────────────────── */}
            {showExitModal && (
                <ExitModal
                    onConfirm={handleConfirmAbandon}
                    onCancel={() => setShowExitModal(false)}
                />
            )}

            {/* ── COMPLETION OVERLAY ────────────────────────────────────── */}
            {session.isCompleted && (
                <CompletionOverlay evaluation={session.evaluation} />
            )}
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function SystemLogEntry({ log }) {
    const isCritical = log.type === 'critical';
    return (
        <div className={isCritical ? 'p-2 bg-[#FF003C]/10 border-l-2 border-[#FF003C]' : 'flex gap-2 text-[#00EBF7]/40'}>
            <div className={`flex gap-2 ${isCritical ? 'text-[#FF003C] font-bold' : ''}`}>
                <span>[{log.time}]</span>
                <span className={isCritical ? '' : 'text-on-surface/80'}>{log.message}</span>
            </div>
            {log.sub && (
                <div className="text-[9px] mt-1 text-[#FF003C]/70 ml-12">{log.sub}</div>
            )}
        </div>
    );
}

function FileTree({ files, currentPath, discoveredPaths }) {
    const norm = (p) => (p || '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    const getParent = (p) => {
        const parts = norm(p).split('/').filter(Boolean);
        if (parts.length === 0) return '/';
        parts.pop();
        return '/' + parts.join('/') || '/';
    };

    const discovered = discoveredPaths || new Set(['/']);

    // Collect all unique directory paths
    const allDirs = new Set(['/']);
    (files || []).forEach(f => {
        if (!f.file_path) return;
        const parts = norm(f.file_path).split('/').filter(Boolean);
        for (let i = 1; i <= parts.length - 1; i++) {
            allDirs.add('/' + parts.slice(0, i).join('/'));
        }
        if (f.file_type === 'directory') {
            allDirs.add(norm(f.file_path));
        }
    });

    // Build parent → children map
    const tree = {};
    allDirs.forEach(dir => {
        if (dir === '/') return;
        const parent = getParent(dir);
        if (!tree[parent]) tree[parent] = { dirs: [], files: [] };
        if (!tree[parent].dirs.includes(dir)) tree[parent].dirs.push(dir);
    });
    (files || []).forEach(f => {
        if (!f.file_path || f.file_type === 'directory') return;
        const parent = getParent(norm(f.file_path));
        if (!tree[parent]) tree[parent] = { dirs: [], files: [] };
        tree[parent].files.push(f);
    });

    const renderNode = (path, depth = 0) => {
        if (!discovered.has(norm(path)) && path !== '/') return null;
        const indent = depth * 12;
        const name = path === '/' ? 'root' : path.split('/').filter(Boolean).pop();
        const isCurrent = norm(path) === norm(currentPath);
        const children = tree[path] || { dirs: [], files: [] };

        return (
            <div key={path}>
                <div
                    className={`flex items-center gap-1.5 py-0.5 text-[10px] ${isCurrent ? 'text-[#FF003C]' : 'text-[#00EBF7]/70'
                        }`}
                    style={{ paddingLeft: `${indent + 4}px` }}
                >
                    <span className="material-symbols-outlined text-[12px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isCurrent ? 'folder_open' : 'folder'}
                    </span>
                    <span className={isCurrent ? 'font-bold' : ''}>{name}</span>
                    {isCurrent && (
                        <span className="text-[#FF003C]/40 text-[8px] ml-1">← here</span>
                    )}
                </div>

                <div style={{ marginLeft: `${indent + 10}px` }}
                    className="border-l border-white/5">
                    {children.dirs.map(d => renderNode(d, depth + 1))}
                    {children.files.map(f => {
                        const fp = norm(f.file_path);
                        if (!discovered.has(fp)) return null;
                        const fname = f.file_name || fp.split('/').pop();
                        const isLog = f.file_type === 'log' || fname.endsWith('.log');
                        const isScript = fname.endsWith('.sh') || fname.endsWith('.py');
                        return (
                            <div key={f.virtual_file_id}
                                className={`flex items-center gap-1.5 py-0.5 text-[10px] pl-2 ${isLog ? 'text-yellow-400/60' :
                                    isScript ? 'text-[#FF003C]/60' :
                                        'text-[#00EBF7]/50'
                                    }`}>
                                <span className="material-symbols-outlined text-[11px]">
                                    {isLog ? 'receipt_long' : isScript ? 'code' : 'draft'}
                                </span>
                                <span className="truncate">{fname}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-0.5">
            {renderNode('/')}
            {discovered.size <= 1 && (
                <div className="text-white/15 text-[9px] italic mt-2 pl-2">
                    Navigate to reveal the filesystem...
                </div>
            )}
        </div>
    );
}


function ExitModal({ onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface-container-high border-l-8 border-[#FF003C] p-10 max-w-md w-full mx-4 relative">
                <div className="absolute -top-3 -left-3 bg-[#FF003C] px-3 py-1 font-label text-[10px] font-black text-black tracking-widest">
                    WARNING
                </div>
                <h2 className="font-headline text-3xl font-black italic text-[#FF003C] uppercase mb-4">
                    ABORT_SESSION?
                </h2>
                <p className="font-body text-zinc-300 leading-relaxed mb-8">
                    You are in <span className="text-[#FF003C] font-bold">TIMED MODE</span>. Exiting now will
                    discard all progress and award no score or XP for this session.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-[#FF003C] text-black font-headline font-black italic py-4 text-lg uppercase tracking-widest hover:bg-white transition-colors"
                    >
                        ABANDON
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex-1 border-2 border-[#00EBF7] text-[#00EBF7] font-headline font-black italic py-4 text-lg uppercase tracking-widest hover:bg-[#00EBF7]/10 transition-colors"
                    >
                        CONTINUE
                    </button>
                </div>
            </div>
        </div>
    );
}

function CompletionOverlay({ evaluation }) {
    const score = evaluation?.evaluation?.totalWeightedScore ?? 0;
    const xp = evaluation?.xpAwarded ?? 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="text-center space-y-6">
                <div className="font-headline text-8xl font-black italic text-[#00EBF7] animate-pulse">
                    MISSION_COMPLETE
                </div>
                <div className="font-headline text-6xl font-black text-white">
                    {score}<span className="text-[#FF003C]">/100</span>
                </div>
                <div className="font-label text-[#00EBF7] text-lg tracking-widest">
                    +{xp} XP AWARDED
                </div>
                <div className="font-label text-zinc-500 text-sm tracking-widest animate-pulse">
                    Returning to mission hub...
                </div>
            </div>
        </div>
    );
}

function BootScreen() {
    return (
        <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-6">
            <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        className="w-1.5 h-8 bg-[#FF003C]"
                        style={{
                            animation: 'bootBar 0.8s ease-in-out infinite',
                            animationDelay: `${i * 0.15}s`,
                        }}
                    ></div>
                ))}
            </div>
            <span className="font-label text-[11px] text-white/20 tracking-[0.5em] uppercase">
                Initializing investigation environment...
            </span>
            <style>{`
                @keyframes bootBar {
                    0%, 100% { transform: scaleY(0.3); opacity: 0.3; }
                    50%       { transform: scaleY(1);   opacity: 1;   }
                }
            `}</style>
        </div>
    );
}

function ErrorScreen({ error, onBack }) {
    return (
        <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-6 p-8">
            <span className="material-symbols-outlined text-[#FF003C] text-6xl">error</span>
            <div className="font-headline text-3xl font-black italic text-[#FF003C] uppercase">
                SYSTEM_FAILURE
            </div>
            <p className="font-label text-zinc-500 text-sm tracking-widest text-center max-w-sm">
                {error}
            </p>
            <button
                onClick={onBack}
                className="font-label text-xs text-zinc-400 hover:text-white underline tracking-widest uppercase"
            >
                ← Return to base
            </button>
        </div>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

const buildSystemLogs = (files, scenario) => {
    const now = new Date();
    const fmt = (d) => d.toTimeString().slice(0, 8);

    const logs = [
        { time: fmt(new Date(now - 20000)), message: 'Initializing socket connection...', type: 'info' },
        { time: fmt(new Date(now - 15000)), message: 'CRITICAL: Unauthorized access protocol detected', type: 'critical', sub: `SCENARIO: ${scenario?.title || 'UNKNOWN'}` },
        { time: fmt(new Date(now - 10000)), message: 'Mounting virtual filesystem...', type: 'info' },
        { time: fmt(new Date(now - 8000)), message: `File system loaded: ${files.length} objects`, type: 'info' },
        { time: fmt(new Date(now - 3000)), message: 'CRITICAL: Awaiting investigator input', type: 'critical' },
        { time: fmt(now), message: 'Secure shell active. Begin investigation.', type: 'info' },
    ];

    return logs;
};