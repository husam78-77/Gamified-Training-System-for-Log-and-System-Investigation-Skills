import React, { useState } from 'react';
import Header from "./Header";
import Sidebar from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export default function Layout({ children }) {
    const location = useLocation();

    // The signature P5 snapping ease curve
    const p5Ease = [0.85, 0, 0.15, 1];

    const getPageType = (path) => {
        if (path.includes("mission")) return "mission";
        if (path.includes("sequence")) return "sequence";
        if (path.includes("profile")) return "profile";
        return "dashboard";
    };

    const pageType = getPageType(location.pathname);

    // 🎬 Dashboard (Clean & Snappy Drop-in)
    const dashboardVariants = {
        initial: { opacity: 0, y: 40, scale: 0.98 },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 400, damping: 30, delay: 0.1 }
        },
        exit: {
            opacity: 0,
            y: -20,
            scale: 0.98,
            transition: { duration: 0.2, ease: "easeOut" }
        }
    };

    // 🔴 Mission (Aggressive Kinetic Slam - High Velocity)
    const missionVariants = {
        initial: {
            opacity: 0,
            scale: 1.05,
            rotate: 2,
            x: 80,
            skewX: "10deg"
        },
        animate: {
            opacity: 1,
            scale: 1,
            rotate: 0,
            x: 0,
            skewX: "0deg",
            transition: { type: "spring", stiffness: 350, damping: 25, delay: 0.1 }
        },
        exit: {
            opacity: 0,
            scale: 0.98,
            rotate: -1,
            x: -40,
            skewX: "-5deg",
            transition: { duration: 0.3, ease: p5Ease }
        }
    };

    // 🟣 Sequence (Digital Glitch / Tearing)
    const sequenceVariants = {
        initial: {
            opacity: 0,
            x: -40,
            skewX: "15deg",
        },
        animate: {
            opacity: 1,
            x: [0, -20, 15, -5, 0], // Sharp horizontal glitch jumps
            skewX: "0deg",
            transition: { duration: 0.5, ease: "easeInOut", times: [0, 0.2, 0.4, 0.6, 1] }
        },
        exit: {
            opacity: 0,
            x: 40,
            skewX: "-15deg",
            transition: { duration: 0.2 }
        }
    };

    // 🟢 Profile (Tactical Slide Up)
    const profileVariants = {
        initial: { opacity: 0, scale: 0.95, y: 60, skewX: "5deg" },
        animate: {
            opacity: 1,
            scale: 1,
            y: 0,
            skewX: "0deg",
            transition: { type: "spring", stiffness: 300, damping: 25, delay: 0.1 }
        },
        exit: {
            opacity: 0,
            scale: 1.02,
            y: -30,
            transition: { duration: 0.2 }
        }
    };

    const getVariants = () => {
        switch (pageType) {
            case "mission": return missionVariants;
            case "sequence": return sequenceVariants;
            case "profile": return profileVariants;
            default: return dashboardVariants;
        }
    };

    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="bg-[#050505] h-screen text-white font-sans overflow-hidden selection:bg-[#00FFFF] selection:text-black relative flex">

            {/* ==========================================
                GLOBAL VOID: Background Grids
                ========================================== */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:8rem_8rem]"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-[#050505] via-transparent to-[#050505] opacity-80"></div>
            </div>

            {/* Persistent Architecture */}
            <Header onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)} />
            <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

            {/* Main Content Area - Offsets for Sidebar and Header */}
            <main className="md:ml-[320px] w-full h-screen relative z-10 flex flex-col pt-20 overflow-y-auto overflow-x-hidden">
                <AnimatePresence mode="popLayout">
                    <motion.div key={location.pathname} className="flex-1 w-full relative flex flex-col">

                        {/* ==========================================
                            THEATRICS: The Breach Transition Slashes
                            Triggered exclusively on Mission routes
                            ========================================== */}
                        {pageType === "mission" && (
                            <>
                                {/* The Void Sweep */}
                                <motion.div
                                    initial={{ x: "-10%", skewX: "-25deg" }}
                                    animate={{ x: "-150%" }}
                                    exit={{ x: "-150%", opacity: 0 }}
                                    transition={{ duration: 0.6, ease: p5Ease }}
                                    className="fixed inset-y-0 w-[150vw] bg-[#050505] z-[100] pointer-events-none"
                                    style={{ left: "-10vw", top: "-10vh", height: "120vh" }}
                                />
                                {/* The Primary Red Sweep */}
                                <motion.div
                                    initial={{ x: "-10%", skewX: "-25deg" }}
                                    animate={{ x: "-150%" }}
                                    exit={{ x: "-150%", opacity: 0 }}
                                    transition={{ duration: 0.6, ease: p5Ease, delay: 0.1 }}
                                    className="fixed inset-y-0 w-[150vw] bg-[#FF003C] z-[90] pointer-events-none shadow-[20px_0_60px_rgba(255,0,60,0.5)]"
                                    style={{ left: "-10vw", top: "-10vh", height: "120vh" }}
                                />
                            </>
                        )}

                        {/* ==========================================
                            ROUTED CONTENT
                            ========================================== */}
                        <motion.div
                            variants={getVariants()}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="flex-1 flex flex-col w-full relative z-10"
                            style={{ willChange: "transform, opacity" }}
                        >
                            {/* Children now handle their own padding and edge-to-edge rendering */}
                            {children}
                        </motion.div>

                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}