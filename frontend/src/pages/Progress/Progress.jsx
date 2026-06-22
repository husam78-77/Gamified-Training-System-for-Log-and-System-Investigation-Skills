import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProgression } from '../../context/ProgressionContext';
import { motion } from 'framer-motion';
import './Progress.css';

// ─── Google Font: Rajdhani (readable, clear, military-tech) ──────────────────
const rajdhaniLink = document.createElement('link');
rajdhaniLink.rel = 'stylesheet';
rajdhaniLink.href = 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap';
document.head.appendChild(rajdhaniLink);
// ─── Utilities ───────────────────────────────────────────────────────────────

const getGrade = (score) => {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
};

const RANK_COLORS = {
    TRAINEE: '#ffffff',
    OPERATIVE: '#00FFFF',
    INFILTRATOR: '#FF003C',
    PHANTOM: '#FF003C',
    MASTER_NODE: '#00FFFF',
};

const getRankColor = (rank) => RANK_COLORS[rank?.toUpperCase()] || '#FF003C';

// --- Kinetic Animation Variants ---
const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const slamUp = {
    hidden: { opacity: 0, y: 40, skewX: "5deg" },
    show: { opacity: 1, y: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
};

const slamLeft = {
    hidden: { opacity: 0, x: -60, skewX: "10deg" },
    show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const MetricCard = ({ label, value, sub, icon, accent, suffix = '' }) => (
    <motion.div variants={slamUp} className="bg-[#0A0A0A] p-6 relative flex flex-col justify-between border border-white/5 shadow-[5px_5px_0px_rgba(0,0,0,0.5)] group" style={{ clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)" }}>
        <div className={`absolute top-0 left-0 w-1 h-full ${accent === 'primary' ? 'bg-[#FF003C]' : 'bg-[#00FFFF]'} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
        <div className="flex justify-between items-start mb-6">
            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 }} className="text-[11px] text-white/70 tracking-[0.18em] uppercase">{label}</span>
            <span className={`material-symbols-outlined text-2xl ${accent === 'primary' ? 'text-[#FF003C]' : 'text-[#00FFFF]'} drop-shadow-[0_0_8px_currentColor]`}>{icon}</span>
        </div>
        <div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }} className="text-4xl text-white tracking-wide mb-1">
                {value}<span className="text-xl text-white/40 ml-1">{suffix}</span>
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 500 }} className="text-[11px] text-white/50 tracking-widest uppercase">{sub}</div>
        </div>
    </motion.div>
);

const AchievementBadge = ({ achievement, index }) => {
    const { name, description, icon, unlocked } = achievement;
    return (
        <motion.div
            variants={slamUp}
            className={`relative p-5 flex flex-col items-center text-center transition-all duration-500 hover:-translate-y-2 ${unlocked ? 'bg-[#0A0A0A] border border-[#00FFFF]/30 shadow-[0_0_20px_rgba(0,255,255,0.05)]' : 'bg-[#050505] border border-white/5 grayscale opacity-50'}`}
            style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
        >
            <div className={`w-14 h-14 flex items-center justify-center mb-4 skew-x-[-10deg] ${unlocked ? 'bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/50 shadow-[0_0_15px_#00FFFF]' : 'bg-white/5 text-white/20 border border-white/10'}`}>
                <span className="material-symbols-outlined text-3xl skew-x-[10deg]">{unlocked ? icon : 'lock'}</span>
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }} className={`text-sm uppercase tracking-wide mb-2 ${unlocked ? 'text-white' : 'text-white/40'}`}>
                {unlocked ? name : '██████_███████'}
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 500 }} className="text-[11px] text-white/50 tracking-wide uppercase leading-relaxed">
                {unlocked ? description : 'REQUIREMENTS NOT MET'}
            </div>
        </motion.div>
    );
};

const TimelineMilestone = ({ milestone, index }) => {
    const { rank, xpRequired, description, status } = milestone;
    const isRight = index % 2 === 1;

    const activeColor = '#FF003C';
    const completedColor = '#00FFFF';

    return (
        <motion.div variants={slamUp} className={`relative flex items-center md:justify-center ${status === 'active' ? 'z-20' : 'z-10'}`}>
            {/* Diamond node */}
            <div className={`absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 z-10 transition-colors ${status === 'active' ? 'bg-[#FF003C] shadow-[0_0_15px_#FF003C]' : status === 'completed' ? 'bg-[#00FFFF]' : 'bg-[#0A0A0A] border border-white/20'}`}>
                {status === 'active' && (
                    <div className="absolute inset-[-6px] border border-[#FF003C] rotate-0 animate-ping" />
                )}
            </div>

            {/* Content — alternates left/right on desktop */}
            <div className={`ml-14 md:ml-0 md:w-[44%] w-full ${isRight ? 'md:pl-16 md:ml-auto text-left' : 'md:pr-16 md:text-right'}`}>
                <div className={`bg-[#0A0A0A] p-6 border transition-all duration-300 ${status === 'active' ? 'border-[#FF003C] shadow-[10px_10px_0px_#050505]' : status === 'completed' ? 'border-[#00FFFF]/30 hover:border-[#00FFFF]/60' : 'border-white/5 opacity-60'}`} style={{ clipPath: isRight ? "polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)" : "polygon(15px 0, 100% 0, 100% 100%, 0 100%, 0 15px)" }}>
                    <p className={`font-tag font-bold text-[9px] tracking-[0.3em] uppercase mb-2 ${status === 'active' ? 'text-[#FF003C]' : status === 'completed' ? 'text-[#00FFFF]' : 'text-white/20'}`}>
                        {status === 'completed' ? 'COMPLETED' : status === 'active' ? 'ACTIVE_PHASE' : '[ CLASSIFIED ]'}
                    </p>

                    <h4 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }} className={`text-3xl uppercase tracking-wide mb-2 ${status === 'locked' ? 'text-white/10' : 'text-white'}`}>
                        {status === 'locked' ? '████████' : rank}
                    </h4>

                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 500 }} className="text-[12px] text-white/50 tracking-widest mb-3">
                        {xpRequired.toLocaleString()} XP REQUIRED
                    </p>

                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 500 }} className={`text-[12px] leading-relaxed uppercase tracking-wide ${status === 'locked' ? 'text-white/10' : 'text-white/60'}`}>
                        {status === 'locked' ? 'CLASSIFIED UNTIL RANK ACHIEVED' : description}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

const MissionArchiveCard = ({ mission }) => {
    const grade = getGrade(mission.score);
    const evidencePct = mission.totalEvidence > 0 ? Math.round((mission.evidenceFound / mission.totalEvidence) * 100) : 0;
    const gradeColor = grade === 'S' || grade === 'A' ? 'text-[#00FFFF]' : grade === 'B' || grade === 'C' ? 'text-white' : 'text-[#FF003C]';

    return (
        <motion.div variants={slamLeft} className="group relative bg-[#0A0A0A] border border-white/5 flex flex-col lg:flex-row items-stretch transition-transform hover:translate-x-2 shadow-[5px_5px_0px_#050505]">
            <div className={`w-2 shrink-0 ${mission.missionCompleted ? 'bg-[#00FFFF]' : 'bg-[#FF003C]'}`}></div>

            {/* Left: codename + title + difficulty */}
            <div className="flex-1 p-6 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
                <p className="font-tag text-[10px] text-white/40 tracking-[0.2em] uppercase mb-1">{mission.codename}</p>
                <p className="font-black italic text-xl text-white uppercase tracking-tighter truncate mb-2">{mission.scenarioTitle}</p>
                <div>
                    <span className={`inline-block font-tag text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest ${mission.difficulty === 'hard' ? 'bg-[#FF003C]/20 text-[#FF003C]' : 'bg-white/10 text-white/60'}`}>
                        {mission.difficulty?.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Centre: stats row */}
            <div className="flex-[2] grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-[#050505]/50 items-center">
                <div className="flex flex-col justify-center">
                    <span className="font-tag text-[9px] text-white/30 tracking-widest uppercase mb-1">GRADE</span>
                    <span className={`font-black italic text-3xl skew-x-[-10deg] ${gradeColor} drop-shadow-[0_0_8px_currentColor]`}>{grade}</span>
                </div>
                <div className="flex flex-col justify-center">
                    <span className="font-tag text-[9px] text-white/30 tracking-widest uppercase mb-1">SCORE</span>
                    <span className="font-sans font-bold text-white tracking-widest text-lg">{mission.score}</span>
                </div>
                <div className="flex flex-col justify-center">
                    <span className="font-tag text-[9px] text-white/30 tracking-widest uppercase mb-1">EVIDENCE</span>
                    <span className="font-sans font-bold text-white tracking-widest text-lg">{evidencePct}%</span>
                </div>
                <div className="flex flex-col justify-center">
                    <span className="font-tag text-[9px] text-white/30 tracking-widest uppercase mb-1">TIME</span>
                    <span className="font-sans font-bold text-white tracking-widest text-lg">
                        {mission.completionTimeMinutes ? `${Math.round(mission.completionTimeMinutes)}m` : '—'}
                    </span>
                </div>
                <div className="flex flex-col justify-center">
                    <span className="font-tag text-[9px] text-white/30 tracking-widest uppercase mb-1">HINTS</span>
                    <span className={`font-sans font-bold tracking-widest text-lg ${mission.hintsUsed === 0 ? 'text-[#00FFFF]' : 'text-white'}`}>
                        {mission.hintsUsed}
                    </span>
                </div>
            </div>

            {/* Right: completion badge */}
            <div className="px-6 py-4 lg:py-0 flex items-center justify-center bg-[#0D0D0D]">
                <div className={`font-tag font-bold text-[10px] tracking-[0.2em] uppercase px-4 py-2 border ${mission.missionCompleted ? 'border-[#00FFFF] text-[#00FFFF] shadow-[inset_0_0_10px_rgba(0,255,255,0.2)]' : 'border-[#FF003C] text-[#FF003C] bg-[#FF003C]/10'}`}>
                    {mission.missionCompleted ? 'COMPLETE' : 'PARTIAL'}
                </div>
            </div>
        </motion.div>
    );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const LoadingState = () => (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-sans">
        <span className="material-symbols-outlined text-6xl text-[#00FFFF] animate-spin mb-4">settings</span>
        <p className="text-[10px] tracking-[0.4em] text-[#00FFFF] uppercase font-bold animate-pulse">DECRYPTING_DOSSIER...</p>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvestigatorProgress() {
    const { token } = useAuth();
    const { progression: data, loading, error } = useProgression();
    const [xpAnimated, setXpAnimated] = useState(false);

    // Trigger XP bar fill after data arrives
    useEffect(() => {
        if (!data) return;
        const t = setTimeout(() => setXpAnimated(true), 500);
        return () => clearTimeout(t);
    }, [data]);

    if (loading) return <LoadingState />;

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-sans">
                <span className="material-symbols-outlined text-6xl text-[#FF003C] mb-4">warning</span>
                <p className="text-[10px] tracking-[0.4em] text-[#FF003C] uppercase font-bold">{error || 'SIGNAL_LOST'}</p>
            </div>
        );
    }

    const { identity, metrics, missionArchive, achievements, investigationStyle, rankTimeline } = data;
    const rankColor = getRankColor(identity.rank);
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    // Unified XP Logic
    const currentLevel = identity.level || 1;
    const currentXp = identity.xp || 0;
    const targetXp = currentLevel * 1000;
    const xpPercent = Math.round(Math.min(100, Math.max(0, (currentXp / targetXp) * 100)));

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#FF003C] selection:text-white relative flex flex-col">

            {/* ==========================================
                THE VOID: Tactical Background & Grid
                ========================================== */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:8rem_8rem]"></div>
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#00FFFF]/5 blur-[120px] rounded-full mix-blend-screen"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] opacity-90"></div>
            </div>

            <main className="relative z-20 flex-1 w-full max-w-[1600px] mx-auto px-6 md:px-12 pt-12 md:pt-20 pb-32">
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-24">

                    {/* ════════════════════════════════════════════════════
                        SECTION 1 — INVESTIGATOR IDENTITY HERO
                    ════════════════════════════════════════════════════ */}
                    <motion.section variants={slamUp} className="relative w-full">
                        {/* Top bar */}
                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-white animate-pulse" />
                                <span className="font-tag font-bold text-[10px] tracking-[0.3em] text-white/40 uppercase">
                                    CLASSIFIED_DOSSIER
                                </span>
                            </div>
                            <div className={`font-tag text-[10px] font-bold px-4 py-1.5 uppercase tracking-widest skew-x-[-10deg] ${identity.operationalStatus === 'ACTIVE_DUTY' ? 'bg-[#00FFFF] text-black shadow-[4px_4px_0px_#050505]' : 'bg-white/10 text-white'}`}>
                                <span className="skew-x-[10deg] block">{identity.operationalStatus}</span>
                            </div>
                        </div>

                        {/* Hero body */}
                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-12">
                            {/* ── Left: username + rank ── */}
                            <div className="flex-1">
                                <p className="font-tag font-bold text-[10px] tracking-[0.35em] text-[#FF003C] uppercase mb-4">
                                    INVESTIGATOR_IDENTITY
                                </p>
                                <h1 className="font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-[4px_4px_0px_#FF003C] skew-x-[-6deg] mb-6" style={{ fontSize: 'clamp(2.5rem, 8vw, 6.5rem)' }}>
                                    {identity.username}
                                </h1>

                                <div className="flex flex-wrap items-center gap-4">
                                    {/* Rank badge */}
                                    <div className="inline-flex items-center gap-3 px-5 py-2 border bg-[#0A0A0A] skew-x-[-10deg]" style={{ borderColor: `${rankColor}40` }}>
                                        <span className="font-tag font-bold text-[9px] tracking-[0.2em] text-white/40 uppercase skew-x-[10deg]">
                                            RANK:
                                        </span>
                                        <span className="font-black italic text-2xl uppercase tracking-tighter skew-x-[10deg]" style={{ color: rankColor, textShadow: `0 0 14px ${rankColor}66` }}>
                                            {identity.rank}
                                        </span>
                                    </div>

                                    {/* Clearance */}
                                    <div className="px-5 py-2 border border-[#00FFFF]/20 bg-[#00FFFF]/5 skew-x-[-10deg]">
                                        <span className="font-tag font-bold text-[9px] tracking-[0.2em] text-white/40 uppercase skew-x-[10deg] mr-2">
                                            CLEARANCE:
                                        </span>
                                        <span className="font-black italic text-xl text-[#00FFFF] uppercase tracking-tighter skew-x-[10deg]">
                                            {identity.clearanceTier}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Right: Level + XP bar ── */}
                            <div className="w-full lg:w-[450px] shrink-0">
                                <div className="flex items-baseline gap-3 mb-4">
                                    <span className="font-tag font-bold text-[10px] tracking-[0.2em] text-white/40 uppercase">LVL</span>
                                    <span className="font-black italic leading-none tracking-tighter" style={{ fontSize: 'clamp(3.5rem, 6vw, 5rem)', color: '#FF003C', textShadow: '0 0 30px rgba(255,0,60,0.45)' }}>
                                        {identity.level}
                                    </span>
                                </div>

                                {/* XP block */}
                                <div>
                                    <div className="flex justify-between items-end mb-3 font-tag font-bold text-[10px] tracking-[0.2em] uppercase">
                                        <span className="text-white/40">XP_PROGRESSION</span>
                                        <span style={{ color: rankColor }}>{xpPercent}%</span>
                                    </div>

                                    {/* Track */}
                                    <div className="h-8 bg-[#0A0A0A] border border-white/10 shadow-[5px_5px_0px_#050505] overflow-hidden skew-x-[-15deg] mb-3">
                                        <div
                                            className="h-full relative overflow-hidden transition-all duration-1000 ease-out"
                                            style={{ width: xpAnimated ? `${xpPercent}%` : '0%', backgroundColor: rankColor, boxShadow: `0 0 20px ${rankColor}` }}
                                        >
                                            <div className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between font-tag font-bold text-[9px] tracking-[0.15em] uppercase">
                                        <span className="text-white/30">0 XP</span>
                                        <span className="text-white">{currentXp.toLocaleString()} XP</span>
                                        <span className="text-white/30">{targetXp.toLocaleString()} XP</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* ════════════════════════════════════════════════════
                        SECTION 2 — INVESTIGATION METRICS
                    ════════════════════════════════════════════════════ */}
                    <motion.section variants={slamUp}>
                        <div className="flex items-center gap-4 mb-10">
                            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white skew-x-[-8deg]">INVESTIGATION_METRICS</h2>
                            <div className="h-1 flex-1 bg-gradient-to-r from-[#00FFFF] to-transparent skew-x-[-8deg]"></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard label="MISSIONS_COMPLETED" value={`${metrics.missionsCompleted}/${metrics.totalMissions}`} sub={`${metrics.completionRate}% COMPLETION RATE`} icon="task_alt" accent="primary" />
                            <MetricCard label="EVIDENCE_RECOVERED" value={`${metrics.hiddenEvidenceFound}/${metrics.totalHiddenEvidence}`} sub={`${metrics.evidenceRecoveryRate}% RECOVERY RATE`} icon="find_in_page" accent="secondary" />
                            <MetricCard label="INVESTIGATION_ACCURACY" value={metrics.avgScore} sub="AVG SCORE ACROSS MISSIONS" icon="analytics" accent="primary" suffix="%" />
                            <MetricCard label="COMMANDS_EXECUTED" value={metrics.totalCommandsExecuted.toLocaleString()} sub="TOTAL TERMINAL OPERATIONS" icon="terminal" accent="secondary" />
                            <MetricCard label="AVG_COMPLETION" value={metrics.avgCompletionMinutes || '—'} sub="MINUTES PER INVESTIGATION" icon="timer" accent="primary" suffix={metrics.avgCompletionMinutes ? 'm' : ''} />
                            <MetricCard label="DISCOVERY_RATE" value={metrics.discoveryCompletionRate} sub="FULL DISCOVERY SESSIONS" icon="search" accent="secondary" suffix="%" />
                            <MetricCard label="AI_DEPENDENCY" value={metrics.aiDependencyRate} sub="HINT USAGE RATE" icon="smart_toy" accent={metrics.aiDependencyRate > 50 ? 'primary' : 'secondary'} suffix="%" />
                            <MetricCard label="SILENT_OPERATIONS" value={metrics.noHintMissions} sub="HINT-FREE COMPLETIONS" icon="visibility_off" accent="primary" />
                        </div>
                    </motion.section>

                    {/* ════════════════════════════════════════════════════
                        SECTION 3 — INVESTIGATION STYLE + RANK CARD
                    ════════════════════════════════════════════════════ */}
                    <motion.section variants={slamLeft}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Investigation Style Card — 2/3 width */}
                            <div className="lg:col-span-2 bg-[#0A0A0A] border border-white/5 p-8 md:p-12 shadow-[15px_15px_0px_rgba(0,0,0,0.8)] relative" style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)" }}>
                                <div className="absolute top-0 right-0 w-24 h-1 bg-[#00FFFF]"></div>
                                <p className="font-tag font-bold text-[10px] tracking-[0.3em] text-[#00FFFF] uppercase mb-4">
                                    INVESTIGATOR_PROFILE
                                </p>
                                <div className="font-black italic uppercase tracking-tighter leading-none text-white text-5xl md:text-6xl mb-3 drop-shadow-[2px_2px_0px_#00FFFF]">
                                    {investigationStyle.archetype}
                                </div>
                                <p className="font-black italic uppercase tracking-widest text-xl text-[#00FFFF] mb-6">
                                    {investigationStyle.classification}
                                </p>
                                <p className="font-sans text-sm text-white/60 leading-relaxed max-w-[60ch] mb-8">
                                    {investigationStyle.description}
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {investigationStyle.traits.map(t => (
                                        <span key={t} className="font-tag text-[9px] uppercase tracking-[0.2em] border border-white/10 bg-white/5 px-4 py-2 text-white/70">{t}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Rank Card — 1/3 width */}
                            <div className="bg-[#050505] p-8 md:p-12 border-t-8 shadow-[15px_15px_0px_rgba(0,0,0,0.8)] flex flex-col justify-center" style={{ borderColor: rankColor }}>
                                <p className="font-tag font-bold text-[10px] tracking-[0.3em] text-white/40 uppercase mb-4">
                                    CURRENT_RANK
                                </p>
                                <div className="font-black italic uppercase tracking-tighter text-4xl leading-none mb-6" style={{ color: rankColor, textShadow: `0 0 18px ${rankColor}55` }}>
                                    {identity.rank}
                                </div>
                                <div className="flex items-baseline gap-3 mb-6">
                                    <span className="font-tag font-bold text-xs tracking-[0.2em] text-white/40 uppercase">LVL</span>
                                    <span className="font-black italic text-6xl leading-none text-white tracking-tighter">
                                        {identity.level}
                                    </span>
                                </div>
                                <div className="inline-block px-4 py-2 border border-[#00FFFF]/30 bg-[#00FFFF]/10 skew-x-[-10deg] self-start">
                                    <span className="font-tag font-bold text-[10px] tracking-[0.2em] text-[#00FFFF] uppercase skew-x-[10deg] block">
                                        {identity.clearanceTier}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* ════════════════════════════════════════════════════
                        SECTION 4 — CLASSIFIED ACHIEVEMENTS
                    ════════════════════════════════════════════════════ */}
                    <motion.section variants={slamUp}>
                        <div className="flex items-center gap-4 mb-10">
                            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white skew-x-[-8deg]">CLASSIFIED_ACHIEVEMENTS</h2>
                            <span className="font-tag font-bold text-[10px] tracking-[0.2em] text-[#00FFFF] uppercase bg-[#00FFFF]/10 border border-[#00FFFF]/30 px-3 py-1 skew-x-[-8deg]">
                                <span className="skew-x-[8deg] block">{unlockedCount}/{achievements.length} UNLOCKED</span>
                            </span>
                            <div className="h-1 flex-1 bg-gradient-to-r from-[#00FFFF] to-transparent skew-x-[-8deg]"></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {achievements.map((a, i) => (
                                <AchievementBadge key={a.id} achievement={a} index={i} />
                            ))}
                        </div>
                    </motion.section>

                    {/* ════════════════════════════════════════════════════
                        SECTION 5 — RANK MILESTONE TIMELINE
                    ════════════════════════════════════════════════════ */}
                    <motion.section variants={slamUp}>
                        <div className="flex items-center gap-4 mb-14">
                            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white skew-x-[-8deg]">RANK_MILESTONES</h2>
                            <div className="h-1 flex-1 bg-gradient-to-r from-white/20 to-transparent skew-x-[-8deg]"></div>
                        </div>

                        <div className="relative">
                            {/* Vertical spine */}
                            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#FF003C] via-[#00FFFF] to-white/10 -translate-x-1/2" />

                            <div className="space-y-16">
                                {rankTimeline.map((m, i) => (
                                    <TimelineMilestone key={m.rank} milestone={m} index={i} />
                                ))}
                            </div>
                        </div>
                    </motion.section>

                    {/* ════════════════════════════════════════════════════
                        SECTION 6 — MISSION ARCHIVE
                    ════════════════════════════════════════════════════ */}
                    <motion.section variants={slamUp}>
                        <div className="flex items-center gap-4 mb-10">
                            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white skew-x-[-8deg]">MISSION_ARCHIVE</h2>
                            <span className="font-tag font-bold text-[10px] tracking-[0.2em] text-white/40 uppercase bg-[#0A0A0A] border border-white/5 px-3 py-1 skew-x-[-8deg]">
                                <span className="skew-x-[8deg] block">{missionArchive.length} OPERATION{missionArchive.length !== 1 ? 'S' : ''} LOGGED</span>
                            </span>
                            <div className="h-1 flex-1 bg-gradient-to-r from-white/20 to-transparent skew-x-[-8deg]"></div>
                        </div>

                        {missionArchive.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-4 py-24 bg-[#0A0A0A] border border-white/5 shadow-[10px_10px_0px_#050505]">
                                <span className="material-symbols-outlined text-6xl text-white/10">folder_open</span>
                                <p className="font-tag font-bold text-xs tracking-[0.3em] text-[#FF003C] uppercase">
                                    NO_OPERATIONS_LOGGED
                                </p>
                                <p className="font-sans text-sm text-white/40">
                                    Complete your first mission to begin constructing your archive.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {missionArchive.map(m => (
                                    <MissionArchiveCard key={m.sessionId} mission={m} />
                                ))}
                            </div>
                        )}
                    </motion.section>

                </motion.div>
            </main>
        </div>
    );
}