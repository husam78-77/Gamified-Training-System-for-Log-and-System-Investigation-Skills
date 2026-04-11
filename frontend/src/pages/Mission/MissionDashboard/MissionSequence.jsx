import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import './MissionSequence.css';

// 🧠 Centralized Configuration Dictionary
const missionData = {
    bruteforce: {
        titleBase: "BRUTE",
        titleHighlight: "FORCE",
        themeColor: "text-[#FF003C]",
        bgTheme: "bg-[#FF003C]",
        borderTheme: "border-[#FF003C]",
        category: "CATEGORY_X04",
        description: "Systematic exploitation of weak authentication protocols. High noise, high reward. Break the door down.",
        bgText: "BREACH",
        levels: [
            { id: "001", title: "The Front Door", difficulty: "EASY", diffColor: "bg-[#FF003C] text-black", targetDiff: "LOW_SEC", xp: "500 XP", desc: "A basic login portal with zero rate-limiting. Perfect for testing your primary dictionary attacks.", locked: false },
            { id: "002", title: "Admin Breach", difficulty: "MEDIUM", diffColor: "bg-zinc-700 text-zinc-400", targetDiff: "MID_TIER", xp: "1,250 XP", desc: "The secondary admin console. Enhanced monitoring and IP blacklisting in effect. Precision is required.", locked: true },
            { id: "003", title: "The Core Vault", difficulty: "HARD", diffColor: "bg-zinc-800 text-zinc-600", targetDiff: "ULTRA_SEC", xp: "5,000 XP", desc: "The ultimate prize. 2FA enabled, adaptive honey-pots, and real-time response agents.", locked: true }
        ]
    },
    script: {
        titleBase: "SUSPICIOUS",
        titleHighlight: "SCRIPT",
        themeColor: "text-[#00FFFF]", // Using Cyan/Secondary
        bgTheme: "bg-[#00FFFF]",
        borderTheme: "border-[#00FFFF]",
        category: "PROTOCOL_004",
        description: "Deep-dive malware analysis and shell-script decryption. Trace obfuscated payloads and dismantle lateral movement scripts in real-time.",
        bgText: "ANALYZE",
        levels: [
            { id: "001", title: "Payload Entry", difficulty: "EASY", diffColor: "bg-[#00FFFF] text-black", targetDiff: "LOW_SEC", xp: "600 XP", desc: "Analyze a dropped dropper script. De-obfuscate the base64 layers.", locked: false },
            { id: "002", title: "Lateral Pivot", difficulty: "MEDIUM", diffColor: "bg-zinc-700 text-zinc-400", targetDiff: "MID_TIER", xp: "1,500 XP", desc: "Trace the script's attempt to pivot across the internal network. Identify the C2 server.", locked: true },
            { id: "003", title: "Kernel Hook", difficulty: "HARD", diffColor: "bg-zinc-800 text-zinc-600", targetDiff: "ULTRA_SEC", xp: "6,000 XP", desc: "Dismantle the rootkit installation routine before persistence is permanently achieved.", locked: true }
        ]
    }
};

export default function MissionSequence() {
    // Read the dynamic parameter from the URL
    const { type } = useParams();

    // Fetch configuration based on the URL parameter
    const config = missionData[type?.toLowerCase()];

    // Fallback if user types an invalid URL (e.g. /sequence/invalid)
    if (!config) {
        return <Navigate to="/mission" replace />;
    }

    return (
        <div className="mission-wrapper font-body selection:bg-primary-container selection:text-white">
            <main className="pt-10 pl-[300px] px-6 md:px-6 pb-16 overflow-x-hidden">
                <div className="fixed inset-0 pointer-events-none opacity-10 diagonal-path"></div>

                {/* DYNAMIC HEADER */}
                <header className="mb-16 relative">
                    <h1 className="font-headline font-black italic text-7xl md:text-9xl text-white uppercase tracking-tighter persona-tilt leading-none">
                        {config.titleBase} <span className={config.themeColor}>{config.titleHighlight}</span>
                    </h1>
                    <div className="absolute -top-4 -left-4 font-label text-[#00FFFF] text-sm tracking-[0.5em] font-bold">{config.category}</div>
                    <p className="font-label mt-6 text-zinc-400 max-w-xl text-lg persona-tilt-alt">
                        {config.description}
                    </p>
                </header>

                {/* DYNAMIC MISSION PATH */}
                <div className="flex flex-col gap-24 relative z-10">
                    {config.levels.map((level, index) => {
                        const isEven = index % 2 !== 0;
                        const translateClass = index === 0 ? 'md:translate-x-0' : (isEven ? 'md:-translate-x-12' : 'md:translate-x-12');

                        return (
                            <section key={level.id} className={`flex flex-col ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 ${translateClass}`}>
                                <div className={`w-full md:w-[600px] slashed-card p-8 relative border-l-8 ${level.locked ? 'bg-surface-container-low opacity-80 border-zinc-700' : `bg-surface-container-high ${config.borderTheme} hover:bg-surface-container-highest`} transition-colors`}>

                                    {/* Lock Overlay */}
                                    {level.locked && (
                                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-[2px]">
                                            <span className={`material-symbols-outlined text-7xl ${index === 2 ? 'text-zinc-700' : config.themeColor} mb-4`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                                {index === 2 ? 'encrypted' : 'lock'}
                                            </span>
                                            <div className={`font-label ${index === 2 ? 'text-zinc-600' : config.themeColor} text-sm font-bold tracking-widest uppercase`}>
                                                {index === 2 ? 'ENCRYPTED DATA' : `Prerequisite: Level ${index}`}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <span className={`font-label text-xs tracking-widest block mb-2 ${level.locked ? 'text-zinc-600' : 'text-[#00FFFF]'}`}>
                                                SEQUENCE_{level.id}
                                            </span>
                                            <h3 className={`font-headline font-black italic text-4xl uppercase ${level.locked ? 'text-zinc-500' : 'text-white'}`}>
                                                {level.title}
                                            </h3>
                                        </div>
                                        <div className={`${level.diffColor} font-label font-bold px-3 py-1 text-xs skew-x-[-15deg]`}>
                                            {level.difficulty}
                                        </div>
                                    </div>

                                    <p className={`font-body mb-8 leading-relaxed ${level.locked ? 'text-zinc-600' : 'text-zinc-300'}`}>
                                        {level.desc}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className={`p-4 ${level.locked ? 'bg-black/20' : 'bg-black/40 border-b border-zinc-700'}`}>
                                            <span className={`font-label text-[10px] uppercase block ${level.locked ? 'text-zinc-700' : 'text-zinc-500'}`}>Target Difficulty</span>
                                            <span className={`font-headline font-bold text-xl ${level.locked ? 'text-zinc-700' : 'text-[#00FFFF]'}`}>{level.targetDiff}</span>
                                        </div>
                                        <div className={`p-4 ${level.locked ? 'bg-black/20' : 'bg-black/40 border-b border-zinc-700'}`}>
                                            <span className={`font-label text-[10px] uppercase block ${level.locked ? 'text-zinc-700' : 'text-zinc-500'}`}>Reward XP</span>
                                            <span className={`font-headline font-bold text-xl ${level.locked ? 'text-zinc-700' : 'text-white'}`}>{level.xp}</span>
                                        </div>
                                    </div>

                                    {level.locked ? (
                                        <button className="w-full bg-zinc-800 text-zinc-600 font-headline font-black italic py-4 skew-x-[-10deg] text-xl uppercase tracking-widest cursor-not-allowed" disabled>
                                            DEPLOY MISSION
                                        </button>
                                    ) : (
                                        <button className={`w-full ${config.bgTheme} text-black font-headline font-black italic py-4 skew-x-[-10deg] hover:scale-105 transition-all text-xl uppercase tracking-widest group`}>
                                            <span className="group-hover:animate-pulse">DEPLOY MISSION</span>
                                        </button>
                                    )}

                                    {!level.locked && (
                                        <div className="absolute -right-4 -bottom-4 font-headline text-8xl text-white/5 font-black italic select-none">01</div>
                                    )}
                                </div>

                                {/* Connecting Line (Hide on last element) */}
                                {index < config.levels.length - 1 && (
                                    <div className={`hidden md:block w-32 h-px relative ${level.locked ? 'bg-zinc-700' : config.bgTheme}`}>
                                        <div className={`absolute ${isEven ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 w-4 h-4 rotate-45 ${level.locked ? 'bg-zinc-700' : config.bgTheme}`}></div>
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>

                {/* Decorative Elements */}
                <div className="fixed bottom-10 right-10 flex flex-col gap-2 items-end z-30 pointer-events-none persona-tilt">
                    <div className={`${config.bgTheme} text-black font-headline font-black px-8 py-2 italic text-2xl uppercase shadow-[10px_10px_0px_#00FFFF]`}>
                        ACTIVE_LINK: ESTABLISHED
                    </div>
                    <div className="bg-white text-black font-label font-bold px-4 py-1 text-xs tracking-widest uppercase">
                        LATENCY: 14ms // TRACE_LEVEL: 0%
                    </div>
                </div>

                {/* Large Background Lettering */}
                <div className="fixed top-1/2 -right-20 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none font-headline font-black italic text-[40rem] text-white leading-none rotate-90 overflow-hidden">
                    {config.bgText}
                </div>
            </main>
        </div>
    );
}