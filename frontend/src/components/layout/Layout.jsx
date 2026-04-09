import Header from "./Header";
import Sidebar from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export default function Layout({ children }) {
    const location = useLocation();

    // The signature P5 snapping ease curve
    const p5Ease = [0.85, 0, 0.15, 1];
    const paperWhite = "#b3afb0";

    // 🧠 Route Identifier
    const getPageType = (path) => {
        if (path.includes("mission")) return "mission";
        if (path.includes("sequence")) return "sequence";
        if (path.includes("profile")) return "profile";
        return "dashboard";
    };

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

    // 🔴 Mission (Aggressive, Heavy Contrast)
    const missionVariants = {
        initial: {
            opacity: 0,
            scale: 1.05,
            rotate: 4,
            x: 60,
            filter: "grayscale(100%) contrast(1.2)",
            clipPath: "polygon(3% 2%, 98% 4%, 96% 98%, 2% 96%)"
        },
        animate: {
            opacity: 1,
            scale: 1,
            rotate: 0,
            x: 0,
            filter: "grayscale(0%) contrast(1)",
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            transition: { type: "spring", stiffness: 350, damping: 25, delay: 0.25 }
        },
        exit: {
            opacity: 0,
            scale: 0.98,
            rotate: -2,
            x: -30,
            filter: "grayscale(100%) brightness(0.5)",
            clipPath: "polygon(2% 4%, 96% 2%, 100% 96%, 4% 100%)",
            transition: { duration: 0.3, ease: p5Ease }
        }
    };

    // 🟣 Sequence (Digital Glitch / Tearing)
    const sequenceVariants = {
        initial: {
            opacity: 0,
            x: -20,
            skewX: "10deg",
            filter: "brightness(2) contrast(1.5)"
        },
        animate: {
            opacity: 1,
            x: [0, -15, 10, -5, 0], // Sharp horizontal jumps
            skewX: "0deg",
            filter: "brightness(1) contrast(1)",
            transition: { duration: 0.4, ease: "easeInOut" }
        },
        exit: {
            opacity: 0,
            x: 20,
            skewX: "-15deg",
            filter: "brightness(2)",
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
                <AnimatePresence mode="wait">
                    <motion.div key={location.pathname} className="relative z-10">

                        {/* 🔪 Panels (Only trigger on Mission routes) */}
                        {pageType === "mission" && (
                            <>
                                {/* Black Cover Panel */}
                                <motion.div
                                    initial={{ x: "-10%", skewX: "-25deg" }} // Starts covering the screen
                                    animate={{ x: "-150%" }}                 // Sweeps left to reveal
                                    exit={{ x: "-10%" }}                     // Sweeps back in to cover on exit
                                    transition={{ duration: 0.5, ease: p5Ease }}
                                    className="fixed inset-y-0 w-[150vw] bg-[#050505] z-50 pointer-events-none"
                                    style={{ left: "-10vw", top: "-10vh", height: "120vh" }}
                                />
                                {/* Red Trailing Panel */}
                                <motion.div
                                    initial={{ x: "-10%", skewX: "-25deg" }}
                                    animate={{ x: "-150%" }}
                                    exit={{ x: "-10%" }}
                                    transition={{ duration: 0.5, ease: p5Ease, delay: 0.08 }} // Slight delay for stagger
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
                                    : "none"
                            }}
                        >
                            <div
                                className="p-6 md:p-8 min-h-[60vh] relative overflow-hidden"
                                style={{
                                    backgroundColor: "#161616",
                                    color: paperWhite,
                                    border: pageType === "mission" ? `2px solid ${paperWhite}40` : "none"
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