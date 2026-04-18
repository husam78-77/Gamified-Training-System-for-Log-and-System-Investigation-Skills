import React from 'react';
import './dashboard.css';

export default function Dashboard() {
    return (
        <div className="dashboard-wrapper font-body selection:bg-primary-container selection:text-white">

            {/* Main Content Canvas */}
            <main className="pt-8 pl-[288px] px-6 md:px-12 pb-16 overflow-x-hidden">
                {/* Hero Progress Section */}
                <section className="relative mb-20">
                    <div className="flex flex-col md:flex-row items-end gap-8">
                        <div className="relative">
                            <h2 className="text-8xl md:text-[12rem] font-headline font-black italic leading-none text-[#FF003C] skew-x-[-10deg] drop-shadow-[10px_10px_0px_#00FFFF]">
                                42
                            </h2>
                            <div className="absolute -top-4 -left-4 bg-white text-black px-4 py-1 font-headline font-bold skew-x-[-15deg]">
                                LEVEL
                            </div>
                        </div>
                        <div className="flex-1 w-full pb-6">
                            <div className="flex justify-between font-label text-[#00FFFF] mb-2 uppercase tracking-widest">
                                <span>XP Progress</span>
                                <span>14,200 / 16,000 XP</span>
                            </div>
                            <div className="h-12 bg-zinc-900 skew-x-[-20deg] border-2 border-zinc-700 relative overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#FF003C] to-[#ff525c] w-[88%] shadow-[0_0_20px_#FF003C]"></div>
                                <div className="absolute inset-0 flex justify-around opacity-20">
                                    <div className="w-[1px] h-full bg-black"></div>
                                    <div className="w-[1px] h-full bg-black"></div>
                                    <div className="w-[1px] h-full bg-black"></div>
                                    <div className="w-[1px] h-full bg-black"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Dynamic Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Active Missions (Asymmetric Panels) */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-4xl font-headline font-black italic uppercase tracking-tighter skew-x-[-5deg]">
                                Active_Missions
                            </h3>
                            <div className="h-1 flex-1 mx-8 bg-gradient-to-r from-[#FF003C] to-transparent"></div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12">
                            {/* Mission Card 1 */}
                            <div className="group relative bg-zinc-900 p-1 transition-transform hover:scale-105">
                                <div className="absolute -top-4 -right-4 bg-[#FF003C] text-black px-3 py-1 font-label font-bold z-10 skew-x-[-10deg]">
                                    PRIORITY: HIGH
                                </div>
                                <div className="relative overflow-hidden bg-black aspect-video skew-panel">
                                    <img
                                        alt="Server Room"
                                        className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                                        data-alt="Futuristic dark server room with glowing red data streams and holographic interfaces"
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJrtfo386RqE6kjgGUpz1X2Qnhu_oKuUHjS3ht9btxbiLrjDb7ETfxfX9GwVZ4bpXXA5eBfJbzvKuKose0Lz52oB52dwEmKy56r0uMJ4Ibvae_1q72Hp52v9CE4T6gRZWNliXVMIdWbTylwd8ZVmXU19s5vtO6HFuuMo5tOX1B_JYm7G9h8QJE3pW2_kbwNXog1RgDaSZezBT-CRLJ17XhvPgYerORpoPBRPvDcrQrKhNcZJxHpYik_Uzyiypfh6wASVuQtL-kMD2I"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <p className="font-label text-[#00FFFF] text-xs mb-1">NODE_EXPLOITATION</p>
                                        <h4 className="text-2xl font-headline font-black italic leading-tight uppercase group-hover:text-[#FF003C] transition-colors">Ghost in the Shell</h4>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <p className="text-zinc-400 font-body text-sm mb-6 leading-relaxed">Breach the secondary firewall of the Neo-Saito mainframe. Recover encrypted blueprints for the X-4 interceptor.</p>
                                    <button className="w-full bg-white text-black font-headline font-black italic py-3 skew-x-[-10deg] group-hover:bg-[#FF003C] group-hover:text-white transition-all flex items-center justify-center gap-2">
                                        EXECUTE MISSION <span className="material-symbols-outlined" data-icon="play_arrow">play_arrow</span>
                                    </button>
                                </div>
                            </div>

                            {/* Mission Card 2 */}
                            <div className="group relative bg-zinc-900 p-1 translate-y-12 transition-transform hover:scale-105">
                                <div className="absolute -top-4 -right-4 bg-zinc-700 text-white px-3 py-1 font-label font-bold z-10 skew-x-[-10deg]">
                                    PRIORITY: LOW
                                </div>
                                <div className="relative overflow-hidden bg-black aspect-video skew-panel">
                                    <img
                                        alt="Digital Circuitry"
                                        className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                                        data-alt="Extreme close-up of a glowing neon blue motherboard with digital pulse patterns and sharp angles"
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtGi3tZD4Pj0MIUrCjX-y-XWiOo0UC5ZSkQM33NS9kakcoXytQTIEPnQoUobdJTl_xvEFwpINSiL9N5x9rGRaklN99kIER5nbcXmxtK1IOJU-wN4Rr99ujhewlWDBPBysUaUMxm6yiXSd4qaKaqmr8j9TFziHmTS6Z70xa6tdWoTYjtYPk19q5L3yuxkJap8-5og4GXRHkOQOp6euZSjsVPf2R3AbKvU7Xk2h_VL9qAEClCVyGSx8n2Nt2pGoUe1Yxru342Upt5mJR"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <p className="font-label text-[#00FFFF] text-xs mb-1">SIGNAL_INTERCEPTION</p>
                                        <h4 className="text-2xl font-headline font-black italic leading-tight uppercase group-hover:text-[#FF003C] transition-colors">Static Frequency</h4>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <p className="text-zinc-400 font-body text-sm mb-6 leading-relaxed">Decode the sub-surface signal emitting from the abandoned satellite station 7. Isolate the noise.</p>
                                    <button className="w-full border-2 border-zinc-700 text-white font-headline font-black italic py-3 skew-x-[-10deg] group-hover:border-[#00FFFF] group-hover:text-[#00FFFF] transition-all flex items-center justify-center gap-2">
                                        ANALYZE FEED <span className="material-symbols-outlined" data-icon="analytics">analytics</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Content */}
                    <div className="lg:col-span-4 space-y-12">
                        {/* System Log */}
                        <div className="bg-zinc-900/50 backdrop-blur-sm p-8 border-l-4 border-[#00FFFF] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00FFFF]/5 rounded-full blur-3xl"></div>
                            <h3 className="text-xl font-headline font-black italic uppercase mb-6 tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#00FFFF] animate-pulse"></span>
                                SYSTEM_LOG.TXT
                            </h3>
                            <div className="space-y-4 font-label text-xs">
                                <div className="flex gap-4 items-start border-b border-zinc-800 pb-3">
                                    <span className="text-zinc-500">14:22</span>
                                    <p><span className="text-[#FF003C]">[SUCCESS]</span> Firewall bypassed in 0.4s (Tokyo Node)</p>
                                </div>
                                <div className="flex gap-4 items-start border-b border-zinc-800 pb-3">
                                    <span className="text-zinc-500">13:45</span>
                                    <p><span className="text-[#00FFFF]">[UPDATE]</span> Operative level increased to 42</p>
                                </div>
                                <div className="flex gap-4 items-start border-b border-zinc-800 pb-3">
                                    <span className="text-zinc-500">12:10</span>
                                    <p><span className="text-zinc-400">[LOGIN]</span> Terminal access from IP 192.168.X.1</p>
                                </div>
                                <div className="flex gap-4 items-start border-b border-zinc-800 pb-3">
                                    <span className="text-zinc-500">09:30</span>
                                    <p><span className="text-[#FF003C]">[ALERT]</span> Breach detected in Sector 7 Training Deck</p>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <span className="text-zinc-500">08:55</span>
                                    <p><span className="text-zinc-400">[SYSTEM]</span> Kernel optimization complete</p>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <span className="text-[8px] text-zinc-700">SCR_ID: 9982-FF-01</span>
                            </div>
                        </div>

                        {/* Stats Fragment */}
                        <div className="bg-zinc-950 p-8 skew-x-[2deg] border border-zinc-800 shadow-[10px_10px_0px_rgba(255,0,60,0.1)]">
                            <h3 className="text-lg font-headline font-black italic uppercase mb-6 tracking-widest text-[#FF003C]">OPERATIVE_STATISTICS</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="text-center p-4 bg-zinc-900 skew-x-[-10deg]">
                                    <p className="font-headline text-3xl font-black italic text-white leading-none">12</p>
                                    <p className="font-label text-[10px] text-zinc-500 mt-1 uppercase">Breaches</p>
                                </div>
                                <div className="text-center p-4 bg-zinc-900 skew-x-[-10deg]">
                                    <p className="font-headline text-3xl font-black italic text-white leading-none">84%</p>
                                    <p className="font-label text-[10px] text-zinc-500 mt-1 uppercase">Accuracy</p>
                                </div>
                                <div className="text-center p-4 bg-zinc-900 skew-x-[-10deg]">
                                    <p className="font-headline text-3xl font-black italic text-[#00FFFF] leading-none">2.4k</p>
                                    <p className="font-label text-[10px] text-zinc-500 mt-1 uppercase">Nodes</p>
                                </div>
                                <div className="text-center p-4 bg-zinc-900 skew-x-[-10deg]">
                                    <p className="font-headline text-3xl font-black italic text-white leading-none">0</p>
                                    <p className="font-label text-[10px] text-zinc-500 mt-1 uppercase">Deaths</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating HUD Element (Module Completion Hint) */}
                <div className="fixed bottom-12 right-12 flex items-center gap-6 z-30">
                    <div className="slash-card bg-zinc-900/90 border-r-8 border-[#FF003C] px-8 py-4 backdrop-blur-xl hidden lg:block">
                        <p className="font-label text-xs text-[#FF003C] font-bold uppercase">Next Reward In</p>
                        <p className="font-headline text-2xl font-black italic text-white uppercase tracking-tighter">1,800 XP</p>
                    </div>
                    <button className="w-20 h-20 bg-[#FF003C] shadow-[0_0_40px_rgba(255,0,60,0.4)] flex items-center justify-center hover:scale-110 transition-transform skew-x-[-5deg]">
                        <span className="material-symbols-outlined text-white text-4xl" data-icon="bolt">bolt</span>
                    </button>
                </div>
            </main>

            {/* Bottom Nav for Mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-zinc-950 border-t-4 border-[#FF003C] flex justify-around py-4 z-50">
                <span className="material-symbols-outlined text-[#FF003C]" data-icon="grid_view">grid_view</span>
                <span className="material-symbols-outlined text-white" data-icon="ads_click">ads_click</span>
                <span className="material-symbols-outlined text-white" data-icon="query_stats">query_stats</span>
                <span className="material-symbols-outlined text-white" data-icon="account_circle">account_circle</span>
            </nav>
        </div>
    );
}