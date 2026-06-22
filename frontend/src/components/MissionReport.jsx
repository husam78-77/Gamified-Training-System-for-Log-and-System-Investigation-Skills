/**
 * MissionReport.jsx
 * Full-screen "after-action" summary shown when a session completes.
 * Replaces the old CompletionOverlay (brief "CLEARED" splash + auto-redirect).
 *
 * All figures are derived from data the session already produced —
 * nothing here is persisted separately. See computeReportData() for the
 * exact source of each field.
 *
 * Path: frontend/src/components/MissionReport.jsx
 */

import React from 'react';
import { motion } from 'framer-motion';

const GRADE_COLOR = {
    S: '#00FFFF',
    A: '#00FFFF',
    B: '#FFFFFF',
    C: '#FFFFFF',
    D: '#FF003C',
};

const getGrade = (score) => {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
};

const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '—';
    const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
};

const getFeedback = ({ missionCompleted, grade, hintsUsed }) => {
    if (!missionCompleted) {
        return 'Investigation concluded before every objective was resolved. The evidence trail is still there — recommend another pass to close the case fully.';
    }
    if (grade === 'S') {
        return hintsUsed === 0
            ? 'Flawless execution. You traced the entire intrusion chain independently with zero assistance — elite-tier fieldwork.'
            : 'Outstanding investigation work. You identified the attack vector efficiently and closed every objective.';
    }
    if (grade === 'A') {
        return hintsUsed === 0
            ? 'Excellent investigation work. You completed all objectives with minimal assistance and strong command discipline.'
            : 'Excellent investigation work. You identified the attack source efficiently and completed all objectives.';
    }
    if (grade === 'B') {
        return 'Solid fieldwork — the case was closed. A tighter command path or less reliance on hints would sharpen your score further.';
    }
    if (grade === 'C') {
        return 'Case closed, but the investigation path was inefficient. Revisit the command log and tighten your methodology next time.';
    }
    return 'Mission concluded with significant gaps in the investigation. Recommend reviewing core forensic procedures before the next deployment.';
};

/**
 * Derives every Mission Report field from data already produced by the
 * session — no new persistence, no new tables.
 *
 * @param {Object} params
 * @param {Object} params.evaluationData   - The full payload from session.evaluation
 *                                            (= POST /sessions/:id/complete response)
 * @param {string} params.scenarioTitle    - scenarioData.scenario.title
 * @param {number} params.objectivesTotal  - objectives.totalRequired (live hook state)
 * @param {number} params.hintsUsed        - hint.hints.length (live hook state)
 */
export function computeReportData({ evaluationData, scenarioTitle, objectivesTotal, hintsUsed }) {
    const session = evaluationData?.session || {};
    const score = evaluationData?.evaluation?.totalWeightedScore ?? 0;
    const missionCompleted = !!evaluationData?.missionCompleted;
    const xpAwarded = evaluationData?.xpAwarded ?? 0;
    const objectivesCompleted = evaluationData?.completedObjectiveIds?.length ?? 0;
    const discoveries = evaluationData?.discoveries || [];
    const discoveriesFound = discoveries.filter(d => d.unlocked).length;
    const discoveriesTotal = discoveries.length;
    const grade = getGrade(score);

    return {
        scenarioTitle: scenarioTitle || 'CLASSIFIED_OPERATION',
        missionCompleted,
        xpAwarded,
        timeTaken: formatDuration(session.start_time, session.end_time),
        objectivesCompleted,
        objectivesTotal,
        discoveriesFound,
        discoveriesTotal,
        hintsUsed,
        grade,
        score,
        feedback: getFeedback({ missionCompleted, grade, hintsUsed }),
    };
}

// ── Animation variants ──────────────────────────────────────────────────
const overlayVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.3 } },
};
const panelVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26, delay: 0.1 } },
};
const rowStagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.4 } },
};
const rowItem = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function MissionReport({ data, onNext }) {
    if (!data) return null;

    const gradeColor = GRADE_COLOR[data.grade] || '#FFFFFF';
    const statusColor = data.missionCompleted ? '#00FFFF' : '#FF003C';

    const stats = [
        { label: 'XP_EARNED', value: `+${data.xpAwarded}`, suffix: 'XP', icon: 'bolt' },
        { label: 'TIME_TAKEN', value: data.timeTaken, suffix: '', icon: 'timer' },
        { label: 'OBJECTIVES', value: `${data.objectivesCompleted}/${data.objectivesTotal}`, suffix: '', icon: 'task_alt' },
        ...(data.discoveriesTotal > 0
            ? [{ label: 'DISCOVERIES', value: `${data.discoveriesFound}/${data.discoveriesTotal}`, suffix: '', icon: 'find_in_page' }]
            : []),
        { label: 'HINTS_USED', value: `${data.hintsUsed}`, suffix: '', icon: 'smart_toy' },
    ];

    return (
        <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-xl p-4 md:p-8 overflow-y-auto"
        >
            {/* Scanline texture, matches the rest of the app's HUD chrome */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.04]"
                style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 4px)' }}
            />

            <motion.div
                variants={panelVariants}
                className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 shadow-[20px_20px_0px_rgba(0,0,0,0.7)] my-auto"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%)' }}
            >
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: `linear-gradient(90deg, ${statusColor}, transparent)` }} />

                {/* ── Header ── */}
                <div className="px-8 md:px-12 pt-10 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="w-2 h-2 animate-pulse" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
                        <span className="font-sans text-[10px] font-bold tracking-[0.4em] text-white/40 uppercase">
                            AFTER_ACTION_REPORT // EYES_ONLY
                        </span>
                    </div>
                    <h1 className="font-black italic text-4xl md:text-5xl uppercase tracking-tighter text-white skew-x-[-6deg] leading-none drop-shadow-[3px_3px_0px_rgba(0,0,0,0.6)]">
                        MISSION REPORT
                    </h1>
                </div>

                {/* ── Scenario + Status ── */}
                <div className="px-8 md:px-12 py-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="font-sans text-[9px] font-bold tracking-[0.3em] text-white/40 uppercase mb-1.5">SCENARIO</div>
                        <div className="font-black italic text-xl md:text-2xl uppercase tracking-tighter text-white skew-x-[-4deg]">
                            {data.scenarioTitle}
                        </div>
                    </div>
                    <div
                        className="self-start sm:self-auto px-5 py-2 border font-sans font-bold text-sm tracking-[0.25em] uppercase skew-x-[-10deg] shrink-0"
                        style={{ borderColor: statusColor, color: statusColor, background: `${statusColor}14` }}
                    >
                        <span className="skew-x-[10deg] block">{data.missionCompleted ? 'SUCCESS' : 'PARTIAL'}</span>
                    </div>
                </div>

                {/* ── Stat grid ── */}
                <motion.div
                    variants={rowStagger}
                    initial="hidden"
                    animate="show"
                    className="px-8 md:px-12 py-8 grid grid-cols-2 sm:grid-cols-3 gap-6 border-b border-white/10"
                >
                    {stats.map(s => (
                        <motion.div key={s.label} variants={rowItem} className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-white/40">
                                <span className="material-symbols-outlined text-sm">{s.icon}</span>
                                <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase">{s.label.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="font-black italic text-2xl md:text-3xl text-white tracking-tighter">
                                {s.value}{s.suffix && <span className="text-sm text-white/40 ml-1">{s.suffix}</span>}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* ── Grade ── */}
                <div className="px-8 md:px-12 py-8 border-b border-white/10 flex items-center justify-between gap-6">
                    <div>
                        <div className="font-sans text-[9px] font-bold tracking-[0.3em] text-white/40 uppercase mb-2">PERFORMANCE_GRADE</div>
                        <div
                            className="font-black italic text-3xl uppercase tracking-tighter skew-x-[-6deg]"
                            style={{ color: gradeColor, textShadow: `0 0 16px ${gradeColor}55` }}
                        >
                            {data.score}<span className="text-base text-white/40 ml-1">/100</span>
                        </div>
                    </div>
                    <div
                        className="font-black italic text-6xl md:text-7xl leading-none skew-x-[-8deg] shrink-0"
                        style={{ color: gradeColor, textShadow: `0 0 30px ${gradeColor}66` }}
                    >
                        {data.grade}
                    </div>
                </div>

                {/* ── Feedback ── */}
                <div className="px-8 md:px-12 py-7">
                    <p className="font-body text-sm md:text-base text-white/70 leading-relaxed">
                        {data.feedback}
                    </p>
                </div>

                {/* ── NEXT button ── */}
                <div className="px-8 md:px-12 pb-10 pt-2">
                    <button
                        onClick={onNext}
                        className="group w-full py-5 bg-[#00FFFF] text-black font-black italic text-xl tracking-tighter uppercase skew-x-[-10deg] hover:bg-white transition-all duration-300 shadow-[8px_8px_0px_#050505] flex items-center justify-center gap-3"
                    >
                        <span className="skew-x-[10deg] block">NEXT</span>
                        <span className="skew-x-[10deg] material-symbols-outlined font-black group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
