import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    // State to trigger the dramatic exit sequence
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const p5Ease = [0.85, 0, 0.15, 1];

    const handleLogout = () => {
        setIsLoggingOut(true);

        // Wait for the animation to finish smashing the screen before actually leaving
        setTimeout(() => {
            logout();
            navigate("/login");
        }, 1100);
    };

    return (
        <>
            <aside className="fixed left-10 top-0 h-full w-72 bg-zinc-950 border-r-[12px] border-[#FF003C] shadow-[20px_0_60px_rgba(0,0,0,0.8)] origin-top-left -skew-x-2 z-40 hidden md:flex flex-col pt-32 gap-6">
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
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `font-headline font-bold text-xl tracking-widest italic px-8 py-4 flex items-center gap-4 transition-all
                            ${isActive
                                ? "bg-[#FF003C] text-black -translate-x-4 skew-x-[-10deg] shadow-[10px_10px_0px_#00FFFF]"
                                : "text-white hover:text-[#00FFFF] hover:translate-x-2 hover:skew-x-[-12deg] hover:bg-zinc-800"}`
                        }
                    >
                        <span className="material-symbols-outlined">grid_view</span>
                        DASHBOARD
                    </NavLink>

                    <NavLink
                        to="/mission"
                        className={({ isActive }) =>
                            `font-headline font-bold text-xl tracking-widest italic px-8 py-4 flex items-center gap-4 transition-all
                            ${isActive
                                ? "bg-[#FF003C] text-black -translate-x-4 skew-x-[-10deg] shadow-[10px_10px_0px_#00FFFF]"
                                : "text-white hover:text-[#00FFFF] hover:translate-x-2 hover:skew-x-[-12deg] hover:bg-zinc-800"}`
                        }
                    >
                        <span className="material-symbols-outlined">ads_click</span>
                        MISSIONS
                    </NavLink>

                    <NavLink
                        to="/progress"
                        className={({ isActive }) =>
                            `font-headline font-bold text-xl tracking-widest italic px-8 py-4 flex items-center gap-4 transition-all
                            ${isActive
                                ? "bg-[#FF003C] text-black -translate-x-4 skew-x-[-10deg] shadow-[10px_10px_0px_#00FFFF]"
                                : "text-white hover:text-[#00FFFF] hover:translate-x-2 hover:skew-x-[-12deg] hover:bg-zinc-800"}`
                        }
                    >
                        <span className="material-symbols-outlined">query_stats</span>
                        PROGRESS
                    </NavLink>

                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `font-headline font-bold text-xl tracking-widest italic px-8 py-4 flex items-center gap-4 transition-all
                            ${isActive
                                ? "bg-[#FF003C] text-black -translate-x-4 skew-x-[-10deg] shadow-[10px_10px_0px_#00FFFF]"
                                : "text-white hover:text-[#00FFFF] hover:translate-x-2 hover:skew-x-[-12deg] hover:bg-zinc-800"}`
                        }
                    >
                        <span className="material-symbols-outlined">account_circle</span>
                        PROFILE
                    </NavLink>
                </nav>
                <div className="mt-auto px-8 mb-12 flex flex-col gap-4">
                    <button className="bg-[#00FFFF] text-black font-headline font-black italic py-3 skew-x-[-15deg] hover:bg-white transition-colors">
                        INITIATE BREACH
                    </button>
                    <div className="flex flex-col gap-2 opacity-60">
                        <a className="flex items-center gap-2 font-label text-sm hover:text-[#FF003C]" href="#!">
                            <span className="material-symbols-outlined text-sm" data-icon="settings">settings</span> SETTINGS
                        </a>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 font-label text-sm hover:text-[#FF003C]"
                        >
                            <span className="material-symbols-outlined text-sm">
                                power_settings_new
                            </span>
                            LOGOUT
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
                            className="absolute inset-y-0 w-[150vw] bg-[#E01E26]"
                            style={{ left: "-20vw", top: "-10vh", height: "120vh" }}
                        />

                        {/* Black Blackout Panel Following */}
                        <motion.div
                            initial={{ x: "150%", skewX: "-25deg" }}
                            animate={{ x: "-10%", skewX: "-25deg" }}
                            transition={{ duration: 0.5, ease: p5Ease, delay: 0.15 }}
                            className="absolute inset-y-0 w-[150vw] bg-[#050505] border-l-[30px] border-[#E01E26]"
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
                                delay: 0.45 // Drops in right after the black panel settles
                            }}
                            className="relative z-10 text-white font-black italic tracking-tighter text-6xl md:text-8xl lg:text-9xl uppercase"
                            style={{
                                textShadow: "10px 10px 0px #E01E26, -5px -5px 0px #00FFFF",
                                clipPath: "polygon(2% 0, 100% 4%, 98% 100%, 0 96%)" // Torn edge
                            }}
                        >
                            <span className="bg-[#161616] px-8 py-2 border-4 border-white inline-block">
                                DISCONNECT
                            </span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}