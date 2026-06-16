/**
 * GamingEnvironment.jsx
 * The core investigation engine. Assembles all hooks and components.
 *
 * Route: /game
 * Receives state: { scenario_id, mode }
 *
 * Hook wiring:
 * useSession     → session lifecycle, timer, abandon/complete
 * useTerminal    → xterm.js, command execution, file system
 * useObjectives  → objective state, step progress tracking
 * useHint        → AI oracle, hint log, limit tracking
 *
 * Path: frontend/src/pages/GamingEnvironment/GamingEnvironment.jsx
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchFullScenarioData } from '../../services/scenarioService';
import { motion, AnimatePresence } from 'framer-motion';

import { useSession } from '../../hooks/useSession';
import { useTerminal } from '../../hooks/useTerminal';
import { useObjectives } from '../../hooks/useObjectives';
import { useHint } from '../../hooks/useHint';

import TerminalPanel from '../../components/TerminalPanel';
import ObjectivesPanel from '../../components/ObjectivesPanel';
import HintPanel from '../../components/HintPanel';
import TimerDisplay from '../../components/TimerDisplay';

// --- Kinetic Animation Variants ---
const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};
const slamLeft = {
    hidden: { opacity: 0, x: -40, skewX: "5deg" },
    show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
};
const slamRight = {
    hidden: { opacity: 0, x: 40, skewX: "-5deg" },
    show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
};
const slamUp = {
    hidden: { opacity: 0, y: 40, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 25 } }
};

export default function GamingEnvironment() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'free';
    const { token } = useAuth();
    const { scenario_id } = useParams();

    // ── Scenario data state — populated when backend assigns a scenario ────
    const [scenarioData, setScenarioData] = useState(null);
    const [scenarioLoading, setScenarioLoading] = useState(true);
    const [scenarioError, setScenarioError] = useState(null);
    const [assignedId, setAssignedId] = useState(null);

    // ── Exit confirmation modal ───────────────────────────────────────────
    const [showExitModal, setShowExitModal] = useState(false);

    // ── Discovery tracking ────────────────────────────────────────────────
    const [discoveries, setDiscoveries] = useState([]);
    const [newlyRevealedFilePaths, setNewlyRevealedFilePaths] = useState(new Set());

    // ── Terminal micro-interaction ────────────────────────────────────────
    const [hasNewDiscovery, setHasNewDiscovery] = useState(false);

    // ── Called by useSession when backend assigns a scenario ──────────────
    const handleScenarioAssigned = useCallback(async (scenario) => {
        setAssignedId(scenario.scenario_id);
        setScenarioLoading(true);
        setScenarioError(null);
        try {
            const data = await fetchFullScenarioData(scenario.scenario_id, token);
            setScenarioData(data);
        } catch (err) {
            setScenarioError(err.message);
        } finally {
            setScenarioLoading(false);
        }
    }, [token]);

    // ── SESSION HOOK ──────────────────────────────────────────────────────
    const session = useSession(mode, token, handleScenarioAssigned, scenario_id);

    // ── OBJECTIVES HOOK ───────────────────────────────────────────────────
    const objectives = useObjectives(scenarioData?.objectives || []);

    const objectivesRef = useRef(null);
    objectivesRef.current = objectives;

    const handleStepMatched = useCallback((matchedStep) => {
        objectivesRef.current?.markStepProgress(matchedStep);
        const now = new Date();
        const fmt = (d) => d.toTimeString().slice(0, 8);
        setSystemLogs(prev => [...prev, {
            time: fmt(now),
            message: `STEP_COMPLETE: ${matchedStep.description}`,
            type: 'critical',
        }]);
    }, []);

    const handleObjectivesUpdated = useCallback((completedIds) => {
        objectivesRef.current?.markObjectivesCompleted(completedIds);
    }, []);

    const handleFilesRevealed = useCallback((newFiles) => {
        const now = new Date();
        const fmt = (d) => d.toTimeString().slice(0, 8);
        const paths = newFiles.map(f => f.file_path);

        setNewlyRevealedFilePaths(prev => {
            const next = new Set(prev);
            paths.forEach(p => next.add(p));
            return next;
        });

        newFiles.forEach(f => {
            setSystemLogs(prev => [...prev, {
                time: fmt(now),
                message: `FILE_UNLOCKED: ${f.file_path}`,
                type: 'critical',
                sub: 'New evidence accessible',
            }]);
        });

        setTimeout(() => {
            setNewlyRevealedFilePaths(prev => {
                const next = new Set(prev);
                paths.forEach(p => next.delete(p));
                return next;
            });
        }, 2000);
    }, []);

    const handleDiscovery = useCallback((newDiscoveries) => {
        const now = new Date();
        const fmt = (d) => d.toTimeString().slice(0, 8);
        setDiscoveries(prev => [
            ...prev,
            ...newDiscoveries.map(d => ({ ...d, at: fmt(now) })),
        ]);

        setSystemLogs(prev => {
            const entries = newDiscoveries.flatMap(d => {
                const sev = d.severity_level || (d.is_critical ? 'confirmation' : 'awareness');
                const logs = [{
                    time: fmt(now),
                    message: `DISCOVERY: ${d.title}`,
                    type: 'discovery',
                    severity: sev,
                    sub: d.description ? d.description.slice(0, 70) : null,
                }];
                if (sev === 'analysis' || (sev === 'confirmation' && d.is_critical)) {
                    logs.push({
                        time: fmt(now),
                        message: '[ARIA] Correlation confidence increasing...',
                        type: 'aria',
                    });
                }
                return logs;
            });
            return [...prev, ...entries];
        });

        setHasNewDiscovery(true);
        setTimeout(() => setHasNewDiscovery(false), 1500);
    }, []);

    // ── HINT HOOK ─────────────────────────────────────────────────────────
    const hint = useHint(session.sessionId, token);

    const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);

    // ── TERMINAL HOOK ─────────────────────────────────────────────────────
    const terminal = useTerminal({
        sessionId: session.sessionId,
        token,
        initialFiles: scenarioData?.virtualFiles || [],
        onStepMatched: handleStepMatched,
        onFilesRevealed: handleFilesRevealed,
        onObjectivesUpdated: handleObjectivesUpdated,
        onAutoHint: hint.consumeAutoHint,
        onDiscovery: handleDiscovery,
    });

    useEffect(() => {
        if (objectives.allRequiredComplete && session.isActive && !hasNotifiedCompletion) {
            terminal.writeToTerminal(
                '\x1b[32m[SYSTEM] All objectives complete. Mission ready to finalize.\x1b[0m'
            );
            setHasNotifiedCompletion(true);
        }
    }, [objectives.allRequiredComplete, session.isActive, terminal.writeToTerminal, hasNotifiedCompletion]);

    useEffect(() => {
        if (session.isCompleted && session.evaluation) {
            const timer = setTimeout(() => {
                navigate('/mission', {
                    state: { evaluation: session.evaluation },
                });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [session.isCompleted, session.evaluation, navigate]);

    useEffect(() => {
        if (session.isAbandoned) {
            navigate('/mission', { replace: true });
        }
    }, [session.isAbandoned, navigate]);

    const handleExitClick = () => {
        if (mode === 'timed') {
            setShowExitModal(true);
        } else {
            session.complete();
        }
    };

    const handleConfirmAbandon = async () => {
        setShowExitModal(false);
        await session.abandon();
    };

    // ── System logs state ─────────────────────────────────────────────────
    const [systemLogs, setSystemLogs] = useState([]);

    // ── Panel Accordion States ────────────────────────────────────────────
    const [activeLeftPanel, setActiveLeftPanel] = useState('filesystem');
    const [activeRightPanel, setActiveRightPanel] = useState('objectives');

    useEffect(() => {
        if (!scenarioData?.scenario) return;
        setSystemLogs(buildSystemLogs(terminal.virtualFiles, scenarioData.scenario));
    }, [scenarioData?.scenario?.scenario_id, terminal.virtualFiles]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (terminal.fit) {
                terminal.fit();
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [activeLeftPanel, activeRightPanel, terminal.fit]);


    // ── Loading & Error Screens ───────────────────────────────────────────
    if (scenarioLoading || (session.isLoading && !session.sessionId)) {
        return <BootScreen />;
    }

    if (scenarioError) {
        return <ErrorScreen error={scenarioError} onBack={() => navigate(-1)} />;
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-body selection:bg-[#FF003C] selection:text-white overflow-hidden relative">

            {/* ── BACKGROUND VOID ───────────────────────────────────────── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] opacity-90"></div>
                <div className="fixed inset-0 z-[60] pointer-events-none opacity-[0.05]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 4px)' }}></div>
            </div>

            {/* ── HUD OVERLAYS ──────────────────────────────────────────── */}
            <div className="fixed top-6 right-6 z-40 flex flex-col items-end gap-2 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                <TimerDisplay
                    formattedTime={session.formattedTime}
                    timeRemaining={session.timeRemaining}
                    mode={mode}
                />
            </div>

            {/* (Exit button moved to metadata strip) */}

            {objectives.allRequiredComplete && session.isActive && (
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-6 right-6 z-40">
                    <button
                        onClick={session.complete}
                        className="group flex items-center gap-4 bg-[#00FFFF] text-black px-8 py-4 skew-x-[-12deg] hover:bg-white transition-all duration-300 shadow-[0_0_30px_rgba(0,255,255,0.4)]"
                    >
                        <span className="skew-x-[12deg] material-symbols-outlined font-black">bolt</span>
                        <span className="skew-x-[12deg] font-black italic text-lg tracking-widest uppercase">FINALIZE_MISSION</span>
                    </button>
                </motion.div>
            )}

            {/* ── MAIN LAYOUT ───────────────────────────────────────────── */}
            <motion.main variants={staggerContainer} initial="hidden" animate="show" className="min-h-screen lg:h-screen w-full flex flex-col lg:flex-row max-w-[1920px] mx-auto p-4 md:p-6 gap-4 relative z-10 pt-20 pb-24 overflow-y-auto lg:overflow-hidden">

                {/* LEFT PANEL: Logs & File System */}
                <motion.aside variants={slamLeft} className="w-full lg:w-[20%] lg:xl:w-[22%] flex flex-col gap-4">

                    {/* SYSTEM LOGS */}
                    <section
                        className={`bg-[#0A0A0A] flex flex-col overflow-hidden relative shadow-[10px_10px_0px_#050505] border border-white/5 transition-all duration-300 ${activeLeftPanel === 'logs' ? 'flex-1' : 'flex-none'}`}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF003C] to-transparent"></div>
                        <button onClick={() => setActiveLeftPanel(p => p === 'logs' ? null : 'logs')} className="w-full flex justify-between items-center p-4 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent hover:bg-white/5 transition-colors cursor-pointer group">
                            <h2 className="font-sans text-[10px] font-bold tracking-[0.3em] text-[#FF003C] uppercase flex items-center gap-3">
                                <span className="material-symbols-outlined text-[14px]">developer_board</span>
                                SYSTEM_LOGS
                            </h2>
                            <span className="material-symbols-outlined text-[#FF003C]/60 group-hover:text-[#FF003C] transition-colors">
                                {activeLeftPanel === 'logs' ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {activeLeftPanel === 'logs' && (
                            <div className="flex-1 font-sans text-[11px] leading-relaxed overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {systemLogs.map((log, i) => (
                                    <SystemLogEntry key={i} log={log} />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* FILE SYSTEM */}
                    <section className={`bg-[#0D0D0D] flex flex-col border border-white/5 border-l-4 border-l-[#00FFFF] shadow-[10px_10px_0px_#050505] transition-all duration-300 ${activeLeftPanel === 'filesystem' ? 'flex-[2]' : 'flex-none'}`}>
                        <button onClick={() => setActiveLeftPanel(p => p === 'filesystem' ? null : 'filesystem')} className="w-full p-4 border-b border-white/5 flex justify-between items-center bg-[#050505] hover:bg-white/5 transition-colors cursor-pointer group">
                            <h2 className="font-sans text-[10px] font-bold tracking-[0.3em] text-[#00FFFF] uppercase flex items-center gap-3">
                                <span className="material-symbols-outlined text-[14px]">folder_zip</span>
                                FILE_SYSTEM
                            </h2>
                            <span className="material-symbols-outlined text-[#00FFFF]/60 group-hover:text-[#00FFFF] transition-colors">
                                {activeLeftPanel === 'filesystem' ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {activeLeftPanel === 'filesystem' && (
                            <div className="flex-1 overflow-y-auto p-4 pb-28 custom-scrollbar">
                                <FileTree
                                    files={terminal.virtualFiles}
                                    currentPath={terminal.currentPath}
                                    discoveredPaths={terminal.discoveredPaths}
                                    newlyRevealedFilePaths={newlyRevealedFilePaths}
                                />
                            </div>
                        )}
                    </section>
                </motion.aside>

                {/* CENTER: Terminal & Metadata */}
                <motion.div variants={slamUp} className="flex-1 flex flex-col gap-4 min-h-[450px] lg:min-h-0">
                    <div
                        className="w-full flex-1 relative min-h-0 bg-[#0A0A0A] border border-[#FF003C]/20 shadow-[0_0_40px_rgba(255,0,60,0.05)]"
                        style={{ clipPath: "polygon(20px 0, 100% 0, 100% 100%, 0 100%, 0 20px)" }}
                    >
                        <TerminalPanel
                            terminalRef={terminal.terminalRef}
                            currentPath={terminal.currentPath}
                            isReady={terminal.isReady}
                            isProcessing={terminal.isProcessingState}
                            hasNewDiscovery={hasNewDiscovery}
                        />
                    </div>

                    {/* Scenario Metadata Strip */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-[#0A0A0A] border border-white/5 shadow-[5px_5px_0px_#050505]">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-2 bg-[#00FFFF] animate-pulse shadow-[0_0_8px_#00FFFF]"></div>
                            <span className="font-sans text-[10px] text-[#00FFFF] font-bold tracking-[0.3em] uppercase">
                                {scenarioData?.scenario?.title || 'AWAITING_DATA...'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-sans text-[10px] text-white tracking-[0.2em] uppercase font-bold">
                            <span>MODE: <span className="text-white">{mode}</span></span>
                            <span>DIFF: <span className="text-white">{scenarioData?.scenario?.difficulty || '—'}</span></span>
                            <span>STEPS: <span className="text-[#FF003C]">{objectives.completedCount}/{objectives.totalRequired}</span></span>
                            
                            {/* EXIT BUTTON */}
                            <button
                                onClick={handleExitClick}
                                disabled={session.isLoading}
                                className="flex items-center gap-2 bg-[#FF003C]/10 border border-[#FF003C]/30 px-3 py-1 hover:bg-[#FF003C] hover:text-black transition-all duration-300 disabled:opacity-50 group skew-x-[-8deg]"
                            >
                                <span className="skew-x-[8deg] material-symbols-outlined text-[14px] text-[#FF003C] group-hover:text-black">logout</span>
                                <span className="skew-x-[8deg] text-[#FF003C] group-hover:text-black tracking-widest">EXIT</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT PANEL: Status, Hints, Objectives */}
                <motion.aside variants={slamRight} className="w-full lg:w-[22%] lg:xl:w-[24%] flex flex-col gap-4">

                    {/* Operative status */}
                    <section
                        className="bg-[#0A0A0A] p-4 border border-white/5 border-r-4 border-r-[#FF003C] shadow-[10px_10px_0px_#050505]"
                        style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)" }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-sans text-[10px] font-bold tracking-[0.3em] text-[#FF003C] uppercase">
                                OPERATIVE_STATUS
                            </h2>
                            <span className="material-symbols-outlined text-[#00FFFF] text-lg">shield</span>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between font-sans text-[9px] text-white tracking-[0.2em] uppercase mb-2">
                                    <span>COMPLETION_INDEX</span>
                                    <span className="text-[#FF003C] font-bold">{objectives.completionPercent}%</span>
                                </div>
                                <div className="h-1 bg-white/10 w-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#FF003C] transition-all duration-700 relative shadow-[0_0_10px_#FF003C]"
                                        style={{ width: `${objectives.completionPercent}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* AI HINT PANEL */}
                    <div className={`bg-[#0A0A0A] border border-white/5 shadow-[10px_10px_0px_#050505] flex flex-col overflow-hidden transition-all duration-300 ${activeRightPanel === 'oracle' ? 'flex-[1.5]' : 'flex-none'}`}>
                        <button onClick={() => setActiveRightPanel(p => p === 'oracle' ? null : 'oracle')} className="w-full flex justify-between items-center p-4 border-b border-white/5 bg-[#050505] hover:bg-white/5 transition-colors cursor-pointer text-left group">
                            <h2 className="font-sans text-[10px] font-bold tracking-[0.3em] text-[#00EBF7] uppercase flex items-center gap-3">
                                <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                                AI_ORACLE
                            </h2>
                            <span className="material-symbols-outlined text-[#00EBF7]/60 group-hover:text-[#00EBF7] transition-colors">
                                {activeRightPanel === 'oracle' ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {activeRightPanel === 'oracle' && (
                            <HintPanel
                                latestHint={hint.latestHint}
                                hints={hint.hints}
                                hintsRemaining={hint.hintsRemaining}
                                limitReached={hint.limitReached}
                                isLoading={hint.isLoading}
                                error={hint.error}
                                onRequestHint={hint.getHint}
                            />
                        )}
                    </div>

                    {/* OBJECTIVES PANEL */}
                    <div className={`bg-[#0D0D0D] border border-white/5 shadow-[10px_10px_0px_#050505] flex flex-col overflow-hidden transition-all duration-300 ${activeRightPanel === 'objectives' ? 'flex-[1.5]' : 'flex-none'}`}>
                        <button onClick={() => setActiveRightPanel(p => p === 'objectives' ? null : 'objectives')} className="w-full flex justify-between items-center p-4 border-b border-white/5 bg-[#050505] hover:bg-white/5 transition-colors cursor-pointer text-left group">
                            <h2 className="font-sans text-[10px] font-bold tracking-[0.3em] text-[#FF003C] uppercase flex items-center gap-3">
                                <span className="material-symbols-outlined text-[14px]">crisis_alert</span>
                                OBJECTIVES
                            </h2>
                            <span className="material-symbols-outlined text-[#FF003C]/60 group-hover:text-[#FF003C] transition-colors">
                                {activeRightPanel === 'objectives' ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {activeRightPanel === 'objectives' && (
                            <ObjectivesPanel
                                objectives={objectives.objectives}
                                completedCount={objectives.completedCount}
                                totalRequired={objectives.totalRequired}
                                completionPercent={objectives.completionPercent}
                                secretObjectives={objectives.secretObjectives}
                            />
                        )}
                    </div>

                </motion.aside>
            </motion.main>

            {/* ── MODALS ────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showExitModal && (
                    <ExitModal
                        onConfirm={handleConfirmAbandon}
                        onCancel={() => setShowExitModal(false)}
                    />
                )}
                {session.isCompleted && (
                    <CompletionOverlay evaluation={session.evaluation} />
                )}
            </AnimatePresence>
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const DISCOVERY_SEVERITY_STYLE = {
    awareness: { wrapper: 'border-l-2 border-[#00FFFF]/30 pl-3', text: 'text-[#00FFFF]/60' },
    inspection: { wrapper: 'border-l-2 border-[#00FFFF]/60 pl-3', text: 'text-[#00FFFF]/80' },
    confirmation: { wrapper: 'border-l-2 border-[#00FFFF] pl-3', text: 'text-[#00FFFF] font-bold' },
    analysis: { wrapper: 'border-l-4 border-[#00FFFF] pl-3', text: 'text-[#00FFFF] font-bold drop-shadow-[0_0_5px_#00FFFF]' },
};

function SystemLogEntry({ log }) {
    const isCritical = log.type === 'critical';
    const isDiscovery = log.type === 'discovery';
    const isAria = log.type === 'aria';

    if (isDiscovery) {
        const sev = log.severity || 'confirmation';
        const style = DISCOVERY_SEVERITY_STYLE[sev] || DISCOVERY_SEVERITY_STYLE.confirmation;
        return (
            <div className={`py-1 ${style.wrapper}`}>
                <div className={`flex gap-3 text-xs uppercase tracking-widest ${style.text}`}>
                    <span className="shrink-0 opacity-50">[{log.time}]</span>
                    <span>{log.message}</span>
                </div>
                {log.sub && (
                    <div className="text-[11px] mt-1 text-[#00FFFF]/50 tracking-widest">{log.sub}</div>
                )}
            </div>
        );
    }

    return (
        <div className={`py-1 ${isCritical ? 'border-l-2 border-[#FF003C] pl-3 bg-[#FF003C]/5' : isAria ? 'pl-3 italic' : 'pl-3'}`}>
            <div className={`flex gap-3 text-xs tracking-widest uppercase ${isCritical ? 'text-[#FF003C] font-bold' : isAria ? 'text-[#00FFFF]/50' : 'text-white'}`}>
                <span className="shrink-0 opacity-50">[{log.time}]</span>
                <span>{log.message}</span>
            </div>
            {log.sub && (
                <div className="text-[11px] mt-1 text-[#FF003C]/70 tracking-widest uppercase">{log.sub}</div>
            )}
        </div>
    );
}

function FileTree({ files, currentPath, discoveredPaths, newlyRevealedFilePaths }) {
    const norm = (p) => p ? p.replace(/\/+/g, '/').replace(/\/$/, '') || '/' : '/';
    const getParent = (p) => {
        const n = norm(p);
        if (n === '/') return '/';
        const idx = n.lastIndexOf('/');
        return idx === 0 ? '/' : n.slice(0, idx);
    };

    const discovered = discoveredPaths || new Set(['/']);
    const allDirs = new Set(['/']);

    (files || []).forEach(f => {
        if (!f.file_path) return;
        const parts = norm(f.file_path).split('/').filter(Boolean);
        for (let i = 1; i <= parts.length - 1; i++) allDirs.add('/' + parts.slice(0, i).join('/'));
        if (f.file_type === 'directory') allDirs.add(norm(f.file_path));
    });

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
                <div className={`flex items-center gap-2 py-1 font-sans text-xs uppercase tracking-widest ${isCurrent ? 'text-[#00FFFF] font-bold bg-[#00FFFF]/10' : 'text-white'}`} style={{ paddingLeft: `${indent + 8}px` }}>
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isCurrent ? 'folder_open' : 'folder'}
                    </span>
                    <span>{name}</span>
                    {isCurrent && <span className="text-[#00FFFF]/50 text-[8px] ml-2 animate-pulse">←_ACTIVE</span>}
                </div>

                <div style={{ marginLeft: `${indent + 14}px` }} className="border-l border-white/10 mt-1 mb-1">
                    {children.dirs.map(d => renderNode(d, depth + 1))}
                    {children.files.map(f => {
                        const fp = norm(f.file_path);
                        if (!discovered.has(fp)) return null;
                        const fname = f.file_name || fp.split('/').pop();
                        const isLog = f.file_type === 'log' || fname.endsWith('.log');
                        const isScript = fname.endsWith('.sh') || fname.endsWith('.py');
                        const isRevealed = newlyRevealedFilePaths?.has(f.file_path);
                        const isMalicious = f.evidence_tags?.some(t => ['malicious', 'malware'].includes(t));
                        const topTag = f.evidence_tags?.[0];

                        return (
                            <div key={f.virtual_file_id} className={`flex items-center gap-2 py-1 pl-3 font-sans text-[11px] tracking-widest transition-all ${isRevealed ? 'text-black bg-[#00FFFF] font-bold' : isMalicious ? 'text-[#FF003C]' : isLog ? 'text-yellow-500/80' : isScript ? 'text-[#00FFFF]/80' : 'text-white'}`}>
                                <span className="material-symbols-outlined text-[14px]">
                                    {isLog ? 'receipt_long' : isScript ? 'code' : 'draft'}
                                </span>
                                <span className="truncate">{fname}</span>
                                {topTag && (
                                    <span className={`text-[8px] px-1.5 py-0.5 border ${isMalicious ? 'border-[#FF003C] text-[#FF003C] bg-[#FF003C]/10' : 'border-white/20 text-white'}`}>
                                        {topTag}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-1">
            {renderNode('/')}
            {discovered.size <= 1 && (
                <div className="font-sans text-[11px] text-[#00FFFF]/40 uppercase tracking-widest mt-4 pl-4 animate-pulse">
                    AWAITING_SYSTEM_NAVIGATION...
                </div>
            )}
        </div>
    );
}

function ExitModal({ onConfirm, onCancel }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0A0A0A] border border-[#FF003C]/30 p-12 max-w-lg w-full relative shadow-[20px_20px_0px_rgba(255,0,60,0.15)]" style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)" }}>
                <div className="absolute top-0 right-0 w-32 h-2 bg-[#FF003C]"></div>

                <h2 className="text-4xl font-black italic text-[#FF003C] uppercase mb-6 tracking-tighter skew-x-[-5deg]">
                    ABORT_SESSION?
                </h2>
                <p className="font-body text-white leading-relaxed mb-10">
                    You are in <span className="text-[#FF003C] font-bold">TIMED MODE</span>. Terminating the uplink now will discard all temporary data. No score or XP will be awarded for this session.
                </p>
                <div className="flex flex-col gap-4">
                    <button onClick={onConfirm} className="w-full bg-[#FF003C] text-black font-black italic py-5 text-xl uppercase tracking-tighter skew-x-[-10deg] hover:bg-white transition-all shadow-[8px_8px_0px_#050505]">
                        <span className="skew-x-[10deg] block">CONFIRM ABANDON</span>
                    </button>
                    <button onClick={onCancel} className="w-full bg-transparent border-2 border-white/20 text-white font-black italic py-4 text-lg uppercase tracking-tighter skew-x-[-10deg] hover:border-[#00FFFF] hover:text-[#00FFFF] hover:bg-[#00FFFF]/10 transition-all">
                        <span className="skew-x-[10deg] block">RESUME OPERATION</span>
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function CompletionOverlay({ evaluation }) {
    const score = evaluation?.evaluation?.totalWeightedScore ?? 0;
    const xp = evaluation?.xpAwarded ?? 0;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-xl">
            <div className="text-center flex flex-col items-center">
                <motion.div initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="font-black text-[8rem] md:text-[12rem] italic text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 uppercase tracking-tighter leading-none skew-x-[-8deg] drop-shadow-[10px_10px_0px_rgba(0,255,255,0.2)] mb-4">
                    CLEARED
                </motion.div>

                <div className="bg-[#0A0A0A] border border-[#00FFFF]/30 p-8 shadow-[15px_15px_0px_#050505] skew-x-[-5deg] min-w-[400px]">
                    <div className="font-sans text-[10px] text-[#00FFFF] font-bold tracking-[0.4em] uppercase mb-4 skew-x-[5deg]">
                        FINAL_EVALUATION
                    </div>
                    <div className="font-black italic text-7xl text-white skew-x-[5deg] mb-2">
                        {score}<span className="text-3xl text-white">/100</span>
                    </div>
                    <div className="font-sans text-sm text-[#00FFFF] tracking-widest font-bold skew-x-[5deg] bg-[#00FFFF]/10 py-2 mt-4">
                        +{xp} XP AWARDED
                    </div>
                </div>

                <div className="mt-12 font-sans text-[10px] text-white tracking-[0.4em] uppercase font-bold animate-pulse">
                    RE-ESTABLISHING HUB UPLINK...
                </div>
            </div>
        </motion.div>
    );
}

function BootScreen() {
    return (
        <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center text-white">
            <div className="flex gap-2 mb-8">
                {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                        key={i}
                        animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                        className="w-2 h-12 bg-[#FF003C] origin-bottom skew-x-[-10deg]"
                    ></motion.div>
                ))}
            </div>
            <span className="font-sans font-bold text-[10px] text-[#FF003C] tracking-[0.5em] uppercase animate-pulse">
                INITIALIZING_BREACH_PROTOCOL...
            </span>
        </div>
    );
}

function ErrorScreen({ error, onBack }) {
    return (
        <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
            <span className="material-symbols-outlined text-[#FF003C] text-[8rem] mb-6 drop-shadow-[0_0_30px_rgba(255,0,60,0.5)]">gpp_bad</span>
            <div className="text-5xl font-black italic text-[#FF003C] uppercase tracking-tighter skew-x-[-5deg] mb-6">
                SYSTEM_FAILURE
            </div>
            <p className="font-sans text-xs text-white tracking-[0.2em] uppercase max-w-lg leading-loose bg-white/5 p-6 border border-white/10 mb-10">
                {error}
            </p>
            <button onClick={onBack} className="bg-transparent border-2 border-white/20 text-white font-black italic py-4 px-10 text-xl uppercase tracking-tighter skew-x-[-10deg] hover:border-[#00FFFF] hover:text-[#00FFFF] hover:bg-[#00FFFF]/10 transition-all">
                <span className="skew-x-[10deg] block">RETURN TO BASE</span>
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