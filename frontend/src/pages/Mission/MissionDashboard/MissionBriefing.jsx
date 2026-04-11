/**
 * MissionBriefing.jsx
 * Reads scenario_id + mode from React Router location.state.
 * Fetches real scenario data + objectives from DB.
 * Navigates to /game with { scenario_id, mode } in state.
 *
 * Route: /briefing
 * Receives state: { scenario_id, mode, type }
 * Navigates to:   /game  (state: { scenario_id, mode })
 *
 * Path: frontend/src/pages/Mission/MissionDashboard/MissionBriefing.jsx
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchScenarioById } from '../../../services/scenarioService';
import './MissionBriefing.css';

const THREAT_COLORS = {
    easy: { label: 'MODERATE', color: 'text-yellow-400', bar: 'bg-yellow-400', width: 'w-1/3' },
    medium: { label: 'ELEVATED', color: 'text-orange-400', bar: 'bg-orange-400', width: 'w-2/3' },
    hard: { label: 'OMEGA', color: 'text-[#FF003C]', bar: 'bg-[#FF003C]', width: 'w-full' },
};

export default function MissionBriefing() {
    const navigate = useNavigate();
    const { scenario_id } = useParams();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'free';
    const type = searchParams.get('type') || '';
    console.log('BRIEFING MOUNTED — scenario_id:', scenario_id, 'mode:', mode);
    console.log('FULL URL:', window.location.href);
    const [scenario, setScenario] = useState(null);
    const [objectives, setObjectives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Fetch scenario + objectives ───────────────────────────────────────
    useEffect(() => {
        if (!scenario_id) return;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchScenarioById(scenario_id);
                setScenario(data.scenario);
                setObjectives(data.objectives);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [scenario_id]);

    // ── Navigate to GamingEnvironment — URL params, never location.state ──
    const handleStart = () => {
        navigate(`/game/${scenario_id}?mode=${mode}`);
    };

    const diff = scenario?.difficulty?.toLowerCase() || 'easy';
    const threatCfg = THREAT_COLORS[diff] || THREAT_COLORS.easy;

    return (
        <div className="mission-briefing-wrapper font-body selection:bg-primary-container selection:text-white">
            <main className="pt-10 pl-[300px] px-6 md:px-10 pb-16 overflow-x-hidden">

                {/* Background elements */}
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="w-full h-full flex flex-wrap gap-4 text-[10px] font-mono leading-none rotate-[-5deg] scale-150 select-none">
                        01010100 01001000 01000101 00100000 01000010 01010010 01000101 01000001 01000011 01001000
                    </div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="relative mb-16">
                        <h1 className="font-headline text-6xl md:text-8xl font-black italic skew-x-[-8deg] leading-[0.8] tracking-tighter text-[#FF003C] uppercase text-glow-primary">
                            MISSION_BRIEFING
                        </h1>
                        <div className="absolute -top-4 -left-4 bg-[#00EBF7] text-black font-label text-xs px-3 py-1 font-bold -skew-x-12">
                            CLASSIFIED // LEVEL 5 CLEARANCE REQUIRED
                        </div>
                    </div>

                    {/* LOADING */}
                    {loading && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 space-y-8">
                                <div className="h-64 bg-surface-container-high animate-pulse opacity-40"></div>
                                <div className="h-48 bg-surface-container-low animate-pulse opacity-30"></div>
                            </div>
                            <div className="lg:col-span-4 space-y-8">
                                <div className="h-48 bg-surface-container-high animate-pulse opacity-40"></div>
                                <div className="h-32 bg-surface-container-low animate-pulse opacity-30"></div>
                            </div>
                        </div>
                    )}

                    {/* ERROR */}
                    {error && !loading && (
                        <div className="slashed-card bg-surface-container-high border-l-8 border-[#FF003C] p-8 max-w-xl">
                            <p className="font-label text-[#FF003C] text-sm tracking-widest mb-4">
                                TRANSMISSION_FAILURE: {error}
                            </p>
                            <button
                                onClick={() => navigate(`/sequence/${type}`)}
                                className="font-label text-xs text-zinc-400 hover:text-white underline"
                            >
                                ← Return to sequence
                            </button>
                        </div>
                    )}

                    {/* CONTENT */}
                    {!loading && !error && scenario && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                            {/* Left: narrative + objectives */}
                            <div className="lg:col-span-8 flex flex-col gap-8">

                                {/* Situation report */}
                                <div className="slashed-card bg-surface-container-high border-l-8 border-[#FF003C] p-12 relative overflow-hidden -rotate-1 group">
                                    <div className="absolute top-0 right-0 p-4 opacity-20">
                                        <span className="material-symbols-outlined text-9xl">security</span>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="font-label text-[10px] text-zinc-500 tracking-[0.4em] uppercase">
                                                {scenario.type?.toUpperCase()} // {scenario.difficulty?.toUpperCase()}
                                            </span>
                                        </div>
                                        <h2 className="font-headline text-3xl font-black italic uppercase mb-2 text-white tracking-widest">
                                            {scenario.title}
                                        </h2>
                                        <h3 className="font-headline text-lg font-black italic uppercase mb-6 text-zinc-400 tracking-widest">
                                            SITUATION_REPORT
                                        </h3>
                                        <p className="font-body text-xl md:text-2xl text-on-background leading-relaxed font-light italic">
                                            {scenario.mission_brief}
                                        </p>
                                    </div>

                                    {/* Threat level bar */}
                                    <div className="mt-12 flex items-center gap-6">
                                        <div className="h-1 flex-1 bg-zinc-800">
                                            <div className={`h-full ${threatCfg.bar} ${threatCfg.width} animate-pulse`}></div>
                                        </div>
                                        <span className={`font-label ${threatCfg.color} text-sm font-bold tracking-widest`}>
                                            THREAT_LEVEL: {threatCfg.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Objectives */}
                                <div className="slashed-card bg-surface-container-low p-8 rotate-1">
                                    <h3 className="font-headline text-xl font-bold italic text-[#00EBF7] mb-8 uppercase tracking-widest flex items-center gap-3">
                                        <span className="material-symbols-outlined">task_alt</span>
                                        PRIMARY_OBJECTIVES
                                    </h3>

                                    {objectives.length === 0 ? (
                                        <p className="font-label text-zinc-600 text-xs tracking-widest">
                                            NO_OBJECTIVES_FOUND
                                        </p>
                                    ) : (
                                        <div className="space-y-6">
                                            {objectives.map((obj, i) => (
                                                <div key={obj.objective_id} className="flex items-start gap-4 group">
                                                    <div className="w-8 h-8 border-2 border-[#00EBF7] flex-shrink-0 flex items-center justify-center -skew-x-12 group-hover:bg-[#00EBF7]/20 transition-all">
                                                        <span className="font-label text-[10px] text-[#00EBF7] font-bold">
                                                            {String(i + 1).padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="font-headline font-bold text-lg text-white">
                                                            {obj.title}
                                                        </span>
                                                        <p className="font-label text-sm text-zinc-500 mt-1">
                                                            {obj.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: mode info + CTA */}
                            <div className="lg:col-span-4 flex flex-col gap-8">

                                {/* Mode indicator */}
                                <div className="bg-surface-container-highest border-t-4 border-[#00EBF7] p-6">
                                    <div className="font-label text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                                        Selected Mode
                                    </div>
                                    <div className="font-headline text-3xl font-black italic text-white uppercase">
                                        {mode === 'timed' ? '⏱ TIMED' : '∞ FREE'}
                                    </div>
                                    <p className="font-label text-xs text-zinc-500 mt-2 leading-relaxed">
                                        {mode === 'timed'
                                            ? 'Countdown active. Exiting early discards all progress.'
                                            : 'No time limit. Explore freely at your own pace.'
                                        }
                                    </p>
                                </div>

                                {/* Start button */}
                                <button
                                    onClick={handleStart}
                                    className="btn-slashed w-full bg-[#FF003C] hover:bg-white text-black py-10 transition-all group relative overflow-hidden shadow-[0_0_50px_rgba(255,0,60,0.5)]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                    <span className="relative z-10 font-headline text-2xl font-black italic tracking-tighter uppercase flex items-center justify-center gap-0">
                                        START_INVESTIGATION
                                        <span className="material-symbols-outlined text-4xl">bolt</span>
                                    </span>
                                    <div className="absolute bottom-1 right-10 font-label text-[8px] font-bold tracking-widest opacity-50">
                                        INITIALIZE BREACH PROTOCOL V9.0
                                    </div>
                                </button>

                                {/* Back link */}
                                <button
                                    onClick={() => navigate(-1)}
                                    className="font-label text-xs text-zinc-600 hover:text-zinc-300 transition-colors tracking-widest uppercase flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    Back to sequence
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Footer meta */}
                    <div className="mt-20 flex flex-wrap gap-8 justify-between items-end border-t border-zinc-800 pt-8 opacity-40">
                        <div className="font-label text-xs uppercase tracking-[0.5em]">
                            SECURE_CHANNEL_ENCRYPTED // TLS_V1.3 // SHA-512
                        </div>
                        <div className="font-label text-xs uppercase tracking-widest text-[#FF003C]">
                            TERMINAL_01 // MODE: {mode?.toUpperCase()}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}