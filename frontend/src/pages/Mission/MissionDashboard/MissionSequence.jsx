/**
 * MissionSequence.jsx
 * Fetches real scenario levels by type from the DB.
 * Replaces the hardcoded missionData dictionary.
 *
 * Route: /sequence/:type
 * Navigates to: /briefing  (via state: { scenario_id, mode, type })
 *
 * Path: frontend/src/pages/Mission/MissionDashboard/MissionSequence.jsx
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { fetchScenariosByType } from '../../../services/scenarioService';
import './MissionSequence.css';

// ── Visual config per type — purely cosmetic, not from DB ─────────────────
const TYPE_CONFIG = {
    bruteforce: {
        titleBase: 'BRUTE',
        titleHighlight: 'FORCE',
        themeColor: 'text-[#FF003C]',
        bgTheme: 'bg-[#FF003C]',
        borderTheme: 'border-[#FF003C]',
        category: 'CATEGORY_X04',
        bgText: 'BREACH',
        description: 'Systematic exploitation of weak authentication protocols. High noise, high reward. Break the door down.',
    },
    script: {
        titleBase: 'SUSPICIOUS',
        titleHighlight: 'SCRIPT',
        themeColor: 'text-[#00FFFF]',
        bgTheme: 'bg-[#00FFFF]',
        borderTheme: 'border-[#00FFFF]',
        category: 'PROTOCOL_004',
        bgText: 'ANALYZE',
        description: 'Deep-dive malware analysis and shell-script decryption. Trace obfuscated payloads and dismantle lateral movement scripts in real-time.',
    },
};

// Difficulty display config
const DIFF_CONFIG = {
    easy: { label: 'EASY', color: 'bg-[#FF003C] text-black', targetDiff: 'LOW_SEC' },
    medium: { label: 'MEDIUM', color: 'bg-zinc-700 text-zinc-400', targetDiff: 'MID_TIER' },
    hard: { label: 'HARD', color: 'bg-zinc-800 text-zinc-600', targetDiff: 'ULTRA_SEC' },
};

export default function MissionSequence() {
    const { type } = useParams();
    const navigate = useNavigate();
    const config = TYPE_CONFIG[type?.toLowerCase()];

    const [scenarios, setScenarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMode, setSelectedMode] = useState({});  // { [scenario_id]: 'timed'|'free' }
    // ── Navigate to briefing with scenario state ──────────────────────────
    const [isNavigating, setIsNavigating] = useState(false);
    // ── Fetch levels for this type ────────────────────────────────────────
    useEffect(() => {
        if (!config) return;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchScenariosByType(type);
                setScenarios(data.scenarios);

                // Default all to 'free' mode
                const defaults = {};
                data.scenarios.forEach(s => { defaults[s.scenario_id] = 'free'; });
                setSelectedMode(defaults);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [type]);

    // ── Invalid type → redirect ───────────────────────────────────────────
    if (!config) {
        return null;
    }


    const handleDeploy = (scenario) => {
        if (isNavigating) return;

        setIsNavigating(true);

        const mode = selectedMode[scenario.scenario_id] || 'free';
        navigate(`/briefing/${scenario.scenario_id}?mode=${mode}&type=${type}`);
    };

    const toggleMode = (scenarioId) => {
        setSelectedMode(prev => ({
            ...prev,
            [scenarioId]: prev[scenarioId] === 'timed' ? 'free' : 'timed',
        }));
    };

    return (
        <div className="mission-wrapper font-body selection:bg-primary-container selection:text-white">
            <main className="pt-10 pl-[300px] px-6 md:px-6 pb-16 overflow-x-hidden">
                <div className="fixed inset-0 pointer-events-none opacity-10 diagonal-path"></div>

                {/* HEADER */}
                <header className="mb-16 relative">
                    <h1 className="font-headline font-black italic text-7xl md:text-9xl text-white uppercase tracking-tighter persona-tilt leading-none">
                        {config.titleBase}{' '}
                        <span className={config.themeColor}>{config.titleHighlight}</span>
                    </h1>
                    <div className="absolute -top-4 -left-4 font-label text-[#00FFFF] text-sm tracking-[0.5em] font-bold">
                        {config.category}
                    </div>
                    <p className="font-label mt-6 text-zinc-400 max-w-xl text-lg persona-tilt-alt">
                        {config.description}
                    </p>
                </header>

                {/* LOADING */}
                {loading && (
                    <div className="flex flex-col gap-8">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-full md:w-[600px] h-64 bg-surface-container-low animate-pulse opacity-40"></div>
                        ))}
                    </div>
                )}

                {/* ERROR */}
                {error && !loading && (
                    <div className="slashed-card bg-surface-container-high border-l-8 border-[#FF003C] p-8 max-w-xl">
                        <p className="font-label text-[#FF003C] text-sm tracking-widest">
                            TRANSMISSION_ERROR: {error}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 font-label text-xs text-zinc-400 hover:text-white underline"
                        >
                            Retry connection
                        </button>
                    </div>
                )}

                {/* MISSION PATH */}
                {!loading && !error && (
                    <div className="flex flex-col gap-24 relative z-10">
                        {scenarios.map((scenario, index) => {
                            const isEven = index % 2 !== 0;
                            const diff = scenario.difficulty?.toLowerCase();
                            const diffCfg = DIFF_CONFIG[diff] || DIFF_CONFIG.easy;
                            const isLocked = index > 0; // TODO: replace with real user_progress check
                            const mode = selectedMode[scenario.scenario_id] || 'free';
                            const translateClass = index === 0
                                ? 'md:translate-x-0'
                                : isEven ? 'md:-translate-x-12' : 'md:translate-x-12';

                            return (
                                <section
                                    key={scenario.scenario_id}
                                    className={`flex flex-col ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 ${translateClass}`}
                                >
                                    <div className={`w-full md:w-[600px] slashed-card p-8 relative border-l-8 ${isLocked
                                        ? 'bg-surface-container-low opacity-80 border-zinc-700'
                                        : `bg-surface-container-high ${config.borderTheme} hover:bg-surface-container-highest`
                                        } transition-colors`}
                                    >
                                        {/* Lock overlay */}
                                        {isLocked && (
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-[2px]">
                                                <span
                                                    className={`material-symbols-outlined text-7xl ${index === 2 ? 'text-zinc-700' : config.themeColor
                                                        } mb-4`}
                                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                                >
                                                    {index === 2 ? 'encrypted' : 'lock'}
                                                </span>
                                                <div className={`font-label ${index === 2 ? 'text-zinc-600' : config.themeColor
                                                    } text-sm font-bold tracking-widest uppercase`}>
                                                    {index === 2 ? 'ENCRYPTED DATA' : `Prerequisite: Level ${index}`}
                                                </div>
                                            </div>
                                        )}

                                        {/* Card header */}
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <span className={`font-label text-xs tracking-widest block mb-2 ${isLocked ? 'text-zinc-600' : 'text-[#00FFFF]'
                                                    }`}>
                                                    SEQUENCE_{String(index + 1).padStart(3, '0')}
                                                </span>
                                                <h3 className={`font-headline font-black italic text-4xl uppercase ${isLocked ? 'text-zinc-500' : 'text-white'
                                                    }`}>
                                                    {scenario.title}
                                                </h3>
                                            </div>
                                            <div className={`${diffCfg.color} font-label font-bold px-3 py-1 text-xs skew-x-[-15deg]`}>
                                                {diffCfg.label}
                                            </div>
                                        </div>

                                        {/* Mission brief preview */}
                                        <p className={`font-body mb-8 leading-relaxed line-clamp-3 ${isLocked ? 'text-zinc-600' : 'text-zinc-300'
                                            }`}>
                                            {scenario.mission_brief}
                                        </p>

                                        {/* Stats row */}
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className={`p-4 ${isLocked ? 'bg-black/20' : 'bg-black/40 border-b border-zinc-700'
                                                }`}>
                                                <span className={`font-label text-[10px] uppercase block ${isLocked ? 'text-zinc-700' : 'text-zinc-500'
                                                    }`}>
                                                    Target Difficulty
                                                </span>
                                                <span className={`font-headline font-bold text-xl ${isLocked ? 'text-zinc-700' : 'text-[#00FFFF]'
                                                    }`}>
                                                    {diffCfg.targetDiff}
                                                </span>
                                            </div>
                                            <div className={`p-4 ${isLocked ? 'bg-black/20' : 'bg-black/40 border-b border-zinc-700'
                                                }`}>
                                                <span className={`font-label text-[10px] uppercase block ${isLocked ? 'text-zinc-700' : 'text-zinc-500'
                                                    }`}>
                                                    Type
                                                </span>
                                                <span className={`font-headline font-bold text-xl uppercase ${isLocked ? 'text-zinc-700' : 'text-white'
                                                    }`}>
                                                    {scenario.type}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mode selector — only on unlocked cards */}
                                        {!isLocked && (
                                            <div className="flex gap-2 mb-6">
                                                <button
                                                    onClick={() => toggleMode(scenario.scenario_id)}
                                                    className={`flex-1 py-2 font-label text-[10px] font-bold tracking-widest uppercase transition-all ${mode === 'free'
                                                        ? `${config.bgTheme} text-black`
                                                        : 'bg-transparent border border-zinc-700 text-zinc-500 hover:border-zinc-500'
                                                        }`}
                                                >
                                                    FREE MODE
                                                </button>
                                                <button
                                                    onClick={() => toggleMode(scenario.scenario_id)}
                                                    className={`flex-1 py-2 font-label text-[10px] font-bold tracking-widest uppercase transition-all ${mode === 'timed'
                                                        ? `${config.bgTheme} text-black`
                                                        : 'bg-transparent border border-zinc-700 text-zinc-500 hover:border-zinc-500'
                                                        }`}
                                                >
                                                    TIMED MODE
                                                </button>
                                            </div>
                                        )}

                                        {/* Deploy button */}
                                        {isLocked ? (
                                            <button
                                                disabled
                                                className="w-full bg-zinc-800 text-zinc-600 font-headline font-black italic py-4 skew-x-[-10deg] text-xl uppercase tracking-widest cursor-not-allowed"
                                            >
                                                DEPLOY MISSION
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeploy(scenario);
                                                }}
                                                className={`w-full ${config.bgTheme} text-black font-headline font-black italic py-4 skew-x-[-10deg] hover:scale-105 transition-all text-xl uppercase tracking-widest group`}
                                            >
                                                <span className="group-hover:animate-pulse">DEPLOY MISSION</span>
                                            </button>
                                        )}

                                        {!isLocked && (
                                            <div className="absolute -right-4 -bottom-4 font-headline text-8xl text-white/5 font-black italic select-none">
                                                {String(index + 1).padStart(2, '0')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Connecting line */}
                                    {index < scenarios.length - 1 && (
                                        <div className={`hidden md:block w-32 h-px relative ${isLocked ? 'bg-zinc-700' : config.bgTheme
                                            }`}>
                                            <div className={`absolute ${isEven ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 w-4 h-4 rotate-45 ${isLocked ? 'bg-zinc-700' : config.bgTheme
                                                }`}></div>
                                        </div>
                                    )}
                                </section>
                            );
                        })}

                        {/* Empty state */}
                        {scenarios.length === 0 && (
                            <div className="font-label text-zinc-600 text-sm tracking-widest uppercase">
                                NO_SCENARIOS_FOUND // Check database connection.
                            </div>
                        )}
                    </div>
                )}

                {/* Decorative elements */}
                <div className="fixed bottom-10 right-10 flex flex-col gap-2 items-end z-30 pointer-events-none persona-tilt">
                    <div className={`${config.bgTheme} text-black font-headline font-black px-8 py-2 italic text-2xl uppercase shadow-[10px_10px_0px_#00FFFF]`}>
                        ACTIVE_LINK: ESTABLISHED
                    </div>
                    <div className="bg-white text-black font-label font-bold px-4 py-1 text-xs tracking-widest uppercase">
                        LATENCY: 14ms // TRACE_LEVEL: 0%
                    </div>
                </div>

                <div className="fixed top-1/2 -right-20 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none font-headline font-black italic text-[40rem] text-white leading-none rotate-90 overflow-hidden">
                    {config.bgText}
                </div>
            </main>
        </div>
    );
}