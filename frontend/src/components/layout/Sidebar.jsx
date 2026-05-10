import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useProgression } from "../../context/ProgressionContext";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { progression } = useProgression();

    const username = progression?.identity?.username || 'UNKNOWN_OPERATIVE';
    const rank = progression?.identity?.rank || 'ROGUE_AGENT';

    // State to trigger the dramatic exit sequence
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // The signature P5 snapping ease curve
    const p5Ease = [0.85, 0, 0.15, 1];

    const handleLogout = () => {
        setIsLoggingOut(true);

        // Wait for the animation to finish smashing the screen before actually leaving
        setTimeout(() => {
            logout();
            navigate("/login");
        }, 1100);
    };

    // Navigation configuration for cleaner mapping
    const navItems = [
        { path: "/dashboard", icon: "grid_view", label: "DASHBOARD" },
        { path: "/mission", icon: "ads_click", label: "MISSIONS" },
        { path: "/progress", icon: "query_stats", label: "PROGRESS" },
        { path: "/profile", icon: "account_circle", label: "PROFILE" }
    ];

    return (
        <>
            <aside
                // Changed pt-16 to pt-[120px] to sit perfectly beneath the 88px Header
                // Removed the top clip-path to ensure a flush, seamless connection
                className="fixed left-0 top-0 h-full w-[320px] bg-[#0A0A0A] shadow-[30px_0_60px_rgba(0,0,0,0.9)] z-40 hidden md:flex flex-col pt-[120px] pb-8 border-r border-[#FF003C]/20"
            >
                {/* Accent Line - starts exactly where the header ends */}
                <div className="absolute top-[88px] right-0 w-[1px] h-full bg-gradient-to-b from-[#FF003C] via-[#FF003C]/20 to-transparent"></div>

                {/* Identity Block */}
                <div className="px-10 mb-12 relative">
                    {/* Floating target bracket detail behind the avatar */}
                    <div className="absolute top-2 left-6 w-12 h-12 border-l-2 border-t-2 border-[#00FFFF]/30"></div>

                    <div className="flex flex-col gap-6 pt-4 relative z-10">
                        <div className="w-20 h-20 bg-[#050505] rotate-45 border-2 border-[#00FFFF] overflow-hidden shadow-[0_0_20px_rgba(0,255,255,0.2)] ml-2">
                            <img
                                alt="Agent Profile"
                                className="-rotate-45 scale-[1.7] translate-y-2 grayscale contrast-125 mix-blend-luminosity"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkYa08sVOlAGzQ6Gzby1PxLwT7GY1Rf-ExkJcSYkhrZ4WqOx6WGzGq1EzBvC-YC46xBvF08zebkEpv6g82gDSA4DNkAO0r6gaWeLQ4_BsLGc8A27f-5obhZrjrRCgGGTJCOdI8YqTOnc6YxAH5bOzx1sv6dW0GQ1XdeKuZKxJ9RfDOczDNgUB_eU2hXJUiZFrvj7A3MfMDnlykCQBzO8Fdy0BNEuJdsw36Eks_H1oRao4V8V2k05pdDXZcUtIThKyNgjl-VAtrf7Q3"
                            />
                        </div>
                        <div>
                            <p className="font-mono text-[10px] text-[#00FFFF] tracking-[0.4em] font-bold uppercase mb-1">RANK: {rank}</p>
                            <p className="font-black italic text-3xl tracking-tighter text-white uppercase leading-none drop-shadow-[2px_2px_0px_#FF003C] skew-x-[-5deg] truncate max-w-[180px]">
                                {username}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2 w-full pr-8">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `relative font-black italic text-xl tracking-tighter px-10 py-4 flex items-center gap-5 transition-all uppercase group
                                ${isActive
                                    ? "bg-[#FF003C] text-black translate-x-4 skew-x-[-10deg]"
                                    : "text-white/40 hover:text-white hover:translate-x-2 hover:skew-x-[-10deg] hover:bg-white/5"}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* The Cyan underline detail for the active state to match the screenshot */}
                                    {isActive && (
                                        <div className="absolute -bottom-1.5 -left-1 w-[102%] h-1.5 bg-[#00FFFF] shadow-[0_0_10px_#00FFFF]"></div>
                                    )}
                                    <span className={`material-symbols-outlined text-2xl skew-x-[10deg] ${isActive ? 'text-black' : ''}`}>
                                        {item.icon}
                                    </span>
                                    <span className="skew-x-[10deg]">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom Actions */}
                <div className="mt-auto px-8 flex flex-col gap-6 pr-14">
                    <button className="w-full bg-transparent border-2 border-[#00FFFF] text-[#00FFFF] font-black italic text-xl py-4 skew-x-[-10deg] hover:bg-[#00FFFF] hover:text-black hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all flex items-center justify-center gap-3 group">
                        <span className="skew-x-[10deg] tracking-tighter">INITIATE BREACH</span>
                        <span className="material-symbols-outlined skew-x-[10deg] group-hover:rotate-90 transition-transform">bolt</span>
                    </button>

                    <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
                        <button className="flex items-center gap-3 font-mono font-bold text-[10px] tracking-[0.3em] uppercase text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-lg">settings</span>
                            SETTINGS
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 font-mono font-bold text-[10px] tracking-[0.3em] uppercase text-[#FF003C]/70 hover:text-[#FF003C] hover:translate-x-2 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">power_settings_new</span>
                            DISCONNECT_UPLINK
                        </button>
                    </div>
                </div>
            </aside>

            {/* 🎬 THE LOGOUT THEATRICS */}
            <AnimatePresence>
                {isLoggingOut && (
                    <motion.div
                        className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center overflow-hidden"
                    >
                        {/* Red Slash Sweeping In */}
                        <motion.div
                            initial={{ x: "150%", skewX: "-25deg" }}
                            animate={{ x: "-10%", skewX: "-25deg" }}
                            transition={{ duration: 0.5, ease: p5Ease }}
                            className="absolute inset-y-0 w-[150vw] bg-[#FF003C]"
                            style={{ left: "-20vw", top: "-10vh", height: "120vh" }}
                        />

                        {/* Black Blackout Panel Following */}
                        <motion.div
                            initial={{ x: "150%", skewX: "-25deg" }}
                            animate={{ x: "-10%", skewX: "-25deg" }}
                            transition={{ duration: 0.5, ease: p5Ease, delay: 0.15 }}
                            className="absolute inset-y-0 w-[150vw] bg-[#050505] border-l-[30px] border-[#FF003C]"
                            style={{ left: "-20vw", top: "-10vh", height: "120vh" }}
                        />

                        {/* Text Stamp Smashing In */}
                        <motion.div
                            initial={{ opacity: 0, scale: 2, rotate: 12, filter: "brightness(3)" }}
                            animate={{ opacity: 1, scale: 1, rotate: -4, filter: "brightness(1)" }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                                delay: 0.45
                            }}
                            className="relative z-10 text-white font-black italic tracking-tighter text-6xl md:text-8xl lg:text-9xl uppercase"
                            style={{
                                textShadow: "10px 10px 0px #FF003C, -5px -5px 0px #00FFFF",
                                clipPath: "polygon(2% 0, 100% 4%, 98% 100%, 0 96%)"
                            }}
                        >
                            <span className="bg-[#0A0A0A] px-10 py-4 border-4 border-white inline-block">
                                DISCONNECT
                            </span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}