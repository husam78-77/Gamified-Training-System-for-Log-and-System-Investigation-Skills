import React from 'react';
import './GamingEnvironment.css';

export default function GamingEnvironment() {
    return (
        <div className="gaming-env-wrapper font-body selection:bg-primary selection:text-white">
            <div className="fixed inset-0 bg-noise z-50"></div>

            {/* HUD Top Right: Timer & Status */}
            <div className="fixed top-8 right-8 z-40 flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                    <div className="px-2 py-0.5 bg-primary text-black font-label text-[10px] font-black tracking-tighter pulse-soft">THREAT_DETECTED</div>
                    <div className="px-2 py-0.5 border border-secondary text-secondary font-label text-[10px] font-bold">SYSTEM_ACTIVE</div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="font-label text-[10px] tracking-[0.2em] text-secondary/40 uppercase">Session Time Remaining</span>
                    <div className="font-headline text-5xl tracking-tighter italic text-secondary cyan-glow">04:59:21</div>
                </div>
            </div>

            {/* HUD Bottom Left: Exit */}
            <div className="fixed bottom-8 left-8 z-40">
                <button className="group flex items-center gap-4 bg-surface-container-high/50 border border-white/5 px-8 py-3 skew-x-[-12deg] hover:bg-primary transition-all duration-300">
                    <span className="material-symbols-outlined text-primary group-hover:text-black transition-colors" data-icon="logout">logout</span>
                    <span className="font-label font-bold text-on-surface group-hover:text-black transition-colors tracking-widest">EXIT_SESSION</span>
                </button>
            </div>

            <main className="h-screen w-full flex p-6 gap-8 relative z-10">

                {/* LEFT PANEL */}
                <aside className="w-[22%] flex flex-col gap-8">
                    {/* SYSTEM_LOGS */}
                    <section className="flex-1 bg-surface-container-lowest/80 p-4 flex flex-col gap-4 overflow-hidden relative border-t border-l border-white/5">
                        <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                            <h2 className="font-label text-xs font-bold tracking-widest text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-[14px]" data-icon="developer_board">developer_board</span>
                                SYSTEM_LOGS
                            </h2>
                            <span className="text-[9px] text-primary/60 font-label animate-pulse">LIVE_FEED</span>
                        </div>
                        <div className="flex-1 font-label text-[10px] leading-relaxed overflow-y-auto space-y-3 opacity-90 custom-scrollbar">
                            <div className="flex gap-2 text-secondary/40">
                                <span>[14:22:01]</span>
                                <span className="text-on-surface/80">Initializing socket connection...</span>
                            </div>
                            <div className="p-2 bg-primary/10 border-l-2 border-primary">
                                <div className="flex gap-2 text-primary font-bold">
                                    <span>[14:22:05]</span>
                                    <span>CRITICAL: Unidentified intrusion detected</span>
                                </div>
                                <div className="text-[9px] mt-1 text-primary/70 ml-12">SOURCE_NODE: 0xBF3</div>
                            </div>
                            <div className="flex gap-2 text-secondary/40">
                                <span>[14:22:08]</span>
                                <span className="text-on-surface/80">Bypassing local firewall... <span className="text-secondary/80">OK</span></span>
                            </div>
                            <div className="flex gap-2 text-secondary/40">
                                <span>[14:22:12]</span>
                                <span className="text-on-surface/80">Injecting payload into /dev/sda1</span>
                            </div>
                            <div className="p-2 bg-primary/10 border-l-2 border-primary">
                                <div className="flex gap-2 text-primary font-bold">
                                    <span>[14:22:15]</span>
                                    <span>CRITICAL: Handshake failed with root</span>
                                </div>
                            </div>
                            <div className="flex gap-2 text-secondary/40">
                                <span>[14:22:19]</span>
                                <span className="text-on-surface/80">Rerouting through LONDON-04</span>
                            </div>
                        </div>
                    </section>

                    {/* FILE_SYSTEM */}
                    <section className="h-2/5 bg-surface-container-low/50 p-4 border-l-2 border-secondary/20">
                        <h2 className="font-label text-xs font-bold tracking-widest text-secondary mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]" data-icon="folder_zip">folder_zip</span>
                            FILE_SYSTEM
                        </h2>
                        <div className="font-label text-xs space-y-1 text-secondary/60">
                            <div className="flex items-center gap-2 py-1.5 hover:bg-secondary/5 cursor-pointer transition-colors group">
                                <span className="material-symbols-outlined text-sm text-secondary/40" data-icon="arrow_drop_down">arrow_drop_down</span>
                                <span className="material-symbols-outlined text-base text-secondary" data-icon="terminal">terminal</span>
                                <span className="text-on-surface group-hover:text-secondary">root</span>
                            </div>
                            <div className="ml-6 border-l border-white/5 pl-2">
                                <div className="flex items-center gap-2 py-1.5 hover:bg-secondary/5 cursor-pointer transition-colors group">
                                    <span className="material-symbols-outlined text-sm text-secondary/40" data-icon="arrow_right">arrow_right</span>
                                    <span className="material-symbols-outlined text-base text-secondary/70" data-icon="folder">folder</span>
                                    <span className="group-hover:text-secondary">system</span>
                                </div>
                                <div className="flex items-center gap-2 py-1.5 text-primary italic bg-primary/5 pl-2">
                                    <span className="material-symbols-outlined text-base" data-icon="data_object">data_object</span>
                                    <span className="font-bold">bin_override.sh</span>
                                </div>
                                <div className="flex items-center gap-2 py-1.5 hover:bg-secondary/5 cursor-pointer transition-colors group">
                                    <span className="material-symbols-outlined text-sm text-secondary/40" data-icon="arrow_right">arrow_right</span>
                                    <span className="material-symbols-outlined text-base text-secondary/70" data-icon="folder">folder</span>
                                    <span className="group-hover:text-secondary">usr</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </aside>

                {/* CENTER (The Core) */}
                <div className="flex-1 flex flex-col items-center justify-center gap-8">
                    <div className="w-full h-3/4 relative">
                        {/* Terminal Glow and Frame */}
                        <div className="absolute inset-0 bg-secondary/5 rounded-sm terminal-glow pointer-events-none"></div>
                        <div className="absolute -top-1 -left-1 w-12 h-12 border-t-2 border-l-2 border-primary/60"></div>
                        <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-2 border-r-2 border-primary/60"></div>

                        <div className="w-full h-full bg-black/95 p-8 flex flex-col gap-4 overflow-hidden relative border border-white/5">
                            <div className="flex justify-between items-center opacity-30 mb-6">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-1 bg-primary"></div>
                                    <div className="w-2.5 h-1 bg-secondary"></div>
                                    <div className="w-2.5 h-1 bg-on-surface"></div>
                                </div>
                                <span className="font-label text-[9px] tracking-[0.4em] uppercase">Hyperion-OS v4.2.0 // Node_Secure</span>
                            </div>
                            <div className="flex-1 font-label text-base md:text-lg text-secondary leading-relaxed overflow-hidden">
                                <div className="mb-6 text-secondary/30 text-xs flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs" data-icon="history">history</span>
                                    SESSION_START: Fri Oct 27 23:11:04 on ttys001
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-primary/60">root@hyperion:~$</span>
                                    <span className="text-on-surface font-medium">access --bypass --protocol=X-99</span>
                                </div>
                                <div className="mt-4 text-primary bg-primary/5 p-3 border border-primary/20 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-base" data-icon="warning">warning</span>
                                    <span>[SYSTEM WARNING] Unauthorized access protocol detected.</span>
                                </div>
                                <div className="mt-4 text-secondary/80 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm animate-spin" data-icon="sync">sync</span>
                                    Initializing breach sequence...
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <span className="border border-secondary/30 px-3 py-1 text-[10px] bg-secondary/5">HASHING_CORE</span>
                                    <span class="border border-secondary/30 px-3 py-1 text-[10px] bg-secondary/5">SALTING_VECTOR</span>
                                    <span className="border border-primary/50 px-3 py-1 text-[10px] bg-primary/10 text-primary font-bold">ENCRYPTED_TUNNEL_OPEN</span>
                                </div>
                                <div className="mt-8 flex items-center gap-2">
                                    <span className="text-primary/60">root@hyperion:~$</span>
                                    <span className="terminal-cursor pl-2"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Execute Button - Scaled down 30% */}
                    <button className="relative group h-14 w-56 scale-90">
                        <div className="absolute inset-0 bg-primary/90 skew-x-[-15deg] transition-all duration-300 group-hover:bg-primary group-active:scale-95 shadow-[0_0_15px_rgba(255,0,60,0.2)]"></div>
                        <div className="absolute inset-0 flex items-center justify-center font-headline text-lg font-black italic tracking-tighter text-black">
                            EXECUTE_OVERRIDE
                        </div>
                        <div className="absolute -bottom-3 left-0 right-0 flex justify-center gap-4">
                            <div className="h-0.5 w-12 bg-primary/40"></div>
                            <div className="h-0.5 w-4 bg-secondary"></div>
                        </div>
                    </button>
                </div>

                {/* RIGHT PANEL */}
                <aside className="w-[22%] flex flex-col gap-10">
                    {/* OPERATIVE_STATUS */}
                    <section className="bg-surface-container-high/40 p-4 border-r-2 border-primary/60 skew-panel-right">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-label text-[10px] font-bold tracking-widest text-primary">OPERATIVE_STATUS</h2>
                            <span className="material-symbols-outlined text-secondary text-base" data-icon="shield">shield</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[9px] font-label text-on-surface/40 mb-1">
                                    <span>INTEGRITY_INDEX</span>
                                    <span className="text-primary">84%</span>
                                </div>
                                <div className="h-1 bg-white/5 w-full">
                                    <div className="h-full bg-primary w-[84%] relative">
                                        <div className="absolute top-0 right-0 h-full w-1 bg-white animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-black/20 p-2">
                                <div className="font-label">
                                    <div className="text-[9px] text-on-surface/40">DATA_VALUATION</div>
                                    <div className="text-xl font-bold text-secondary tracking-tight">001,482,900</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* AI_ORACLE - Redesigned */}
                    <section className="flex-1 bg-surface-container-highest p-6 ai-hint-shape border-l-2 border-secondary/40 relative group overflow-hidden">
                        <div className="absolute -top-2 -right-2 opacity-5 scale-150 rotate-12">
                            <span className="material-symbols-outlined text-[120px] text-secondary" data-icon="neurology">neurology</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-secondary text-base" data-icon="smart_toy">smart_toy</span>
                                <h2 className="font-label text-[10px] font-bold tracking-[0.2em] text-secondary/80">AI_ORACLE_ANALYSIS</h2>
                            </div>
                            <p className="font-body text-xs leading-relaxed text-on-surface/90 italic border-l border-secondary/20 pl-4 py-1">
                                "The target mainframe uses a rotating encryption key based on the current server timestamp. Target the <span className="text-secondary font-bold underline decoration-secondary/30">bin_override</span> script in the root directory to exploit the race condition."
                            </p>
                            <div className="mt-6 flex items-center gap-2 opacity-30">
                                <div className="h-0.5 w-8 bg-secondary"></div>
                                <div className="text-[8px] font-label">READY_TO_ASSIST</div>
                            </div>
                        </div>
                    </section>

                    {/* MISSION_OBJECTIVES */}
                    <section className="bg-surface-container-low/30 p-5 border-l border-white/5">
                        <h2 className="font-label text-[10px] font-bold tracking-[0.2em] text-on-surface/60 mb-6">MISSION_OBJECTIVES</h2>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4 text-secondary/30">
                                <span className="material-symbols-outlined text-[18px] text-green-500/80" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <div className="flex flex-col">
                                    <span className="font-label text-[10px] line-through">BREACH_OUTER_FIREWALL</span>
                                    <span className="text-[8px] opacity-40">SUCCESSFUL_BYPASS</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 text-secondary">
                                <span className="material-symbols-outlined text-[18px] animate-pulse" data-icon="radio_button_checked">radio_button_checked</span>
                                <div className="flex flex-col">
                                    <span className="font-label text-[10px] font-bold tracking-wider">BYPASS_ROOT_AUTHORITY</span>
                                    <span className="text-[8px] text-secondary/60">ACTIVE_SEQUENCE</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 text-on-surface/30">
                                <span className="material-symbols-outlined text-[18px]" data-icon="lock">lock</span>
                                <div className="flex flex-col">
                                    <span className="font-label text-[10px]">EXFILTRATE_ENCRYPTED_DB</span>
                                    <span className="text-[8px]">PENDING_PRIORITY</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 text-on-surface/30">
                                <span className="material-symbols-outlined text-[18px]" data-icon="lock">lock</span>
                                <div className="flex flex-col">
                                    <span className="font-label text-[10px]">ERASE_FOOTPRINTS</span>
                                    <span className="text-[8px]">PENDING_PRIORITY</span>
                                </div>
                            </li>
                        </ul>
                    </section>
                </aside>

            </main>

            {/* Scanline Overlay */}
            <div className="fixed inset-0 pointer-events-none z-[60] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_4px,3px_100%] opacity-15"></div>
        </div>
    );
}