import React from 'react';
import './MissionBriefing.css';

export default function MissionBriefing() {
    return (
        <div className="mission-briefing-wrapper font-body selection:bg-primary-container selection:text-white">


            {/* Main Content Canvas */}
            <main className="pt-10 pl-[300px] px-6 md:px-10 pb-16 overflow-x-hidden">
                {/* Background Elements */}
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="w-full h-full flex flex-wrap gap-4 text-[10px] font-mono leading-none rotate-[-5deg] scale-150">
                        01010100 01001000 01000101 00100000 01000010 01010010 01000101 01000001 01000011 01001000
                        01010011 01011001 01010011 01010100 01000101 01001101 01010011 01011111 01001111 01001110
                    </div>
                </div>

                {/* Layout Wrapper */}
                <div className="relative z-10 max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="relative mb-16">
                        <h1 className="font-headline text-6xl md:text-8xl font-black italic skew-x-[-8deg] leading-[0.8] tracking-tighter text-[#FF003C] uppercase text-glow-primary">
                            MISSION_BRIEFING
                        </h1>
                        <div className="absolute -top-4 -left-4 bg-[#00EBF7] text-black font-label text-xs px-3 py-1 font-bold -skew-x-12">
                            CLASSIFIED // LEVEL 5 CLEARANCE REQUIRED
                        </div>
                    </div>

                    {/* Bento Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* Main Narrative Card */}
                        <div className="lg:col-span-8 flex flex-col gap-8">
                            <div className="slashed-card bg-surface-container-high border-l-8 border-[#FF003C] p-12 relative overflow-hidden -rotate-1 group">
                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                    <span className="material-symbols-outlined text-9xl">security</span>
                                </div>
                                <div className="relative z-10">
                                    <h2 className="font-headline text-3xl font-black italic uppercase mb-6 text-white tracking-widest">SITUATION_REPORT</h2>
                                    <p className="font-body text-xl md:text-2xl text-on-background leading-relaxed font-light italic">
                                        "A massive <span className="text-[#FF003C] font-bold">brute force attack</span> is targeting our secure server. The encryption layers are holding, but only for the next 14 minutes. Trace the source through the digital shadows and <span className="text-[#00EBF7] font-bold underline">neutralize</span> the threat before a total data breach occurs."
                                    </p>
                                </div>
                                <div className="mt-12 flex items-center gap-6">
                                    <div className="h-1 flex-1 bg-zinc-800">
                                        <div className="h-full bg-[#FF003C] w-3/4 animate-pulse"></div>
                                    </div>
                                    <span className="font-label text-[#FF003C] text-sm font-bold tracking-widest">THREAT_LEVEL: OMEGA</span>
                                </div>
                            </div>

                            {/* Objectives Card */}
                            <div className="slashed-card bg-surface-container-low p-8 rotate-1">
                                <h3 className="font-headline text-xl font-bold italic text-[#00EBF7] mb-8 uppercase tracking-widest flex items-center gap-3">
                                    <span className="material-symbols-outlined">task_alt</span>
                                    PRIMARY_OBJECTIVES
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4 group">
                                        <div className="w-8 h-8 border-2 border-[#FF003C] flex-shrink-0 flex items-center justify-center -skew-x-12 group-hover:bg-[#FF003C]/20 transition-all">
                                            <span className="material-symbols-outlined text-[#FF003C] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                                        </div>
                                        <div>
                                            <span className="font-headline font-bold text-lg text-white">DECRYPT_UPLINK</span>
                                            <p className="font-label text-sm text-zinc-500">Access the peripheral nodes to bypass firewalls.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 group">
                                        <div className="w-8 h-8 border-2 border-[#00EBF7] flex-shrink-0 flex items-center justify-center -skew-x-12 group-hover:bg-[#00EBF7]/20 transition-all">
                                        </div>
                                        <div>
                                            <span className="font-headline font-bold text-lg text-white">TRACE_ORIGIN_IP</span>
                                            <p className="font-label text-sm text-zinc-500">Isolate the attacker's main packet stream.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 group">
                                        <div className="w-8 h-8 border-2 border-[#00EBF7] flex-shrink-0 flex items-center justify-center -skew-x-12 group-hover:bg-[#00EBF7]/20 transition-all">
                                        </div>
                                        <div>
                                            <span className="font-headline font-bold text-lg text-white">INJECT_COUNTER_VIRUS</span>
                                            <p className="font-label text-sm text-zinc-500">Deploy the payload to fry the remote terminal.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action & Intel Column */}
                        <div className="lg:col-span-4 flex flex-col gap-8">
                            {/* Tactical Map Preview */}
                            <div className="bg-surface-container-highest border-t-4 border-[#00EBF7] p-4 -rotate-2 shadow-2xl">
                                <div className="aspect-square relative overflow-hidden bg-black">
                                    <img
                                        alt="Mission Map"
                                        className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-500"
                                        data-alt="High-contrast digital map showing glowing cyan network nodes and red pulsating threat zones on a dark grid"
                                        data-location="Tokyo"
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbeFS5C5DYIHBqtBjyb04vB3-BjjhZG8uwwKY04MfO3cO4e8kXAuMUhduvvukKTz--yr93apO0gXszq1fZr3gZgxXFX0-e8BYRTubdmK9RdXeSd_I8c2LlOLgzwfgKjnvv5usN9sgCrN4JRc-rAsM-NlfQZrKyyRQVeNPi5V9D5y4LB5rrXCmYy_OfNKiyz_M2V_xBpqMYHN7pQm9CZ42xj7G5oixJuqribzUq2VS1yOx9cEbkZS5gyCVw6zHAs0HFeSd_x60NVn92"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-24 h-24 border border-[#FF003C]/50 rounded-full animate-ping"></div>
                                    </div>
                                    <div className="absolute bottom-2 left-2 font-label text-[10px] text-[#00EBF7] bg-black/80 p-1">
                                        TARGET_LOC: 35.6895° N, 139.6917° E
                                    </div>
                                </div>
                                <div className="mt-4 font-label text-xs text-zinc-400 uppercase tracking-widest flex justify-between">
                                    <span>SATELLITE_FEED</span>
                                    <span className="text-[#FF003C]">LIVE</span>
                                </div>
                            </div>

                            {/* Huge CTA Button */}
                            <button className="btn-slashed w-full bg-[#FF003C] hover:bg-white text-black py-10 transition-all group relative overflow-hidden shadow-[0_0_50px_rgba(255,0,60,0.5)]">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                <span className="relative z-10 font-headline text-3xl font-black italic tracking-tighter uppercase flex items-center justify-center gap-4">
                                    START_INVESTIGATION
                                    <span className="material-symbols-outlined text-4xl">bolt</span>
                                </span>
                                <div className="absolute bottom-1 right-10 font-label text-[8px] font-bold tracking-widest opacity-50">INITIALIZE BREACH PROTOCOL V9.0</div>
                            </button>

                            {/* Operative Status */}
                            <div className="slashed-card bg-zinc-900/50 backdrop-blur-xl p-6 border-b-2 border-zinc-700">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-[#00EBF7] -skew-x-12 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-black font-bold">verified_user</span>
                                    </div>
                                    <div>
                                        <div className="font-label text-[10px] text-zinc-500 uppercase">System Integrity</div>
                                        <div className="font-headline font-bold text-white uppercase italic">98.4% SECURE</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-1 bg-zinc-800 w-full"></div>
                                    <div className="h-1 bg-zinc-800 w-full opacity-50"></div>
                                    <div className="h-1 bg-zinc-800 w-full opacity-20"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Meta */}
                    <div className="mt-20 flex flex-wrap gap-8 justify-between items-end border-t border-zinc-800 pt-8 opacity-40">
                        <div className="font-label text-xs uppercase tracking-[0.5em]">
                            SECURE_CHANNEL_ENCRYPTED // TLS_V1.3 // SHA-512
                        </div>
                        <div className="font-label text-xs uppercase tracking-widest text-[#FF003C]">
                            TERMINAL_01 // ACTIVE_SESSION: 00:14:59
                        </div>
                    </div>
                </div>
            </main>

            {/* Contextual HUD Element (Floating Overlay) */}
            <div className="fixed bottom-8 right-8 z-50 group md:block hidden">
                <div className="bg-[#FF003C] text-black p-4 skew-x-[-15deg] font-headline font-black italic text-xl shadow-[10px_10px_0px_#00EBF7] cursor-pointer hover:translate-y-[-4px] transition-all">
                    INITIATE BREACH
                </div>
            </div>
        </div>
    );
}