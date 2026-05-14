import React from 'react';
import { motion } from 'framer-motion';

// Animation variants
export const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } } };
export const slamUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

// Rank colors
const RC = { TRAINEE: '#fff', OPERATIVE: '#00EBF7', INFILTRATOR: '#FF003C', PHANTOM: '#FF003C', MASTER_NODE: '#00EBF7' };
export const getRankColor = (r) => RC[r?.toUpperCase()] || '#FF003C';

// Grade helper
export const getGrade = (s) => s >= 90 ? 'S' : s >= 80 ? 'A' : s >= 70 ? 'B' : s >= 60 ? 'C' : 'D';

// Status evaluation for metrics
const getStatus = (label, val) => {
    if (label === 'AI_DEPENDENCY') return val > 60 ? { t: 'OVER-RELIANT', c: '#FF003C' } : val > 30 ? { t: 'MODERATE', c: '#FFD700' } : { t: 'SELF-RELIANT', c: '#00EBF7' };
    if (label === 'ACCURACY') return val >= 90 ? { t: 'ELITE PERFORMANCE', c: '#00EBF7' } : val >= 70 ? { t: 'FIELD READY', c: '#FFD700' } : { t: 'NEEDS IMPROVEMENT', c: '#FF003C' };
    if (label === 'EVIDENCE') return val >= 80 ? { t: 'THOROUGH', c: '#00EBF7' } : val >= 50 ? { t: 'PARTIAL SWEEP', c: '#FFD700' } : { t: 'INCOMPLETE', c: '#FF003C' };
    if (label === 'DISCOVERY') return val >= 70 ? { t: 'DEEP RECON', c: '#00EBF7' } : val >= 40 ? { t: 'SURFACE SCAN', c: '#FFD700' } : { t: 'MINIMAL', c: '#FF003C' };
    return null;
};

// ─── MetricCard ───────────────────────────────────────────────────
export const MetricCard = ({ label, value, sub, icon, accent, suffix = '', statusKey, statusVal }) => {
    const status = statusKey ? getStatus(statusKey, statusVal ?? 0) : null;
    const isPrimary = accent === 'primary';
    const accentColor = isPrimary ? '#FF003C' : '#00EBF7';
    return (
        <motion.div variants={slamUp}
            className="bg-[#0A0A0A] p-5 relative flex flex-col justify-between border border-white/5 group hover:-translate-y-1 transition-transform"
            style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)" }}>
            <div className="absolute top-0 left-0 w-1 h-full opacity-40 group-hover:opacity-100 transition-opacity" style={{ background: accentColor }} />
            <div className="flex justify-between items-start mb-4">
                <span className="font-label text-[9px] text-white/50 tracking-[0.2em] font-bold uppercase">{label}</span>
                <span className="material-symbols-outlined text-xl opacity-60" style={{ color: accentColor }}>{icon}</span>
            </div>
            <div>
                <div className="font-black italic text-3xl text-white tracking-tighter skew-x-[-5deg] mb-1">
                    {value}<span className="text-lg text-white/30 ml-1">{suffix}</span>
                </div>
                <div className="font-label text-[8px] text-white/30 tracking-widest uppercase">{sub}</div>
                {status && (
                    <div className="mt-2 font-label text-[8px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 inline-block border"
                        style={{ color: status.c, borderColor: `${status.c}40`, background: `${status.c}10` }}>
                        {status.t}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// ─── AchievementBadge ─────────────────────────────────────────────
export const AchievementBadge = ({ achievement }) => {
    const { name, description, icon, unlocked } = achievement;
    return (
        <motion.div variants={slamUp}
            className={`relative p-4 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 ${unlocked
                ? 'bg-[#0A0A0A] border border-[#00EBF7]/20'
                : 'bg-[#050505] border border-white/5 grayscale opacity-40'}`}
            style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}>
            {unlocked && <div className="absolute inset-0 animate-[achievePulse_3s_ease-in-out_infinite]" />}
            <div className={`w-12 h-12 flex items-center justify-center mb-3 skew-x-[-8deg] ${unlocked
                ? 'bg-[#00EBF7]/10 text-[#00EBF7] border border-[#00EBF7]/40'
                : 'bg-white/5 text-white/15 border border-white/10'}`}>
                <span className="material-symbols-outlined text-2xl skew-x-[8deg]">{unlocked ? icon : 'lock'}</span>
            </div>
            <div className={`font-black italic text-xs uppercase tracking-tighter mb-1 ${unlocked ? 'text-white' : 'text-white/25'}`}>
                {unlocked ? name : '██████'}
            </div>
            <div className="font-label text-[8px] text-white/35 tracking-widest uppercase leading-relaxed">
                {unlocked ? description : 'CLASSIFIED'}
            </div>
        </motion.div>
    );
};

// ─── MissionArchiveCard ───────────────────────────────────────────
export const MissionArchiveCard = ({ mission }) => {
    const grade = getGrade(mission.score);
    const evPct = mission.totalEvidence > 0 ? Math.round((mission.evidenceFound / mission.totalEvidence) * 100) : 0;
    const gc = grade === 'S' ? '#FFD700' : grade === 'A' ? '#00EBF7' : grade === 'B' ? '#00EBF7' : '#FF003C';
    const completed = mission.missionCompleted;
    return (
        <motion.div variants={slamUp}
            className="group relative bg-[#0A0A0A] border border-white/5 flex flex-col lg:flex-row items-stretch transition-all hover:border-white/10">
            <div className={`w-1.5 shrink-0 ${completed ? 'bg-[#00EBF7]' : 'bg-[#FF003C]'}`} />
            <div className="flex-1 p-5 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/5">
                <p className="font-label text-[9px] text-white/30 tracking-[0.2em] uppercase mb-1">{mission.codename}</p>
                <p className="font-black italic text-lg text-white uppercase tracking-tighter truncate mb-1.5">{mission.scenarioTitle}</p>
                <span className={`inline-block self-start font-label text-[8px] font-bold px-2 py-0.5 uppercase tracking-widest ${mission.difficulty === 'hard' ? 'bg-[#FF003C]/15 text-[#FF003C]' : 'bg-white/5 text-white/50'}`}>
                    {mission.difficulty?.toUpperCase()}
                </span>
            </div>
            <div className="flex-[2] grid grid-cols-3 md:grid-cols-5 gap-3 p-5 items-center">
                {[
                    ['GRADE', <span className="font-black italic text-2xl" style={{ color: gc }}>{grade}</span>],
                    ['SCORE', <span className="font-label font-bold text-white text-base">{mission.score}</span>],
                    ['EVIDENCE', <span className="font-label font-bold text-white text-base">{evPct}%</span>],
                    ['TIME', <span className="font-label font-bold text-white text-base">{mission.completionTimeMinutes ? `${Math.round(mission.completionTimeMinutes)}m` : '—'}</span>],
                    ['HINTS', <span className={`font-label font-bold text-base ${mission.hintsUsed === 0 ? 'text-[#00EBF7]' : 'text-white'}`}>{mission.hintsUsed}</span>],
                ].map(([l, v]) => (
                    <div key={l} className="flex flex-col">
                        <span className="font-label text-[8px] text-white/25 tracking-widest uppercase mb-1">{l}</span>
                        {v}
                    </div>
                ))}
            </div>
            <div className="px-5 py-3 flex items-center justify-center">
                <div className={`font-label font-bold text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border ${completed
                    ? 'border-[#00EBF7]/40 text-[#00EBF7] bg-[#00EBF7]/5'
                    : 'border-[#FF003C]/40 text-[#FF003C] bg-[#FF003C]/5'}`}>
                    {completed ? 'CASE CLOSED' : 'UNRESOLVED'}
                </div>
            </div>
        </motion.div>
    );
};

// ─── Active Objectives ────────────────────────────────────────────
const OBJECTIVES = [
    { id: 1, title: 'Complete 3 missions without hints', icon: 'visibility_off', check: (m) => m.filter(s => s.hintsUsed === 0 && s.missionCompleted).length, target: 3, reward: '+500 XP', diff: 'HARD' },
    { id: 2, title: 'Achieve 90% investigation accuracy', icon: 'analytics', check: (_, met) => met.avgScore, target: 90, reward: 'ELITE STATUS', diff: 'EXPERT', suffix: '%' },
    { id: 3, title: 'Recover all evidence in a mission', icon: 'search', check: (m) => m.filter(s => s.totalEvidence > 0 && s.evidenceFound >= s.totalEvidence).length, target: 1, reward: '+300 XP', diff: 'MEDIUM' },
    { id: 4, title: 'Execute 100 terminal commands', icon: 'terminal', check: (_, met) => met.totalCommandsExecuted, target: 100, reward: 'BADGE', diff: 'EASY' },
    { id: 5, title: 'Complete a hard difficulty mission', icon: 'warning', check: (m) => m.filter(s => s.difficulty === 'hard' && s.missionCompleted).length, target: 1, reward: '+400 XP', diff: 'HARD' },
];

export const ActiveObjectives = ({ missions, metrics }) => (
    <div className="space-y-3">
        {OBJECTIVES.map(obj => {
            const current = Math.min(obj.check(missions, metrics), obj.target);
            const pct = Math.round((current / obj.target) * 100);
            const done = pct >= 100;
            const diffColor = obj.diff === 'EXPERT' ? '#FF003C' : obj.diff === 'HARD' ? '#FFD700' : obj.diff === 'MEDIUM' ? '#00EBF7' : '#fff';
            return (
                <motion.div key={obj.id} variants={slamUp}
                    className={`bg-[#0A0A0A] border p-4 transition-all ${done ? 'border-[#00EBF7]/20 bg-[#00EBF7]/[0.02]' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined text-base ${done ? 'text-[#00EBF7]' : 'text-white/30'}`}>{done ? 'check_circle' : obj.icon}</span>
                            <span className={`font-label text-[10px] font-bold tracking-wider uppercase ${done ? 'text-[#00EBF7] line-through' : 'text-white'}`}>{obj.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-label text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 border" style={{ color: diffColor, borderColor: `${diffColor}40` }}>{obj.diff}</span>
                            <span className="font-label text-[9px] text-[#00EBF7]/60 tracking-wider">{obj.reward}</span>
                        </div>
                    </div>
                    <div className="pg-obj-bar">
                        <div className="pg-obj-bar-fill" style={{ width: `${pct}%`, background: done ? '#00EBF7' : '#FF003C' }} />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="font-label text-[8px] text-white/25 tracking-widest uppercase">{current}{obj.suffix || ''} / {obj.target}{obj.suffix || ''}</span>
                        <span className={`font-label text-[8px] font-bold tracking-widest ${done ? 'text-[#00EBF7]' : 'text-white/40'}`}>{pct}%</span>
                    </div>
                </motion.div>
            );
        })}
    </div>
);

// ─── Rank Roadmap (horizontal) ────────────────────────────────────
export const RankRoadmap = ({ timeline, rankColor }) => (
    <div className="pg-rank-road flex items-center gap-0 pb-2">
        {timeline.map((m, i) => {
            const isActive = m.status === 'active';
            const isDone = m.status === 'completed';
            const isLocked = m.status === 'locked';
            return (
                <React.Fragment key={m.rank}>
                    {i > 0 && <div className={`h-[2px] w-12 md:w-20 shrink-0 ${isDone || isActive ? 'bg-gradient-to-r from-[#00EBF7] to-[#FF003C]' : 'bg-white/10'}`} />}
                    <motion.div variants={slamUp}
                        className={`pg-rank-node shrink-0 relative p-4 md:p-5 border text-center min-w-[140px] md:min-w-[160px] ${isActive
                            ? 'border-[#FF003C] bg-[#FF003C]/5 pg-rank-active'
                            : isDone ? 'border-[#00EBF7]/30 bg-[#0A0A0A]'
                                : 'border-white/5 bg-[#050505] opacity-50'}`}
                        style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}>
                        {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FF003C]" />}
                        <div className={`font-label text-[7px] font-bold tracking-[0.3em] uppercase mb-1 ${isActive ? 'text-[#FF003C]' : isDone ? 'text-[#00EBF7]' : 'text-white/15'}`}>
                            {isDone ? 'ACHIEVED' : isActive ? 'CURRENT' : 'LOCKED'}
                        </div>
                        <div className={`font-black italic text-lg md:text-xl uppercase tracking-tighter mb-1 ${isLocked ? 'text-white/10' : 'text-white'}`}>
                            {isLocked ? '████' : m.rank}
                        </div>
                        <div className="font-label text-[8px] text-white/25 tracking-widest">{m.xpRequired.toLocaleString()} XP</div>
                    </motion.div>
                </React.Fragment>
            );
        })}
    </div>
);

// ─── Particles ────────────────────────────────────────────────────
export const Particles = () => (
    <>
        {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="pg-particle" style={{
                left: `${Math.random() * 100}%`,
                bottom: `${Math.random() * 20}%`,
                animationDuration: `${8 + Math.random() * 12}s`,
                animationDelay: `${Math.random() * 8}s`,
                width: `${1 + Math.random() * 2}px`,
                height: `${1 + Math.random() * 2}px`,
            }} />
        ))}
    </>
);

// ─── Section Header ───────────────────────────────────────────────
export const SectionHeader = ({ title, badge, color = '#FF003C' }) => (
    <div className="flex items-center gap-4 mb-8">
        <div className="w-1 h-6" style={{ background: color }} />
        <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">{title}</h2>
        {badge && (
            <span className="font-label font-bold text-[9px] tracking-[0.15em] uppercase px-3 py-1 border border-[#00EBF7]/30 text-[#00EBF7] bg-[#00EBF7]/5">
                {badge}
            </span>
        )}
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
);














import React, { useState, useEffect } from 'react';
import { useProgression } from '../../context/ProgressionContext';
import { motion } from 'framer-motion';
import {
    stagger, slamUp, getRankColor,
    MetricCard, AchievementBadge, MissionArchiveCard,
    ActiveObjectives, RankRoadmap, Particles, SectionHeader
} from './ProgressComponents';
import './Progress.css';

// ─── Loading ──────────────────────────────────────────────────────
const LoadingState = () => (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-5xl text-[#FF003C] animate-spin">settings</span>
        <div className="w-64 h-0.5 bg-[#111] overflow-hidden skew-x-[-15deg]">
            <div className="h-full bg-[#FF003C] shadow-[0_0_10px_#FF003C]" style={{ animation: 'loadBarSweep 2s ease forwards' }} />
        </div>
        <p className="font-label text-[9px] tracking-[0.4em] text-[#FF003C] uppercase font-bold">
            DECRYPTING_DOSSIER<span className="animate-[cursorBlink_0.7s_step-end_infinite]">█</span>
        </p>
    </div>
);

// ─── Main ─────────────────────────────────────────────────────────
export default function InvestigatorProgress() {
    const { progression: data, loading, error } = useProgression();
    const [xpAnimated, setXpAnimated] = useState(false);

    useEffect(() => {
        if (!data) return;
        const t = setTimeout(() => setXpAnimated(true), 600);
        return () => clearTimeout(t);
    }, [data]);

    if (loading) return <LoadingState />;
    if (error || !data) return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-[#FF003C] mb-3">warning</span>
            <p className="font-label text-[10px] tracking-[0.3em] text-[#FF003C] uppercase font-bold">{error || 'SIGNAL_LOST'}</p>
        </div>
    );

    const { identity, metrics, missionArchive, achievements, investigationStyle, rankTimeline } = data;
    const rankColor = getRankColor(identity.rank);
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    // XP — use backend cumulative values
    const currentXp = identity.xp || 0;
    const xpBase = identity.xpBase || 0;
    const xpTarget = identity.xpTarget || (identity.level * 1000);
    const xpInLevel = currentXp - xpBase;
    const xpRange = xpTarget - xpBase;
    const xpPercent = xpRange > 0 ? Math.round(Math.min(100, (xpInLevel / xpRange) * 100)) : 0;
    const xpRemaining = Math.max(0, xpTarget - currentXp);

    return (
        <div className="bg-[#050505] text-white font-body selection:bg-[#FF003C] selection:text-white relative min-h-screen overflow-hidden flex flex-col">

            {/* Noise overlay */}
            <div className="pg-noise" />

            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none pg-scanlines">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:2rem_2rem]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:8rem_8rem]" />
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-[#00EBF7]/[0.03] blur-[120px] rounded-full" />
                <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-[#FF003C]/[0.04] blur-[100px] rounded-full" />
                <Particles />
            </div>

            <main className="relative z-20 flex-1 overflow-y-auto pg-scroll">
                <div className="w-full max-w-[1500px] mx-auto px-5 md:px-10 pb-32">
                    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-20">

                        {/* ═══ SECTION 1 — HERO DOSSIER ═══ */}
                        <motion.section variants={slamUp} className="relative">
                            {/* Header strip */}
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-[#FF003C] animate-pulse shadow-[0_0_8px_#FF003C]" />
                                    <span className="font-label font-bold text-[9px] tracking-[0.3em] text-white/40 uppercase">CLASSIFIED_DOSSIER // EYES ONLY</span>
                                </div>
                                <div className={`font-label text-[9px] font-bold px-4 py-1.5 uppercase tracking-widest skew-x-[-10deg] ${identity.operationalStatus === 'ACTIVE_DUTY' ? 'bg-[#00EBF7] text-black' : 'bg-white/10 text-white'}`}>
                                    <span className="skew-x-[10deg] block">{identity.operationalStatus}</span>
                                </div>
                            </div>

                            {/* Hero body */}
                            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 pg-hero-grid">
                                {/* Left — Identity */}
                                <div className="flex-1">
                                    <p className="font-label font-bold text-[9px] tracking-[0.35em] text-[#FF003C] uppercase mb-3">INVESTIGATOR_IDENTITY</p>
                                    <h1 className="font-black italic uppercase tracking-tighter leading-none text-white mb-6"
                                        style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', animation: 'heroGlitch 12s ease-in-out infinite', textShadow: `4px 4px 0px #FF003C` }}>
                                        {identity.username}
                                    </h1>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="inline-flex items-center gap-2.5 px-4 py-2 border bg-[#0A0A0A] skew-x-[-10deg]" style={{ borderColor: `${rankColor}40` }}>
                                            <span className="font-label font-bold text-[8px] tracking-[0.2em] text-white/40 uppercase skew-x-[10deg]">RANK:</span>
                                            <span className="font-black italic text-xl uppercase tracking-tighter skew-x-[10deg]" style={{ color: rankColor, textShadow: `0 0 12px ${rankColor}66` }}>
                                                {identity.rank}
                                            </span>
                                        </div>
                                        <div className="px-4 py-2 border border-[#00EBF7]/20 bg-[#00EBF7]/5 skew-x-[-10deg]">
                                            <span className="font-label font-bold text-[8px] tracking-[0.2em] text-white/40 uppercase skew-x-[10deg] mr-2">CLEARANCE:</span>
                                            <span className="font-black italic text-lg text-[#00EBF7] uppercase tracking-tighter skew-x-[10deg]">{identity.clearanceTier}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right — Level + XP */}
                                <div className="w-full lg:w-[420px] shrink-0 pg-xp-panel">
                                    <div className="flex items-baseline gap-3 mb-3">
                                        <span className="font-label font-bold text-[9px] tracking-[0.2em] text-white/40 uppercase">LVL</span>
                                        <span className="font-black italic leading-none tracking-tighter" style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', color: '#FF003C', textShadow: '0 0 25px rgba(255,0,60,0.4)' }}>
                                            {identity.level}
                                        </span>
                                    </div>

                                    {/* XP bar */}
                                    <div className="bg-[#0A0A0A] border border-white/5 p-4" style={{ clipPath: "polygon(0 0, 100% 0, 100% 85%, 97% 100%, 0 100%)" }}>
                                        <div className="flex justify-between items-end mb-2 font-label font-bold text-[9px] tracking-[0.15em] uppercase">
                                            <span className="text-white/40">XP_PROGRESSION</span>
                                            <span style={{ color: rankColor }}>{xpPercent}%</span>
                                        </div>

                                        {/* Segmented track */}
                                        <div className="h-6 bg-[#111] border border-white/5 overflow-hidden skew-x-[-12deg] mb-2 relative">
                                            {/* Segment markers */}
                                            {[25, 50, 75].map(p => (
                                                <div key={p} className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: `${p}%` }} />
                                            ))}
                                            <div className="h-full relative overflow-hidden transition-all duration-[1.5s] ease-out"
                                                style={{ width: xpAnimated ? `${xpPercent}%` : '0%', background: `linear-gradient(90deg, ${rankColor}, ${rankColor}cc)`, boxShadow: `0 0 15px ${rankColor}, 0 0 30px ${rankColor}40` }}>
                                                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)]" style={{ animation: 'xpScanline 2s ease-in-out infinite' }} />
                                            </div>
                                        </div>

                                        <div className="flex justify-between font-label font-bold text-[8px] tracking-[0.12em] uppercase">
                                            <span className="text-white/25">{xpBase.toLocaleString()} XP</span>
                                            <span className="text-white">{currentXp.toLocaleString()} XP</span>
                                            <span className="text-white/25">{xpTarget.toLocaleString()} XP</span>
                                        </div>
                                        <div className="mt-2 font-label text-[8px] text-white/30 tracking-widest uppercase text-right">
                                            {xpRemaining.toLocaleString()} XP TO NEXT LEVEL
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        {/* ═══ SECTION 2 — ACTIVE OBJECTIVES ═══ */}
                        <motion.section variants={slamUp}>
                            <SectionHeader title="ACTIVE_OBJECTIVES" color="#FFD700" badge={`${OBJECTIVES_DONE(missionArchive, metrics)} / 5 COMPLETE`} />
                            <ActiveObjectives missions={missionArchive} metrics={metrics} />
                        </motion.section>

                        {/* ═══ SECTION 3 — INVESTIGATION METRICS ═══ */}
                        <motion.section variants={slamUp}>
                            <SectionHeader title="FIELD_METRICS" />
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pg-metrics-row">
                                <MetricCard label="MISSIONS" value={`${metrics.missionsCompleted}/${metrics.totalMissions}`} sub={`${metrics.completionRate}% RATE`} icon="task_alt" accent="primary" />
                                <MetricCard label="ACCURACY" value={metrics.avgScore} sub="AVG SCORE" icon="analytics" accent="secondary" suffix="%" statusKey="ACCURACY" statusVal={metrics.avgScore} />
                                <MetricCard label="EVIDENCE" value={`${metrics.hiddenEvidenceFound}/${metrics.totalHiddenEvidence}`} sub={`${metrics.evidenceRecoveryRate}% RECOVERED`} icon="find_in_page" accent="secondary" statusKey="EVIDENCE" statusVal={metrics.evidenceRecoveryRate} />
                                <MetricCard label="AI_DEPENDENCY" value={metrics.aiDependencyRate} sub="HINT USAGE" icon="smart_toy" accent={metrics.aiDependencyRate > 50 ? 'primary' : 'secondary'} suffix="%" statusKey="AI_DEPENDENCY" statusVal={metrics.aiDependencyRate} />
                            </div>
                            {/* Secondary stats row — smaller */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                                <MetricCard label="COMMANDS" value={metrics.totalCommandsExecuted.toLocaleString()} sub="TERMINAL OPS" icon="terminal" accent="secondary" />
                                <MetricCard label="AVG TIME" value={metrics.avgCompletionMinutes || '—'} sub="MIN PER CASE" icon="timer" accent="primary" suffix={metrics.avgCompletionMinutes ? 'm' : ''} />
                                <MetricCard label="DISCOVERY" value={metrics.discoveryCompletionRate} sub="FULL SWEEPS" icon="search" accent="secondary" suffix="%" statusKey="DISCOVERY" statusVal={metrics.discoveryCompletionRate} />
                                <MetricCard label="SILENT OPS" value={metrics.noHintMissions} sub="HINT-FREE" icon="visibility_off" accent="primary" />
                            </div>
                        </motion.section>

                        {/* ═══ SECTION 4 — INVESTIGATOR PROFILE + RANK ═══ */}
                        <motion.section variants={slamUp}>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Profile card — 2/3 */}
                                <div className="lg:col-span-2 bg-[#0A0A0A] border border-white/5 p-7 md:p-10 relative overflow-hidden" style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 25px), calc(100% - 25px) 100%, 0 100%)" }}>
                                    <div className="absolute top-0 right-0 w-20 h-0.5 bg-[#00EBF7]" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#00EBF7]/[0.02] pointer-events-none" />
                                    <p className="font-label font-bold text-[9px] tracking-[0.3em] text-[#00EBF7] uppercase mb-3">BEHAVIORAL_ANALYSIS</p>
                                    <div className="font-black italic uppercase tracking-tighter leading-none text-white text-4xl md:text-5xl mb-2" style={{ textShadow: '2px 2px 0px #00EBF7' }}>
                                        {investigationStyle.archetype}
                                    </div>
                                    <p className="font-black italic uppercase tracking-widest text-lg text-[#00EBF7] mb-5">{investigationStyle.classification}</p>
                                    <p className="font-body text-sm text-white/50 leading-relaxed max-w-[55ch] mb-6">{investigationStyle.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {investigationStyle.traits.map(t => (
                                            <span key={t} className="font-label text-[8px] uppercase tracking-[0.15em] border border-white/10 bg-white/5 px-3 py-1.5 text-white/60">{t}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Rank card — 1/3 */}
                                <div className="bg-[#050505] p-7 md:p-10 border-t-4 flex flex-col justify-center relative overflow-hidden" style={{ borderColor: rankColor }}>
                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-[rgba(255,0,60,0.03)] pointer-events-none" />
                                    <p className="font-label font-bold text-[9px] tracking-[0.3em] text-white/40 uppercase mb-3">CURRENT_RANK</p>
                                    <div className="font-black italic uppercase tracking-tighter text-3xl leading-none mb-4" style={{ color: rankColor, textShadow: `0 0 15px ${rankColor}55` }}>
                                        {identity.rank}
                                    </div>
                                    <div className="flex items-baseline gap-2 mb-5">
                                        <span className="font-label font-bold text-xs tracking-[0.2em] text-white/40 uppercase">LVL</span>
                                        <span className="font-black italic text-5xl leading-none text-white tracking-tighter">{identity.level}</span>
                                    </div>
                                    <div className="inline-block px-3 py-1.5 border border-[#00EBF7]/25 bg-[#00EBF7]/5 skew-x-[-10deg] self-start">
                                        <span className="font-label font-bold text-[9px] tracking-[0.15em] text-[#00EBF7] uppercase skew-x-[10deg] block">{identity.clearanceTier}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        {/* ═══ SECTION 5 — ACHIEVEMENTS ═══ */}
                        <motion.section variants={slamUp}>
                            <SectionHeader title="CLASSIFIED_ACHIEVEMENTS" color="#00EBF7" badge={`${unlockedCount}/${achievements.length} UNLOCKED`} />
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
                            </div>
                        </motion.section>

                        {/* ═══ SECTION 6 — RANK ROADMAP ═══ */}
                        <motion.section variants={slamUp}>
                            <SectionHeader title="RANK_ROADMAP" />
                            <RankRoadmap timeline={rankTimeline} rankColor={rankColor} />
                        </motion.section>

                        {/* ═══ SECTION 7 — MISSION ARCHIVE ═══ */}
                        <motion.section variants={slamUp}>
                            <SectionHeader title="OPERATION_ARCHIVE" badge={`${missionArchive.length} LOGGED`} />
                            {missionArchive.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-20 bg-[#0A0A0A] border border-white/5">
                                    <span className="material-symbols-outlined text-5xl text-white/10">folder_open</span>
                                    <p className="font-label font-bold text-xs tracking-[0.3em] text-[#FF003C] uppercase">NO_OPERATIONS_LOGGED</p>
                                    <p className="font-body text-sm text-white/30">Complete your first mission to begin your archive.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {missionArchive.map(m => <MissionArchiveCard key={m.sessionId} mission={m} />)}
                                </div>
                            )}
                        </motion.section>

                    </motion.div>
                </div>
            </main>
        </div>
    );
}

// Helper for objectives count
function OBJECTIVES_DONE(missions, metrics) {
    const checks = [
        missions.filter(s => s.hintsUsed === 0 && s.missionCompleted).length >= 3,
        metrics.avgScore >= 90,
        missions.filter(s => s.totalEvidence > 0 && s.evidenceFound >= s.totalEvidence).length >= 1,
        metrics.totalCommandsExecuted >= 100,
        missions.filter(s => s.difficulty === 'hard' && s.missionCompleted).length >= 1,
    ];
    return checks.filter(Boolean).length;
}