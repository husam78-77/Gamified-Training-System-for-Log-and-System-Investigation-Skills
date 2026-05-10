import React from 'react';
import { motion } from 'framer-motion';
import { useProgression } from '../../context/ProgressionContext';

export default function Header() {
    const { progression } = useProgression();
    
    const level = progression?.identity?.level || 1;
    const xpPercent = progression?.identity?.xpPercent || 0;
    const username = progression?.identity?.username || 'UNKNOWN';

    // --- Kinetic Animation Variants ---
    const slamDown = {
        hidden: { opacity: 0, y: -40 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }
    };

    return (
        <header className="fixed top-0 left-0 w-full z-50 pointer-events-none">
            <motion.div
                variants={slamDown}
                initial="hidden"
                animate="show"
                // Changed from floating pill to a flush, full-width top bar
                className="w-full h-[88px] bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#FF003C]/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] pointer-events-auto flex items-stretch justify-between"
            >
                {/* ==========================================
                    LEFT: Brand & Designation (Sidebar Cap)
                    ========================================== */}
                {/* Width is 360px at top, slants down to 320px at bottom to perfectly match sidebar width */}
                <div
                    className="w-[360px] bg-[#FF003C] flex flex-col justify-center pl-8 relative shadow-[10px_0_20px_rgba(255,0,60,0.15)] group cursor-pointer hover:bg-white transition-colors"
                    style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 40px) 100%, 0 100%)" }}
                >
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-black text-3xl font-black group-hover:scale-110 transition-transform">
                            token
                        </span>
                        <h1 className="text-2xl font-black text-black italic tracking-tighter uppercase leading-none">
                            KINETIC_BREACH
                            <span className="block text-[11px] font-mono tracking-[0.3em] font-bold opacity-80 mt-1">V_1.0.4</span>
                        </h1>
                    </div>
                </div>

                {/* ==========================================
                    CENTER: Telemetry & Nav (Desktop Only)
                    ========================================== */}
                <nav className="hidden lg:flex items-center gap-10 flex-1 px-12">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <span className="font-mono text-[10px] text-white/40 tracking-[0.2em] uppercase group-hover:text-white transition-colors">OPERATIVE</span>
                        <span className="font-black italic text-xl uppercase tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">LVL {level}</span>
                    </div>

                    <div className="w-px h-6 bg-white/10 skew-x-[-12deg]"></div>

                    <div className="flex items-center gap-3 group cursor-pointer">
                        <span className="font-mono text-[10px] text-white/40 tracking-[0.2em] uppercase group-hover:text-white transition-colors">XP_YIELD</span>
                        <span className="font-black italic text-xl uppercase tracking-tighter text-[#00FFFF] drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">{xpPercent}%</span>
                    </div>

                    <div className="w-px h-6 bg-white/10 skew-x-[-12deg]"></div>

                    <div className="flex items-center gap-3 cursor-default">
                        <span className="w-2 h-2 bg-[#00FFFF] shadow-[0_0_8px_#00FFFF] animate-pulse"></span>
                        <span className="font-mono text-[10px] text-[#00FFFF] font-bold tracking-[0.2em] uppercase">SYSTEM_STABLE</span>
                    </div>

                    <div className="w-px h-6 bg-white/10 skew-x-[-12deg]"></div>

                    <div className="flex items-center gap-2 text-[#FF003C]">
                        <span className="material-symbols-outlined text-sm animate-pulse">timer</span>
                        <span className="font-mono font-bold text-sm tracking-widest">00:14:59</span>
                    </div>
                </nav>

                {/* ==========================================
                    RIGHT: Utility & Identity
                    ========================================== */}
                <div className="flex items-center gap-6 pr-8">
                    {/* Icons */}
                    <div className="flex items-center gap-4 border-r border-white/10 pr-6 mr-2 h-full">
                        <button className="text-white/40 hover:text-[#00FFFF] hover:scale-110 hover:drop-shadow-[0_0_10px_#00FFFF] transition-all flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">notifications_active</span>
                        </button>
                        <button className="text-white/40 hover:text-white hover:scale-110 hover:drop-shadow-[0_0_10px_white] transition-all flex items-center justify-center rotate-90 hover:rotate-180">
                            <span className="material-symbols-outlined text-2xl">settings_input_component</span>
                        </button>
                    </div>

                    {/* Avatar Block */}
                    <div className="group flex items-center gap-4 cursor-pointer">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="font-mono text-[9px] text-[#00FFFF] tracking-[0.3em] font-bold uppercase">ONLINE</span>
                            <span className="font-black italic text-sm text-white uppercase tracking-tighter group-hover:text-[#00FFFF] transition-colors">{username}</span>
                        </div>

                        <div className="relative w-12 h-12 skew-x-[-12deg] border border-white/20 group-hover:border-[#00FFFF] overflow-hidden shadow-[4px_4px_0px_#050505] transition-colors bg-black">
                            <img
                                alt="User Hacker Avatar"
                                className="w-[120%] h-full object-cover -translate-x-[10%] skew-x-[12deg] grayscale contrast-125 opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 mix-blend-luminosity group-hover:mix-blend-normal"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCU8vT3cRG3qY_1h2kYZFZlP4xohHJQ2ZVPT6AK8Y8B4Yf_bNIfwW__ap--bNSiAK_7uW87TGJDXprPbiPXDlCBQJTCd9olcx7kU3W2Hu5GjWEvvM95EbFVHprEf-Y_U64HV4b1sRKcnsptdFuKLCB5-cawWahZgDBUq8OOaZgUlEw6yYg6PQH0pt8Vt4syPae6CrJZ7u_RYLL6pXasTxEq7fMtYoLA7U3UgRg9_86qwOxHPtqHdMOLBP7xjzeEqrAsl6TD-f2tX1Qq"
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,255,255,0.1)_50%)] bg-[size:100%_4px] pointer-events-none"></div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </header>
    );
}