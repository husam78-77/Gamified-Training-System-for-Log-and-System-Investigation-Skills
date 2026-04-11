import Header from "./Header";
import Sidebar from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export default function Layout({ children }) {
    const location = useLocation();

    const p5Ease = [0.85, 0, 0.15, 1];
    const paperWhite = "#b3afb0";

    const getPageType = (path) => {
        if (path.includes("mission")) return "mission";
        if (path.includes("sequence")) return "sequence";
        if (path.includes("profile")) return "profile";
        return "dashboard";
    };
    console.log("LAYOUT PATH:", location.pathname);
    const pageType = getPageType(location.pathname);

    // 🎬 Dashboard (Clean & Snappy)
    const dashboardVariants = {
        initial: { opacity: 0, y: 30, scale: 0.98 },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 400, damping: 30 }
        },
        exit: {
            opacity: 0,
            y: -20,
            scale: 0.98,
            transition: { duration: 0.2 }
        }
    };

    // 🔴 Mission (Aggressive Transforms - OPTIMIZED FOR GPU)
    const missionVariants = {
        initial: {
            opacity: 0,
            scale: 1.05,
            rotate: 4,
            x: 60,
            // Removed filter and clipPath animations for performance
        },
        animate: {
            opacity: 1,
            scale: 1,
            rotate: 0,
            x: 0,
            transition: { type: "spring", stiffness: 350, damping: 25 }
        },
        exit: {
            opacity: 0,
            scale: 0.98,
            rotate: -2,
            x: -30,
            transition: { duration: 0.3, ease: p5Ease }
        }
    };

    // 🟣 Sequence (Digital Glitch / Tearing - OPTIMIZED FOR GPU)
    const sequenceVariants = {
        initial: {
            opacity: 0,
            x: -20,
            skewX: "10deg",
        },
        animate: {
            opacity: 1,
            x: [0, -15, 10, -5, 0], // Sharp horizontal jumps
            skewX: "0deg",
            transition: { duration: 0.4, ease: "easeInOut" }
        },
        exit: {
            opacity: 0,
            x: 20,
            skewX: "-15deg",
            transition: { duration: 0.2 }
        }
    };

    // 🟢 Profile (Soft but firm card flip/slide)
    const profileVariants = {
        initial: { opacity: 0, scale: 0.9, y: 40 },
        animate: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 25 }
        },
        exit: {
            opacity: 0,
            scale: 1.05,
            y: -20,
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

    return (
        <div className="dashboard-wrapper bg-[#0D0D0D] min-h-screen font-black overflow-hidden relative">
            <Header />
            <Sidebar />

            {/* Background texture */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay" />

            <main className="md:ml-72 pt-32 px-8 md:px-16 pb-20 relative">
                <AnimatePresence mode="popLayout">
                    <motion.div key={location.key} className="relative z-10">

                        {/* 🔪 Panels (Only trigger on Mission routes) */}
                        {pageType === "mission" && (
                            <>
                                {/* Black Cover Panel */}
                                <motion.div
                                    initial={{ x: "-10%", skewX: "-25deg" }}
                                    animate={{ x: "-150%" }}
                                    exit={{ x: "-10%" }}
                                    transition={{ duration: 0.5, ease: p5Ease }}
                                    className="fixed inset-y-0 w-[150vw] bg-[#050505] z-50 pointer-events-none"
                                    style={{ left: "-10vw", top: "-10vh", height: "120vh" }}
                                />
                                {/* Red Trailing Panel */}
                                <motion.div
                                    initial={{ x: "-10%", skewX: "-25deg" }}
                                    animate={{ x: "-150%" }}
                                    exit={{ x: "-10%" }}
                                    transition={{ duration: 0.5, ease: p5Ease, delay: 0.08 }}
                                    className="fixed inset-y-0 w-[150vw] bg-[#E01E26] z-40 pointer-events-none"
                                    style={{ left: "-10vw", top: "-10vh", height: "120vh" }}
                                />
                            </>
                        )}

                        {/* 🎬 Main Content */}
                        <motion.div
                            variants={getVariants()}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="relative z-10 rounded-sm"
                            style={{
                                boxShadow: pageType === "mission"
                                    ? `10px 10px 0px #E01E26, 20px 20px 0px #050505`
                                    : "none",
                                // Note: We use will-change to warn the browser that this element will be transformed
                                willChange: "transform, opacity"
                            }}
                        >
                            <div
                                className="p-6 md:p-8 min-h-[60vh] relative overflow-hidden"
                                style={{
                                    backgroundColor: "#161616",
                                    color: paperWhite,
                                    // Kept the jagged border, but made it static so it doesn't animate
                                    border: pageType === "mission" ? `2px solid ${paperWhite}40` : "none",
                                    clipPath: pageType === "mission" ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" : "none"
                                }}
                            >
                                {/* 🔺 Jagged Corners (Only for Mission) */}
                                {pageType === "mission" && (
                                    <>
                                        <div className="absolute top-0 left-0 w-8 h-8 bg-[#E01E26]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
                                        <div className="absolute bottom-0 right-0 w-10 h-10" style={{ backgroundColor: paperWhite, clipPath: "polygon(100% 100%, 100% 0, 0 100%)" }} />
                                    </>
                                )}

                                {children}
                            </div>
                        </motion.div>

                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}