import React from 'react';
import './MissionSequence.css';

export default function MissionSequence() {
    return (
        <div className="mission-wrapper font-body selection:bg-primary-container selection:text-white">
            {/* Main Content Canvas */}
            <main className="pt-10 pl-[300px] px-6 md:px-6 pb-16 overflow-x-hidden">
                {/* Background Grid Effect */}
                <div className="fixed inset-0 pointer-events-none opacity-10 diagonal-path"></div>

                <header className="mb-16 relative">
                    <h1 className="font-headline font-black italic text-7xl md:text-9xl text-white uppercase tracking-tighter persona-tilt leading-none">
                        BRUTE <span className="text-[#FF003C]">FORCE</span>
                    </h1>
                    <div className="absolute -top-4 -left-4 font-label text-[#00FFFF] text-sm tracking-[0.5em] font-bold">CATEGORY_X04</div>
                    <p className="font-label mt-6 text-zinc-400 max-w-xl text-lg persona-tilt-alt">
                        Systematic exploitation of weak authentication protocols. High noise, high reward. Break the door down.
                    </p>
                </header>

                {/* Mission Path */}
                <div className="flex flex-col gap-24 relative z-10">

                    {/* Level 1: UNLOCKED */}
                    <section className="flex flex-col md:flex-row items-center gap-8 md:translate-x-0">
                        <div className="w-full md:w-[600px] bg-surface-container-high slashed-card p-8 relative border-l-8 border-[#FF003C] hover:bg-surface-container-highest transition-colors">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="font-label text-[#00FFFF] text-xs tracking-widest block mb-2">SEQUENCE_001</span>
                                    <h3 className="font-headline font-black italic text-4xl text-white uppercase">The Front Door</h3>
                                </div>
                                <div className="bg-[#FF003C] text-black font-label font-bold px-3 py-1 text-xs skew-x-[-15deg]">EASY</div>
                            </div>
                            <p className="font-body text-zinc-300 mb-8 leading-relaxed">
                                A basic login portal with zero rate-limiting. Perfect for testing your primary dictionary attacks.
                            </p>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-black/40 p-4 border-b border-zinc-700">
                                    <span className="font-label text-[10px] text-zinc-500 uppercase block">Target Difficulty</span>
                                    <span className="font-headline font-bold text-xl text-[#00FFFF]">LOW_SEC</span>
                                </div>
                                <div className="bg-black/40 p-4 border-b border-zinc-700">
                                    <span className="font-label text-[10px] text-zinc-500 uppercase block">Reward XP</span>
                                    <span className="font-headline font-bold text-xl text-white">500 XP</span>
                                </div>
                            </div>
                            <button className="w-full bg-[#FF003C] text-black font-headline font-black italic py-4 skew-x-[-10deg] hover:scale-105 transition-all text-xl uppercase tracking-widest group">
                                <span className="group-hover:animate-pulse">DEPLOY MISSION</span>
                            </button>
                            <div className="absolute -right-4 -bottom-4 font-headline text-8xl text-white/5 font-black italic select-none">01</div>
                        </div>

                        <div className="hidden md:block w-32 h-px bg-[#FF003C] relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#FF003C] rotate-45"></div>
                        </div>
                    </section>

                    {/* Level 2: LOCKED */}
                    <section className="flex flex-col md:flex-row-reverse items-center gap-8 md:-translate-x-12">
                        <div className="w-full md:w-[600px] bg-surface-container-low slashed-card p-8 relative opacity-80 border-l-8 border-zinc-700">
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-[2px]">
                                <span className="material-symbols-outlined text-7xl text-[#FF003C] mb-4" data-icon="lock_open" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                                <div className="font-label text-[#FF003C] text-sm font-bold tracking-widest uppercase">Prerequisite: Level 1</div>
                            </div>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="font-label text-zinc-500 text-xs tracking-widest block mb-2 text-zinc-600">SEQUENCE_002</span>
                                    <h3 className="font-headline font-black italic text-4xl text-zinc-500 uppercase">Admin Breach</h3>
                                </div>
                                <div className="bg-zinc-700 text-zinc-400 font-label font-bold px-3 py-1 text-xs skew-x-[-15deg]">MEDIUM</div>
                            </div>
                            <p className="font-body text-zinc-600 mb-8 leading-relaxed">
                                The secondary admin console. Enhanced monitoring and IP blacklisting in effect. Precision is required.
                            </p>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-black/20 p-4">
                                    <span className="font-label text-[10px] text-zinc-700 uppercase block">Target Difficulty</span>
                                    <span className="font-headline font-bold text-xl text-zinc-700">MID_TIER</span>
                                </div>
                                <div className="bg-black/20 p-4">
                                    <span className="font-label text-[10px] text-zinc-700 uppercase block">Reward XP</span>
                                    <span className="font-headline font-bold text-xl text-zinc-700">1,250 XP</span>
                                </div>
                            </div>
                            <button className="w-full bg-zinc-800 text-zinc-600 font-headline font-black italic py-4 skew-x-[-10deg] text-xl uppercase tracking-widest cursor-not-allowed" disabled>
                                DEPLOY MISSION
                            </button>
                        </div>

                        <div className="hidden md:block w-32 h-px bg-zinc-700 relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-700 rotate-45"></div>
                        </div>
                    </section>

                    {/* Level 3: LOCKED */}
                    <section className="flex flex-col md:flex-row items-center gap-8 md:translate-x-12">
                        <div className="w-full md:w-[600px] bg-surface-container-low slashed-card p-8 relative opacity-60 border-l-8 border-zinc-700">
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-7xl text-zinc-700 mb-4" data-icon="encrypted">encrypted</span>
                                <div className="font-label text-zinc-600 text-sm font-bold tracking-widest uppercase">ENCRYPTED DATA</div>
                            </div>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="font-label text-zinc-500 text-xs tracking-widest block mb-2 text-zinc-700">SEQUENCE_003</span>
                                    <h3 className="font-headline font-black italic text-4xl text-zinc-700 uppercase">The Core Vault</h3>
                                </div>
                                <div className="bg-zinc-800 text-zinc-600 font-label font-bold px-3 py-1 text-xs skew-x-[-15deg]">HARD</div>
                            </div>
                            <p className="font-body text-zinc-700 mb-8 leading-relaxed">
                                The ultimate prize. 2FA enabled, adaptive honey-pots, and real-time response agents.
                            </p>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-black/10 p-4">
                                    <span className="font-label text-[10px] text-zinc-800 uppercase block">Target Difficulty</span>
                                    <span className="font-headline font-bold text-xl text-zinc-800">ULTRA_SEC</span>
                                </div>
                                <div className="bg-black/10 p-4">
                                    <span className="font-label text-[10px] text-zinc-800 uppercase block">Reward XP</span>
                                    <span className="font-headline font-bold text-xl text-zinc-800">5,000 XP</span>
                                </div>
                            </div>
                            <button className="w-full bg-zinc-900 text-zinc-700 font-headline font-black italic py-4 skew-x-[-10deg] text-xl uppercase tracking-widest cursor-not-allowed" disabled>
                                DEPLOY MISSION
                            </button>
                        </div>
                    </section>

                </div>

                {/* Decorative Elements */}
                <div className="fixed bottom-10 right-10 flex flex-col gap-2 items-end z-30 pointer-events-none persona-tilt">
                    <div className="bg-[#FF003C] text-black font-headline font-black px-8 py-2 italic text-2xl uppercase shadow-[10px_10px_0px_#00FFFF]">
                        ACTIVE_LINK: ESTABLISHED
                    </div>
                    <div className="bg-white text-black font-label font-bold px-4 py-1 text-xs tracking-widest uppercase">
                        LATENCY: 14ms // TRACE_LEVEL: 0%
                    </div>
                </div>

                {/* Large Background Lettering */}
                <div className="fixed top-1/2 -right-20 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none font-headline font-black italic text-[40rem] text-white leading-none rotate-90">
                    BREACH
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-zinc-950 flex justify-around items-center h-20 z-50 border-t-4 border-[#FF003C]">
                <button className="text-[#FF003C] flex flex-col items-center">
                    <span className="material-symbols-outlined" data-icon="grid_view">grid_view</span>
                </button>
                <button className="text-white flex flex-col items-center scale-125 bg-[#FF003C] p-3 -mt-10 rounded-none skew-x-[-10deg] shadow-[5px_5px_0px_#00FFFF]">
                    <span className="material-symbols-outlined" data-icon="ads_click">ads_click</span>
                </button>
                <button className="text-[#FF003C] flex flex-col items-center">
                    <span className="material-symbols-outlined" data-icon="query_stats">query_stats</span>
                </button>
                <button className="text-[#FF003C] flex flex-col items-center">
                    <span className="material-symbols-outlined" data-icon="account_circle">account_circle</span>
                </button>
            </nav>
        </div>
    );
}