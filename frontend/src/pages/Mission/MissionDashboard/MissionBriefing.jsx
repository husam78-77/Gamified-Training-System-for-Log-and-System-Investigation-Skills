import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchScenarioById } from '../../../services/scenarioService';
import { motion } from 'framer-motion';
// ── Visual config ───────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    bruteforce: {
        hex: '#FF003C',
        themeColor: 'text-[#FF003C]',
        bgTheme: 'bg-[#FF003C]',
        borderTheme: 'border-[#FF003C]',
        category: 'CATEGORY_X04',
        bgText: 'BREACH',
    },
    script: {
        hex: '#00FFFF',
        themeColor: 'text-[#00FFFF]',
        bgTheme: 'bg-[#00FFFF]',
        borderTheme: 'border-[#00FFFF]',
        category: 'PROTOCOL_004',
        bgText: 'ANALYZE',
    },
    ssh_forensics: {
        hex: '#00FF00',
        themeColor: 'text-[#00FF00]',
        bgTheme: 'bg-[#00FF00]',
        borderTheme: 'border-[#00FF00]',
        category: 'PROTOCOL_009',
        bgText: 'INVESTIGATE',
    },
};

const THREAT_COLORS = {
    easy: { label: 'MODERATE', color: 'text-white', bar: 'bg-white', width: 'w-1/3' },
    medium: { label: 'ELEVATED', color: 'text-[#00FFFF]', bar: 'bg-[#00FFFF]', width: 'w-2/3' },
    hard: { label: 'OMEGA', color: 'text-[#FF003C]', bar: 'bg-[#FF003C]', width: 'w-full' },
};

export default function MissionBriefing() {
    const navigate = useNavigate();
    const { scenario_id } = useParams();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'free';
    const type = searchParams.get('type') || '';

    // Default to a gray fallback if type is unknown
    const config = TYPE_CONFIG[type?.toLowerCase()] || {
        hex: '#FFFFFF', themeColor: 'text-white', bgTheme: 'bg-white', borderTheme: 'border-white', category: 'UNKNOWN', bgText: 'UNKNOWN'
    };

    const [scenario, setScenario] = useState(null);
    const [objectives, setObjectives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Kinetic Animation Variants ──────────────────────────────────────────
    const staggerContainer = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
    };

    const slamLeft = {
        hidden: { opacity: 0, x: -60, skewX: "10deg" },
        show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
    };

    const slamUp = {
        hidden: { opacity: 0, y: 50, skewX: "5deg" },
        show: { opacity: 1, y: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
    };

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

    const handleStart = () => {
        navigate(`/game/${scenario_id}?mode=${mode}`);
    };

    const diff = scenario?.difficulty?.toLowerCase() || 'easy';
    const threatCfg = THREAT_COLORS[diff] || THREAT_COLORS.easy;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white selection:text-black relative flex flex-col">

            {/* THE VOID: Background & Grids */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:8rem_8rem]"></div>

                {/* Theme-based ambient glow */}
                <div className={`absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full mix-blend-screen opacity-20 pointer-events-none`} style={{ backgroundColor: config.hex }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] opacity-90"></div>
            </div>

            {/* Background Typography Watermark */}
            <div className="fixed top-1/2 right-[-5%] -translate-y-1/2 z-0 pointer-events-none opacity-[0.03] select-none">
                <h1 className="font-black italic text-[25vw] leading-none tracking-tighter whitespace-nowrap rotate-90 transform origin-center">
                    {config.bgText}
                </h1>
            </div>

            <main className="relative z-20 flex-1 w-full max-w-[1400px] mx-auto px-6 md:px-12 pt-12 md:pt-24 pb-32">
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col">

                    {/* HEADER */}
                    <motion.header variants={slamLeft} className="mb-16 relative">
                        <div className="flex items-end gap-6 mb-4">
                            <div className="w-16 h-1 bg-white mb-4 shadow-[0_0_15px_white]"></div>
                            <div className={`font-mono text-xs tracking-[0.4em] font-bold uppercase border border-white/20 px-4 py-1 skew-x-[-10deg] ${config.themeColor}`}>
                                <span className="skew-x-[10deg] block">DIRECTORY // {config.category}</span>
                            </div>
                        </div>

                        <h1 className="font-black italic text-3xl sm:text-5xl md:text-7xl uppercase tracking-tighter skew-x-[-6deg] leading-none mix-blend-difference drop-shadow-[4px_4px_0px_rgba(255,255,255,0.1)]">
                            MISSION_BRIEFING
                        </h1>
                    </motion.header>

                    {/* LOADING */}
                    {loading && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 space-y-8">
                                <div className="h-64 bg-[#0A0A0A] border border-white/5 animate-pulse" style={{ clipPath: "polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 40px 100%, 0 calc(100% - 40px))" }}></div>
                            </div>
                            <div className="lg:col-span-4 space-y-8">
                                <div className="h-48 bg-[#0A0A0A] border border-white/5 animate-pulse"></div>
                            </div>
                        </div>
                    )}

                    {/* ERROR */}
                    {error && !loading && (
                        <motion.div variants={slamUp} className="w-full bg-[#0A0A0A] p-10 border-l-8 border-[#FF003C] shadow-[0_0_40px_rgba(255,0,60,0.2)]">
                            <p className="font-mono text-[#FF003C] text-sm tracking-widest uppercase mb-4 flex items-center gap-3">
                                <span className="material-symbols-outlined">warning</span> TRANSMISSION_FAILURE
                            </p>
                            <p className="text-white/60 mb-6">{error}</p>
                            <button onClick={() => navigate(-1)} className="bg-white text-black font-black italic px-6 py-3 uppercase tracking-tighter hover:bg-[#FF003C] hover:text-white transition-colors skew-x-[-10deg]">
                                <span className="skew-x-[10deg] block">RETURN TO SEQUENCE</span>
                            </button>
                        </motion.div>
                    )}

                    {/* CONTENT */}
                    {!loading && !error && scenario && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative z-10">

                            {/* Left: Narrative + Objectives */}
                            <motion.div variants={slamUp} className="lg:col-span-8 flex flex-col gap-12">

                                {/* Situation Report */}
                                <div
                                    className={`relative bg-[#0A0A0A] border ${config.borderTheme}/30 shadow-[15px_15px_0px_rgba(0,0,0,0.8)] p-6 sm:p-10 md:p-14`}
                                    style={{ clipPath: "polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 40px 100%, 0 calc(100% - 40px))" }}
                                >
                                    {/* Abstract watermark */}
                                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                        <span className="material-symbols-outlined text-[10rem]">security</span>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="font-mono text-[10px] text-white/40 tracking-[0.4em] uppercase">
                                                {scenario.type?.toUpperCase()} // {scenario.difficulty?.toUpperCase()}
                                            </span>
                                        </div>
                                        <h2 className="font-black italic text-2xl sm:text-4xl md:text-5xl uppercase mb-4 text-white tracking-tighter">
                                            {scenario.title}
                                        </h2>
                                        <h3 className={`font-mono text-sm font-bold uppercase mb-8 ${config.themeColor} tracking-[0.2em]`}>
                                            SITUATION_REPORT
                                        </h3>
                                        <p className="font-sans text-base sm:text-lg md:text-xl text-white/80 leading-relaxed font-medium">
                                            {scenario.mission_brief}
                                        </p>
                                    </div>

                                    {/* Threat level bar */}
                                    <div className="mt-16 flex items-center gap-6 bg-[#050505] p-4 border border-white/5 skew-x-[5deg]">
                                        <div className="h-1 flex-1 bg-white/10 relative overflow-hidden skew-x-[-5deg]">
                                            <div className={`absolute top-0 left-0 h-full ${threatCfg.bar} ${threatCfg.width} shadow-[0_0_10px_currentColor] animate-[scan_2s_ease-in-out_infinite]`}></div>
                                        </div>
                                        <span className={`font-mono ${threatCfg.color} text-[10px] font-bold tracking-[0.3em] uppercase skew-x-[-5deg] shrink-0`}>
                                            THREAT_LEVEL: {threatCfg.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Objectives */}
                                <div className="bg-[#050505] border border-white/10 p-10 relative">
                                    <div className="absolute -left-1 top-10 w-2 h-16 bg-[#00FFFF]"></div>
                                    <h3 className="font-mono text-sm font-bold text-[#00FFFF] mb-10 uppercase tracking-[0.2em] flex items-center gap-3">
                                        <span className="w-2 h-2 bg-[#00FFFF] shadow-[0_0_8px_#00FFFF] animate-pulse"></span>
                                        PRIMARY_OBJECTIVES
                                    </h3>

                                    {objectives.length === 0 ? (
                                        <div className="font-mono text-white/40 text-xs tracking-[0.3em] uppercase p-6 border border-white/5 bg-[#0A0A0A]">
                                            [SYS_ERR] // NO_OBJECTIVES_FOUND
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {objectives.map((obj, i) => (
                                                <div key={obj.objective_id} className="flex items-start gap-6 group">
                                                    <div className="w-10 h-10 border border-[#00FFFF]/30 flex-shrink-0 flex items-center justify-center -skew-x-12 group-hover:bg-[#00FFFF]/10 group-hover:border-[#00FFFF] transition-all bg-[#0A0A0A]">
                                                        <span className="font-mono text-[10px] text-[#00FFFF] font-bold">
                                                            {String(i + 1).padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="font-black italic text-xl text-white tracking-tight uppercase group-hover:text-[#00FFFF] transition-colors">
                                                            {obj.title}
                                                        </span>
                                                        <p className="font-sans text-sm text-white/50 mt-2 leading-relaxed">
                                                            {obj.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Right: Mode Info + CTA */}
                            <motion.div variants={slamUp} className="lg:col-span-4 flex flex-col gap-8">

                                {/* Mode Indicator */}
                                <div className="bg-[#0A0A0A] border-t-4 border-[#00FFFF] p-8 shadow-[10px_10px_0px_rgba(0,0,0,0.5)]">
                                    <div className="font-mono text-[10px] text-white/40 uppercase tracking-[0.3em] mb-4">
                                        SELECTED_MODE
                                    </div>
                                    <div className="font-black italic text-4xl text-white uppercase tracking-tighter mb-4 flex items-center gap-3">
                                        {mode === 'timed' ? (
                                            <><span className="material-symbols-outlined text-[#FF003C] text-4xl">timer</span> TIMED</>
                                        ) : (
                                            <><span className="material-symbols-outlined text-[#00FFFF] text-4xl">all_inclusive</span> FREE</>
                                        )}
                                    </div>
                                    <p className="font-sans text-sm text-white/50 leading-relaxed border-l-2 border-white/10 pl-4">
                                        {mode === 'timed'
                                            ? 'Countdown active. Exiting early discards all progress.'
                                            : 'No time limit. Explore freely at your own pace.'
                                        }
                                    </p>
                                </div>

                                {/* Start Button */}
                                <button
                                    onClick={handleStart}
                                    className={`w-full py-8 ${config.bgTheme} text-black font-black italic text-3xl uppercase tracking-tighter skew-x-[-10deg] shadow-[15px_15px_0px_black] hover:bg-white hover:shadow-[10px_10px_0px_black] hover:translate-x-1 hover:translate-y-1 transition-all group relative overflow-hidden`}
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                    <span className="skew-x-[10deg] flex items-center justify-center gap-3 relative z-10">
                                        START_INVESTIGATION
                                        <span className="material-symbols-outlined text-4xl group-hover:translate-x-2 transition-transform">bolt</span>
                                    </span>
                                </button>

                                {/* Back Link */}
                                <button
                                    onClick={() => navigate(-1)}
                                    className="font-mono text-[10px] text-white/40 hover:text-white transition-colors tracking-[0.2em] uppercase flex items-center gap-2 mt-4 px-4 py-2 border border-white/5 bg-[#050505] w-fit"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    BACK TO SEQUENCE
                                </button>
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </main>

            {/* FLOATING HUD (Bottom Right) */}
            <div className="fixed bottom-10 right-10 flex flex-col gap-3 items-end z-40 pointer-events-none">
                <div
                    className="bg-[#050505]/90 backdrop-blur-md px-6 py-3 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                    style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)" }}
                >
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-[#00FFFF] shadow-[0_0_8px_#00FFFF] animate-pulse"></span>
                        <span className="font-mono text-[10px] text-white tracking-[0.2em] font-bold uppercase">UPLINK_SECURE</span>
                    </div>
                </div>
                <div className="font-mono text-white/40 font-bold px-4 py-1 text-[9px] tracking-widest uppercase bg-[#0A0A0A] border border-white/5">
                    LATENCY: 14ms // TRACE_LEVEL: 0%
                </div>
            </div>
        </div>
    );
}