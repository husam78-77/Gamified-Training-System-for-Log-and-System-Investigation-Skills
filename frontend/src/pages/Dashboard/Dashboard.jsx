import React from 'react';
import './Dashboard.css';

export default function Dashboard() {
    return (
        <div className="dashboard-wrapper font-body selection:bg-primary-container selection:text-white">
            {/* Top HUD (TopAppBar Shared Component) */}
            <header className="fixed top-0 left-0 w-full flex items-center justify-between px-12 bg-zinc-950/80 backdrop-blur-md z-50 h-20 border-b-4 border-[#FF003C] skew-y-[-1deg] shadow-[0_0_30px_rgba(255,0,60,0.3)]">
                <div className="flex items-center gap-8">
                    <h1 className="text-3xl font-black text-[#FF003C] italic skew-x-[-12deg] font-headline uppercase tracking-tighter">
                        KINETIC_BREACH_v1.0
                    </h1>
                    <nav className="hidden md:flex items-center gap-6">
                        <span className="font-headline font-black italic tracking-tighter uppercase text-white underline decoration-[#FF003C] decoration-4 cursor-default">LVL 42</span>
                        <span className="font-headline font-black italic tracking-tighter uppercase text-zinc-500 hover:text-[#FF003C] hover:scale-110 transition-all cursor-pointer">XP: 88%</span>
                        <span className="font-headline font-black italic tracking-tighter uppercase text-zinc-500 hover:text-[#FF003C] hover:scale-110 transition-all cursor-pointer">SYSTEM_STABLE</span>
                        <span className="font-headline font-black italic tracking-tighter uppercase text-zinc-500 hover:text-[#FF003C] hover:scale-110 transition-all cursor-pointer">00:14:59</span>
                    </nav>
                </div>
                <div className="flex items-center gap-6">
                    <span className="material-symbols-outlined text-[#FF003C] text-2xl cursor-pointer hover:scale-125 transition-transform" data-icon="notifications_active">notifications_active</span>
                    <span className="material-symbols-outlined text-[#FF003C] text-2xl cursor-pointer hover:scale-125 transition-transform" data-icon="settings_input_component">settings_input_component</span>
                    <div className="w-10 h-10 bg-zinc-800 skew-x-[-10deg] border-2 border-[#FF003C] overflow-hidden">
                        <img
                            alt="User Hacker Avatar"
                            className="w-full h-full object-cover"
                            data-alt="Cyberpunk hacker avatar with neon red mask and high-tech visor, cinematic dark lighting with red rim light"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCU8vT3cRG3qY_1h2kYZFZlP4xohHJQ2ZVPT6AK8Y8B4Yf_bNIfwW__ap--bNSiAK_7uW87TGJDXprPbiPXDlCBQJTCd9olcx7kU3W2Hu5GjWEvvM95EbFVHprEf-Y_U64HV4b1sRKcnsptdFuKLCB5-cawWahZgDBUq8OOaZgUlEw6yYg6PQH0pt8Vt4syPae6CrJZ7u_RYLL6pXasTxEq7fMtYoLA7U3UgRg9_86qwOxHPtqHdMOLBP7xjzeEqrAsl6TD-f2tX1Qq"
                        />
                    </div>
                </div>
            </header>

            {/* Side Navigation (SideNavBar Shared Component) */}
            <aside className="fixed left-0 top-0 h-full w-72 bg-zinc-950 border-r-[12px] border-[#FF003C] shadow-[20px_0_60px_rgba(0,0,0,0.8)] origin-top-left -skew-x-2 z-40 hidden md:flex flex-col pt-32 gap-6">
                <div className="px-8 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-800 rotate-45 border-2 border-[#00FFFF] overflow-hidden">
                            <img
                                alt="Agent Profile"
                                className="-rotate-45 scale-150"
                                data-alt="Portrait of a futuristic special ops agent with cybernetic eye, dramatic shadows and neon blue lighting"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkYa08sVOlAGzQ6Gzby1PxLwT7GY1Rf-ExkJcSYkhrZ4WqOx6WGzGq1EzBvC-YC46xBvF08zebkEpv6g82gDSA4DNkAO0r6gaWeLQ4_BsLGc8A27f-5obhZrjrRCgGGTJCOdI8YqTOnc6YxAH5bOzx1sv6dW0GQ1XdeKuZKxJ9RfDOczDNgUB_eU2hXJUiZFrvj7A3MfMDnlykCQBzO8Fdy0BNEuJdsw36Eks_H1oRao4V8V2k05pdDXZcUtIThKyNgjl-VAtrf7Q3"
                            />
                        </div>
                        <div>
                            <p className="font-headline font-bold text-xl tracking-widest italic text-white uppercase leading-none">OPERATIVE_01</p>
                            <p className="font-label text-xs text-[#00FFFF] tracking-widest">RANK: PHANTOM</p>
                        </div>
                    </div>
                </div>
                <nav className="flex flex-col gap-2">
                    <a className="font-headline font-bold text-xl tracking-widest italic bg-[#FF003C] text-black -translate-x-4 skew-x-[-10deg] px-8 py-4 shadow-[10px_10px_0px_#00FFFF] flex items-center gap-4 transition-all" href="#!">
                        <span className="material-symbols-outlined" data-icon="grid_view">grid_view</span>
                        DASHBOARD
                    </a>
                    <a className="font-headline font-bold text-xl tracking-widest italic text-white hover:text-[#00FFFF] px-8 py-4 transition-transform hover:translate-x-2 flex items-center gap-4 hover:skew-x-[-12deg] hover:bg-zinc-800" href="#!">
                        <span className="material-symbols-outlined" data-icon="ads_click">ads_click</span>
                        MISSIONS
                    </a>
                    <a className="font-headline font-bold text-xl tracking-widest italic text-white hover:text-[#00FFFF] px-8 py-4 transition-transform hover:translate-x-2 flex items-center gap-4 hover:skew-x-[-12deg] hover:bg-zinc-800" href="#!">
                        <span className="material-symbols-outlined" data-icon="query_stats">query_stats</span>
                        PROGRESS
                    </a>
                    <a className="font-headline font-bold text-xl tracking-widest italic text-white hover:text-[#00FFFF] px-8 py-4 transition-transform hover:translate-x-2 flex items-center gap-4 hover:skew-x-[-12deg] hover:bg-zinc-800" href="#!">
                        <span className="material-symbols-outlined" data-icon="account_circle">account_circle</span>
                        PROFILE
                    </a>
                </nav>
                <div className="mt-auto px-8 mb-12 flex flex-col gap-4">
                    <button className="bg-[#00FFFF] text-black font-headline font-black italic py-3 skew-x-[-15deg] hover:bg-white transition-colors">
                        INITIATE BREACH
                    </button>
                    <div className="flex flex-col gap-2 opacity-60">
                        <a className="flex items-center gap-2 font-label text-sm hover:text-[#FF003C]" href="#!">
                            <span className="material-symbols-outlined text-sm" data-icon="settings">settings</span> SETTINGS
                        </a>
                        <a className="flex items-center gap-2 font-label text-sm hover:text-[#FF003C]" href="#!">
                            <span className="material-symbols-outlined text-sm" data-icon="power_settings_new">power_settings_new</span> LOGOUT
                        </a>
                    </div>
                </div>
            </aside>

            {/* Main Content Canvas */}
            <main className="md:ml-72 pt-32 px-8 md:px-16 pb-20 overflow-x-hidden">
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