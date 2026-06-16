import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchScenariosByType } from '../../../services/scenarioService';
import { motion } from 'framer-motion';

// ── Visual config per type ──────────────────────────────────────────────────
const TYPE_CONFIG = {
    bruteforce: {
        titleBase: 'BRUTE',
        titleHighlight: 'FORCE',
        hex: '#FF003C',
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
        hex: '#00FFFF',
        themeColor: 'text-[#00FFFF]',
        bgTheme: 'bg-[#00FFFF]',
        borderTheme: 'border-[#00FFFF]',
        category: 'PROTOCOL_004',
        bgText: 'ANALYZE',
        description: 'Deep-dive malware analysis and shell-script decryption. Trace obfuscated payloads and dismantle lateral movement scripts in real-time.',
    },
    ssh_forensics: {
        titleBase: 'SSH',
        titleHighlight: 'FORENSICS',
        hex: '#00FF00',
        themeColor: 'text-[#00FF00]',
        bgTheme: 'bg-[#00FF00]',
        borderTheme: 'border-[#00FF00]',
        category: 'PROTOCOL_009',
        bgText: 'INVESTIGATE',
        description: 'Trace unauthorized access and lateral movement through secure shell logs. Analyze session fingerprints and uncover the origin of the intrusion.',
    },
};

const DIFF_CONFIG = {
    easy: { label: 'EASY', color: 'bg-white text-black', targetDiff: 'LOW_SEC' },
    medium: { label: 'MEDIUM', color: 'bg-[#00FFFF] text-black', targetDiff: 'MID_TIER' },
    hard: { label: 'HARD', color: 'bg-[#FF003C] text-white', targetDiff: 'ULTRA_SEC' },
};

export default function MissionSequence() {
    const { type } = useParams();
    const navigate = useNavigate();
    const config = TYPE_CONFIG[type?.toLowerCase()];

    const [scenarios, setScenarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMode, setSelectedMode] = useState({});
    const [isNavigating, setIsNavigating] = useState(false);

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

    // ── Fetch levels for this type ──────────────────────────────────────────
    useEffect(() => {
        if (!config) return;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchScenariosByType(type);
                setScenarios(data.scenarios);

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
    }, [type, config]);

    if (!config) return null;

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
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white selection:text-black relative flex flex-col">

            {/* ==========================================
                THE VOID: Background & Grids
                ========================================== */}
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

            <main className="relative z-20 flex-1 w-full max-w-[1400px] mx-auto px-6 md:px-12 pt-24 pb-32">
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col">

                    {/* ==========================================
                        HEADER (Cinematic Mission Folder)
                        ========================================== */}
                    <motion.header variants={slamLeft} className="mb-24 relative">
                        <div className="flex items-end gap-6 mb-4">
                            <div className="w-16 h-1 bg-white mb-4 shadow-[0_0_15px_white]"></div>
                            <div className={`font-mono text-xs tracking-[0.4em] font-bold uppercase border border-white/20 px-4 py-1 skew-x-[-10deg] ${config.themeColor}`}>
                                <span className="skew-x-[10deg] block">DIRECTORY // {config.category}</span>
                            </div>
                        </div>

                        <h1 className="font-black italic text-4xl sm:text-6xl md:text-8xl lg:text-[10rem] uppercase tracking-tighter skew-x-[-6deg] leading-none mix-blend-difference drop-shadow-[4px_4px_0px_rgba(255,255,255,0.1)]">
                            {config.titleBase}<br />
                            <span style={{ color: config.hex }}>{config.titleHighlight}</span>
                        </h1>

                        <p className="mt-8 font-mono text-sm text-white/50 max-w-2xl leading-relaxed tracking-widest uppercase border-l-2 border-white/20 pl-6">
                            {config.description}
                        </p>
                    </motion.header>

                    {/* ==========================================
                        MISSION SEQUENCE (Asymmetric Left-Spine)
                        ========================================== */}
                    <div className="relative">
                        {/* The Spine */}
                        <div className="absolute left-4 md:left-[88px] top-0 bottom-0 w-1 bg-gradient-to-b from-white/20 via-white/5 to-transparent z-0 hidden md:block"></div>

                        {loading && (
                            <div className="flex flex-col gap-12 mt-12 relative z-10">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-full md:w-[700px] md:ml-[160px] h-64 bg-[#0A0A0A] border border-white/5 animate-pulse" style={{ clipPath: "polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 40px 100%, 0 calc(100% - 40px))" }}></div>
                                ))}
                            </div>
                        )}

                        {error && !loading && (
                            <motion.div variants={slamUp} className="w-full md:w-[700px] md:ml-[160px] bg-[#0A0A0A] p-10 border-l-8 border-[#FF003C] shadow-[0_0_40px_rgba(255,0,60,0.2)]">
                                <p className="font-mono text-[#FF003C] text-sm tracking-widest uppercase mb-4 flex items-center gap-3">
                                    <span className="material-symbols-outlined">warning</span> TRANSMISSION_ERROR
                                </p>
                                <p className="text-white/60 mb-6">{error}</p>
                                <button onClick={() => window.location.reload()} className="bg-white text-black font-black italic px-6 py-3 uppercase tracking-tighter hover:bg-[#FF003C] hover:text-white transition-colors skew-x-[-10deg]">
                                    <span className="skew-x-[10deg] block">RETRY UPLINK</span>
                                </button>
                            </motion.div>
                        )}

                        {!loading && !error && (
                            <div className="flex flex-col gap-16 md:gap-24 relative z-10">
                                {scenarios.map((scenario, index) => {
                                    const diffCfg = DIFF_CONFIG[scenario.difficulty?.toLowerCase()] || DIFF_CONFIG.easy;
                                    const isLocked = index > 0; // TODO: Real logic
                                    const mode = selectedMode[scenario.scenario_id] || 'free';

                                    // Alternating offset for visual tension
                                    const offsetClass = index % 2 === 0 ? "md:ml-[160px]" : "md:ml-[240px]";

                                    return (
                                        <motion.section key={scenario.scenario_id} variants={slamUp} className={`relative flex items-center ${offsetClass}`}>

                                            {/* Sequence Node Indicator (Desktop) */}
                                            <div className="hidden md:flex absolute -left-[160px] top-1/2 -translate-y-1/2 items-center justify-center w-20 h-20 bg-[#050505] border border-white/20 skew-x-[-10deg] z-20">
                                                <span className={`font-black italic text-3xl skew-x-[10deg] ${isLocked ? 'text-white/20' : 'text-white'}`}>
                                                    {String(index + 1).padStart(2, '0')}
                                                </span>
                                                {/* Connecting horizontal line */}
                                                <div className="absolute right-[-40px] w-10 h-1 bg-white/20"></div>
                                            </div>

                                            {/* The Card */}
                                            <div
                                                className={`w-full xl:w-[800px] relative transition-all duration-500 ${isLocked ? 'grayscale opacity-60' : 'hover:-translate-y-2'} shadow-[15px_15px_0px_rgba(0,0,0,0.8)]`}
                                            >
                                                {/* Ambient Glow for unlocked */}
                                                {!isLocked && (
                                                    <div className="absolute -inset-2 blur-xl opacity-20 pointer-events-none" style={{ backgroundColor: config.hex }}></div>
                                                )}

                                                <div
                                                    className={`relative flex flex-col bg-[#0A0A0A] border ${isLocked ? 'border-white/5' : `border-[${config.hex}]/30`}`}
                                                    style={{ clipPath: "polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 40px 100%, 0 calc(100% - 40px))" }}
                                                >
                                                    {/* Lock Overlay */}
                                                    {isLocked && (
                                                        <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center border border-white/10">
                                                            <span className="material-symbols-outlined text-6xl text-white/20 mb-4">lock</span>
                                                            <div className="font-mono text-white/40 text-xs font-bold tracking-[0.2em] uppercase bg-black px-4 py-2 border border-white/10">
                                                                PREREQUISITE // LEVEL {index} REQUIRED
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Card Content Layer */}
                                                    <div className="p-6 sm:p-8 md:p-10 relative z-20">
                                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                                                            <div>
                                                                <span className={`font-mono text-[10px] tracking-[0.3em] font-bold block mb-3 uppercase ${isLocked ? 'text-white/30' : config.themeColor}`}>
                                                                    SEQUENCE_{String(index + 1).padStart(3, '0')}
                                                                </span>
                                                                <h3 className={`font-black italic text-2xl sm:text-3xl md:text-5xl uppercase tracking-tighter ${isLocked ? 'text-white/40' : 'text-white'}`}>
                                                                    {scenario.title}
                                                                </h3>
                                                            </div>
                                                            <div className={`${diffCfg.color} font-mono font-bold px-4 py-1.5 text-[10px] tracking-widest skew-x-[-10deg] shrink-0 shadow-[4px_4px_0px_black]`}>
                                                                <span className="skew-x-[10deg] block">DIFF: {diffCfg.label}</span>
                                                            </div>
                                                        </div>

                                                        <p className={`font-sans text-sm md:text-base leading-relaxed mb-10 max-w-2xl ${isLocked ? 'text-white/30' : 'text-white/60'}`}>
                                                            {scenario.mission_brief}
                                                        </p>

                                                        {/* Metadata Matrix */}
                                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                                            <div className="bg-[#050505] border border-white/5 p-4 skew-x-[5deg]">
                                                                <span className="block font-mono text-[9px] uppercase text-white/40 tracking-widest skew-x-[-5deg] mb-1">Target Infrastructure</span>
                                                                <span className={`block font-black italic text-xl uppercase tracking-tighter skew-x-[-5deg] ${isLocked ? 'text-white/30' : config.themeColor}`}>{diffCfg.targetDiff}</span>
                                                            </div>
                                                            <div className="bg-[#050505] border border-white/5 p-4 skew-x-[5deg]">
                                                                <span className="block font-mono text-[9px] uppercase text-white/40 tracking-widest skew-x-[-5deg] mb-1">Execution Vector</span>
                                                                <span className={`block font-black italic text-xl uppercase tracking-tighter skew-x-[-5deg] ${isLocked ? 'text-white/30' : 'text-white'}`}>{scenario.type}</span>
                                                            </div>
                                                        </div>

                                                        {/* Interactive Elements (Unlocked Only) */}
                                                        {!isLocked && (
                                                            <div className="space-y-6 mt-auto">
                                                                {/* Tactical Mode Toggle */}
                                                                <div className="flex gap-4 p-2 bg-[#050505] border border-white/10 skew-x-[-5deg]">
                                                                    <button
                                                                        onClick={() => toggleMode(scenario.scenario_id)}
                                                                        className={`flex-1 py-3 font-mono text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${mode === 'free' ? `${config.bgTheme} text-black` : 'bg-transparent text-white/40 hover:text-white'}`}
                                                                    >
                                                                        <span className="skew-x-[5deg] block">FREE_MODE</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => toggleMode(scenario.scenario_id)}
                                                                        className={`flex-1 py-3 font-mono text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${mode === 'timed' ? `${config.bgTheme} text-black` : 'bg-transparent text-white/40 hover:text-white'}`}
                                                                    >
                                                                        <span className="skew-x-[5deg] block">TIMED_MODE</span>
                                                                    </button>
                                                                </div>

                                                                {/* Deploy CTA */}
                                                                <button
                                                                    onClick={() => handleDeploy(scenario)}
                                                                    className={`w-full py-4 sm:py-5 ${config.bgTheme} text-black font-black italic text-lg sm:text-2xl uppercase tracking-tighter skew-x-[-10deg] shadow-[8px_8px_0px_black] hover:bg-white transition-all group flex items-center justify-between px-6 sm:px-8`}
                                                                >
                                                                    <span className="skew-x-[10deg] block">INITIATE DEPLOYMENT</span>
                                                                    <span className="skew-x-[10deg] material-symbols-outlined text-2xl sm:text-3xl group-hover:translate-x-2 transition-transform">arrow_forward</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.section>
                                    );
                                })}

                                {scenarios.length === 0 && (
                                    <div className="font-mono text-white/40 text-xs tracking-[0.3em] uppercase p-10 border border-white/10 bg-[#0A0A0A] max-w-xl">
                                        [SYS_ERR] // NO_VECTORS_FOUND // AWAITING_SERVER_UPLINK
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </main>

            {/* ==========================================
                FLOATING HUD (Bottom Right)
                ========================================== */}
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