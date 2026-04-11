import React from 'react';
import './MissionDashboard.css';
import { useNavigate } from 'react-router-dom';

export default function InvestigationCategories() {
    const navigate = useNavigate();

    return (
        <div className="categories-wrapper font-body selection:bg-primary-container selection:text-white">

            {/* MAIN CONTENT CANVAS */}
            <main className="pt-0 pl-[300px] px-6 md:px-0 pb-16 overflow-x-hidden">
                <div className="absolute inset-0 bg-noise pointer-events-none"></div>

                {/* DECORATIVE BACKGROUND ELEMENTS */}
                <div className="absolute -top-20 -right-20 w-90 h-96 bg-[#FF003C]/10 blur-[100px] rounded-full"></div>
                <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-secondary/5 blur-[80px] rounded-full"></div>

                <div className="px-12 py-8 relative z-10">
                    <div className="mb-16">
                        <h1 className="text-7xl font-headline font-black italic uppercase tracking-tighter text-white skew-x-[-6deg] mb-2">
                            SELECT_YOUR_<span className="text-[#FF003C]">TARGET</span>
                        </h1>
                        <div className="h-1 w-48 bg-secondary"></div>
                        <p className="mt-4 font-label text-zinc-400 uppercase tracking-widest max-w-xl">
                            Choose an investigation vector to begin the extraction. Every protocol requires specific tactical alignment.
                        </p>
                    </div>

                    {/* ASYMMETRICAL PANELS */}
                    <div className="flex flex-col lg:flex-row gap-16 items-start">

                        {/* TYPE 1: BRUTE FORCE */}
                        <div className="group relative w-full lg:w-[55%] transition-all duration-500 hover:-translate-y-2">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#FF003C] to-transparent opacity-30 blur-xl group-hover:opacity-60 transition-opacity"></div>
                            <div className="relative bg-zinc-950 slashed-card-tr border-l-8 border-[#FF003C] p-1">
                                <div className="bg-surface-container-low p-12 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF003C]/5 -skew-x-12 translate-x-1/2 -translate-y-1/2"></div>

                                    <div className="flex justify-between items-start mb-8">
                                        <span className="font-label text-secondary text-xs tracking-[0.5em] font-bold uppercase">PROTOCOL // 001-ALPHA</span>
                                        <span className="material-symbols-outlined text-[#FF003C] text-4xl">password</span>
                                    </div>

                                    <h2 className="text-6xl font-headline font-black italic uppercase tracking-tighter text-white mb-6 skew-x-[-10deg] group-hover:text-[#FF003C] transition-colors">
                                        BRUTE FORCE
                                    </h2>

                                    <div className="space-y-4 mb-12">
                                        <p className="text-zinc-300 font-body text-lg leading-relaxed max-w-md">
                                            Analyze and execute massive-scale login breaches. Identify weak vectors for <span className="text-[#FF003C] font-bold">credential stuffing</span> and dictionary-based extraction protocols.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-surface-container-highest font-label text-[10px] text-zinc-400 tracking-tighter">AUTHENTICATION_STRESS</span>
                                            <span className="px-3 py-1 bg-surface-container-highest font-label text-[10px] text-zinc-400 tracking-tighter">DICTIONARY_MAPPING</span>
                                            <span className="px-3 py-1 bg-surface-container-highest font-label text-[10px] text-zinc-400 tracking-tighter">SESSION_HIJACK</span>
                                        </div>
                                    </div>

                                    {/* Pushes parameter 'bruteforce' */}
                                    <button
                                        onClick={() => navigate('/sequence/bruteforce')}
                                        className="relative w-full py-6 parallelogram bg-[#FF003C] text-on-primary-container font-headline font-black text-2xl italic tracking-widest uppercase overflow-hidden transition-all group-hover:scale-105 group-hover:shadow-[20px_20px_0px_rgba(255,0,60,0.2)]"
                                    >
                                        <span className="relative z-10">SELECT PROTOCOL</span>
                                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -bottom-6 -right-6 bg-secondary text-black font-label font-bold px-4 py-2 text-sm skew-x-[-15deg] shadow-xl">
                                DIFFICULTY: HIGH_IMPACT
                            </div>
                        </div>

                        {/* TYPE 2: SUSPICIOUS SCRIPT EXECUTION */}
                        <div className="group relative w-full lg:w-[45%] lg:mt-24 transition-all duration-500 hover:-translate-y-2">
                            <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-transparent opacity-10 blur-xl group-hover:opacity-30 transition-opacity"></div>
                            <div className="relative bg-zinc-950 slashed-card-bl border-r-8 border-secondary p-1">
                                <div className="bg-surface-container p-10 overflow-hidden relative">
                                    <div className="absolute -top-10 -left-10 w-40 h-40 border border-white/5 rotate-45 pointer-events-none"></div>

                                    <div className="flex justify-between items-start mb-8">
                                        <span className="font-label text-[#FF003C] text-xs tracking-[0.5em] font-bold uppercase">PROTOCOL // 004-GAMMA</span>
                                        <span className="material-symbols-outlined text-secondary text-4xl">terminal</span>
                                    </div>

                                    <h2 className="text-4xl font-headline font-black italic uppercase tracking-tighter text-white mb-6 skew-x-[-8deg] group-hover:text-secondary transition-colors">
                                        SUSPICIOUS<br />SCRIPT_EXEC
                                    </h2>

                                    <div className="space-y-4 mb-12">
                                        <p className="text-zinc-400 font-body text-base leading-relaxed">
                                            Deep-dive malware analysis and shell-script decryption. Trace <span className="text-secondary">obfuscated payloads</span> and dismantle lateral movement scripts in real-time.
                                        </p>
                                        <ul className="space-y-2 font-label text-xs text-zinc-500 uppercase tracking-wider">
                                            <li className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-secondary"></div> DE-OBFUSCATION_ENGINE_V4
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-secondary"></div> HEURISTIC_PATTERN_MATCH
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Pushes parameter 'script' */}
                                    <button
                                        onClick={() => navigate('/sequence/script')}
                                        className="relative w-full py-5 border-4 border-secondary text-secondary font-headline font-black text-xl italic tracking-widest uppercase hover:bg-secondary hover:text-black transition-all"
                                    >
                                        SELECT PROTOCOL
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -top-6 -left-6 bg-zinc-900 border border-secondary text-secondary font-label font-bold px-4 py-2 text-sm skew-x-[15deg]">
                                TYPE: MALWARE_TRIAGE
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}