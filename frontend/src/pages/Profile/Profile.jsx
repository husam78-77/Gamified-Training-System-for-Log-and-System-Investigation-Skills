import React from 'react';
import './Profile.css';

export default function OperativeProfile() {
    return (
        <div className="profile-wrapper font-body selection:bg-primary-container selection:text-white">

            {/* Main Content Canvas */}
            <main className="md:pl-0 pt-32 p-8 min-h-screen">
                <div className="max-w-6xl mx-auto space-y-12">

                    {/* SECTION 1: OPERATIVE IDENTITY */}
                    <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                        <div className="lg:col-span-7 space-y-6">
                            <div className="inline-block bg-[#FF003C] px-4 py-1 skew-x-[-15deg]">
                                <span className="font-label font-bold text-black tracking-widest text-xs uppercase">SUBJECT_FILE: ALPHA_REDACTED</span>
                            </div>
                            <h1 className="font-headline text-7xl md:text-7xl italic font-black text-white tracking-tighter leading-none skew-x-[-12deg] glitch-text">
                                OPERATIVE_01
                            </h1>
                            <div className="flex flex-wrap gap-8 font-label">
                                <div className="border-l-4 border-secondary-fixed-dim pl-4">
                                    <div className="text-zinc-500 text-xs uppercase tracking-widest">Digital Role</div>
                                    <div className="text-secondary-fixed-dim font-bold text-xl uppercase">Phantom Infiltrator</div>
                                </div>
                                <div className="border-l-4 border-[#FF003C] pl-4">
                                    <div className="text-zinc-500 text-xs uppercase tracking-widest">Direct Comms</div>
                                    <div className="text-white font-bold text-xl uppercase">operative_01@kinetic.breach</div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 relative">
                            <div className="absolute -top-12 -left-12 w-32 h-32 border-t-8 border-l-8 border-[#FF003C] opacity-50"></div>
                            <div className="bg-surface-container-high h-[400px] w-full relative slash-br overflow-hidden shadow-[20px_20px_0px_#FF003C]">
                                <img
                                    alt="Agent Silhouette"
                                    className="w-full h-full object-cover mix-blend-luminosity opacity-80"
                                    data-alt="High contrast cinematic silhouette of a cyberpunk operative in a dark tech environment with red backlighting and floating data streams"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGlcYn76Rg0JxHo99uJ38ywe0PeVJOl1s-gVPfloNDELxK2UoShf7lYiPRLRdD8FFMTrlUrTAhpj9p704LWh8YPlVnlOM--ueVqpTafeeFKAxPNE5MAo8RRRfvt8UvqLFzLn_aqNVLGdGIlrzQWVCGkHkWLNpEOUEV5VfGAeNhC8h_Cle9aroAq5XfPYBvVXM9TOGhnGXSJcCKywQ5uD9q9fJSyukCsvLFhQR6cX1evU2sP73zGgcvbtHw3wKgEqk3yLqJ2l16pAfM"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent"></div>
                                <div className="absolute bottom-6 right-6 text-right">
                                    <div className="font-label text-secondary-fixed-dim text-4xl font-bold tracking-tighter">LVL_42</div>
                                    <div className="text-xs text-white/50 font-label tracking-widest uppercase">Bio-Metric Verified</div>
                                </div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 bg-[#00FFFF] text-black px-6 py-2 font-label font-bold text-sm tracking-widest skew-x-[-10deg]">
                                STATUS: ONLINE
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2 & 3: OVERRIDE & STATUS GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                        {/* SECURITY OVERRIDE */}
                        <div className="lg:col-span-8 bg-surface-container-low p-12 relative overflow-hidden slash-tl">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <span className="material-symbols-outlined text-9xl">lock_open</span>
                            </div>
                            <h2 className="font-headline text-4xl italic font-black text-[#FF003C] uppercase tracking-tighter mb-8 skew-x-[-5deg]">
                                Security_Override
                            </h2>
                            <form className="space-y-8 max-w-lg">
                                <div className="space-y-2 group">
                                    <label className="font-label text-xs uppercase tracking-[0.3em] text-zinc-500 group-focus-within:text-secondary-fixed-dim transition-colors">Current_Access_Token</label>
                                    <input className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-secondary-fixed-dim text-white font-headline text-2xl py-2 px-0 focus:ring-0 placeholder:text-zinc-800 transition-all" placeholder="••••••••••••" type="password" />
                                </div>
                                <div className="space-y-2 group">
                                    <label className="font-label text-xs uppercase tracking-[0.3em] text-zinc-500 group-focus-within:text-secondary-fixed-dim transition-colors">New_Encrypted_Key</label>
                                    <input className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-secondary-fixed-dim text-white font-headline text-2xl py-2 px-0 focus:ring-0 placeholder:text-zinc-800 transition-all" placeholder="••••••••••••" type="password" />
                                </div>
                                <div className="space-y-2 group">
                                    <label className="font-label text-xs uppercase tracking-[0.3em] text-zinc-500 group-focus-within:text-secondary-fixed-dim transition-colors">Confirm_Payload</label>
                                    <input className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-secondary-fixed-dim text-white font-headline text-2xl py-2 px-0 focus:ring-0 placeholder:text-zinc-800 transition-all" placeholder="••••••••••••" type="password" />
                                </div>
                                <div className="pt-4">
                                    <button className="bg-[#FF003C] text-black font-headline font-black italic text-xl px-12 py-4 skew-x-[-12deg] shadow-[8px_8px_0px_#00FFFF] hover:translate-x-1 hover:-translate-y-1 transition-all active:translate-x-0 active:translate-y-0" type="submit">
                                        UPDATE_CREDENTIALS
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* SYSTEM STATUS BENTO */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <div className="bg-surface-container-highest p-8 relative flex-1 slash-br border-l-8 border-[#00FFFF]">
                                <div className="flex items-center gap-4 text-secondary-fixed-dim mb-4">
                                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                                    <span className="font-headline font-bold text-2xl tracking-tighter italic">SYSTEM_SECURE</span>
                                </div>
                                <p className="font-label text-xs text-zinc-400 leading-relaxed mb-6">
                                    FIREWALL: ACTIVE<br />
                                    ENCRYPTION: AES-256<br />
                                    LAST_BREACH: 14 DAYS AGO<br />
                                    THREAT_LEVEL: ZERO
                                </p>
                                <div className="w-full h-1 bg-zinc-800">
                                    <div className="h-full bg-secondary-fixed-dim w-full shadow-[0_0_10px_#00FFFF]"></div>
                                </div>
                            </div>
                            <div className="bg-[#FF003C] p-8 text-black relative flex-1 skew-x-[-5deg]">
                                <h3 className="font-headline font-black italic text-2xl tracking-tighter mb-4">TERMINAL_LOGS</h3>
                                <div className="font-label text-[10px] leading-tight opacity-80 space-y-1">
                                    {/* <div>> [TIMESTAMP: 23:59:12] - AUTH_SUCCESS</div>
                                    <div>> [TIMESTAMP: 00:04:44] - MODULE_SYNC: COMPLETE</div>
                                    <div>> [TIMESTAMP: 00:15:01] - UPLINK_ESTABLISHED</div>
                                    <div>> [TIMESTAMP: 00:15:22] - ROOT_ACCESS_GRANTE_</div> */}
                                </div>
                                <div className="absolute bottom-2 right-2 opacity-20">
                                    <span className="material-symbols-outlined text-6xl">terminal</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DOSSIER METADATA */}
                    <section className="bg-surface-container p-12 border-t-4 border-[#FF003C] relative">
                        <div className="absolute -top-1 -left-1 w-12 h-12 bg-[#FF003C]"></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 font-label">
                            <div>
                                <div className="text-zinc-500 text-xs tracking-widest uppercase mb-2">Login_Streak</div>
                                <div className="text-white text-4xl font-bold tracking-tighter">14_DAYS</div>
                            </div>
                            <div>
                                <div className="text-zinc-500 text-xs tracking-widest uppercase mb-2">Successful_Breaches</div>
                                <div className="text-white text-4xl font-bold tracking-tighter">1,204</div>
                            </div>
                            <div>
                                <div className="text-zinc-500 text-xs tracking-widest uppercase mb-2">Elite_Medals</div>
                                <div className="text-white text-4xl font-bold tracking-tighter">09</div>
                            </div>
                            <div>
                                <div className="text-zinc-500 text-xs tracking-widest uppercase mb-2">Global_Rank</div>
                                <div className="text-secondary-fixed-dim text-4xl font-bold tracking-tighter">#412</div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* MOBILE NAVIGATION (HIDDEN ON DESKTOP) */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-lg border-t-4 border-[#FF003C] flex justify-around p-4 z-50">
                <span className="material-symbols-outlined text-[#FF003C] text-3xl">grid_view</span>
                <span className="material-symbols-outlined text-zinc-500 text-3xl">ads_click</span>
                <span className="material-symbols-outlined text-zinc-500 text-3xl">query_stats</span>
                <span className="material-symbols-outlined text-[#FF003C] text-3xl bg-zinc-800 p-2 -mt-8 rounded-full border-2 border-[#FF003C]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
            </nav>
        </div>
    );
}