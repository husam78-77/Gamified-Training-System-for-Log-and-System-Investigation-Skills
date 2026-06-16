import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function InvestigationCategories() {
    const navigate = useNavigate();

    // --- Kinetic Animation Variants ---
    const staggerContainer = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.1 }
        }
    };

    const slamLeft = {
        hidden: { opacity: 0, x: -60, skewX: "15deg" },
        show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
    };

    const slamRight = {
        hidden: { opacity: 0, x: 60, skewX: "-15deg" },
        show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
    };

    const slamUp = {
        hidden: { opacity: 0, y: 40, skewX: "5deg" },
        show: { opacity: 1, y: 0, skewX: "0deg", transition: { type: "spring", stiffness: 400, damping: 25 } }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00FFFF] selection:text-black overflow-hidden relative flex flex-col">

            {/* ==========================================
                THE VOID: Tactical Background & Grid
                ========================================== */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:8rem_8rem]"></div>

                {/* Asymmetric Ambient Glows */}
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#FF003C]/5 blur-[120px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00FFFF]/5 blur-[100px] rounded-full mix-blend-screen"></div>
            </div>

            {/* MAIN CONTENT CANVAS */}
            <main className="relative z-20 flex-1 w-full max-w-[1600px] mx-auto px-6 md:px-12 pt-10 md:pt-20 pb-24 flex flex-col justify-center">

                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="w-full">

                    {/* Header Section */}
                    <motion.div variants={slamLeft} className="mb-12 md:mb-20 relative z-30">
                        <div className="absolute -top-8 left-2 bg-white text-black px-4 py-1 font-bold text-[10px] tracking-[0.4em] uppercase shadow-[4px_4px_0px_#FF003C] skew-x-[-10deg]">
                            <span className="skew-x-[10deg] block">PHASE 1 // VECTOR_SELECTION</span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white skew-x-[-6deg] mb-4 mix-blend-difference drop-shadow-[4px_4px_0px_#FF003C]">
                            SELECT_YOUR_<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF003C] to-[#80001e]">TARGET</span>
                        </h1>
                        <div className="h-1.5 w-64 bg-gradient-to-r from-[#00FFFF] to-transparent skew-x-[-6deg]"></div>
                        <p className="mt-6 font-mono text-xs text-white/50 uppercase tracking-[0.2em] max-w-xl leading-relaxed">
                            Choose an investigation vector to begin the extraction. Every protocol requires specific tactical alignment. Choose wisely, operative.
                        </p>
                    </motion.div>

                    {/* ASYMMETRICAL PANELS */}
                    <div className="flex flex-col xl:flex-row gap-12 xl:gap-4 items-stretch justify-between relative z-20">

                        {/* TYPE 1: BRUTE FORCE (The Red Pill) */}
                        <motion.div variants={slamUp} className="group relative w-full xl:w-[30%] transition-all duration-500 hover:-translate-y-4">
                            {/* Ambient Hover Glow */}
                            <div className="absolute -inset-4 bg-[#FF003C]/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                            {/* Floating Metadata Card */}
                            <div className="absolute -bottom-6 -right-6 bg-[#FF003C] text-black font-mono font-bold px-6 py-2 text-[10px] tracking-[0.2em] skew-x-[-15deg] shadow-[8px_8px_0px_#050505] z-30 transition-transform group-hover:translate-x-2">
                                <span className="skew-x-[15deg] block uppercase">DIFFICULTY: HIGH_IMPACT</span>
                            </div>

                            {/* Main Container Geometry */}
                            <div
                                className="relative bg-[#0A0A0A] h-full shadow-[20px_20px_0px_rgba(5,5,5,0.9)] flex flex-col border border-[#FF003C]/20"
                                style={{ clipPath: "polygon(0 0, calc(100% - 50px) 0, 100% 50px, 100% 100%, 50px 100%, 0 calc(100% - 50px))" }}
                            >
                                {/* Inner Tonal Layer */}
                                <div className="bg-[#0D0D0D] flex-1 p-6 sm:p-10 md:p-14 relative overflow-hidden flex flex-col justify-between">
                                    {/* Accent Geometric Slash */}
                                    <div className="absolute top-0 right-0 w-[150%] h-32 bg-gradient-to-b from-[#FF003C]/10 to-transparent -rotate-12 translate-x-1/4 -translate-y-1/2 pointer-events-none"></div>

                                    <div>
                                        <div className="flex justify-between items-start mb-10">
                                            <span className="font-mono text-[#FF003C] text-[10px] tracking-[0.4em] font-bold uppercase flex items-center gap-2">
                                                <span className="w-2 h-2 bg-[#FF003C] animate-pulse"></span>
                                                PROTOCOL // 001-ALPHA
                                            </span>
                                            <span className="material-symbols-outlined text-[#FF003C] text-4xl sm:text-5xl drop-shadow-[0_0_15px_#FF003C]">password</span>
                                        </div>

                                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-white mb-6 skew-x-[-8deg] drop-shadow-[2px_2px_0px_black]">
                                            BRUTE FORCE
                                        </h2>

                                        <p className="text-white/60 font-sans text-sm sm:text-base leading-relaxed max-w-md mb-8">
                                            Analyze and execute massive-scale login breaches. Identify weak vectors for <span className="text-[#FF003C] font-bold">credential stuffing</span> and dictionary-based extraction protocols.
                                        </p>

                                        <div className="flex flex-wrap gap-2 sm:gap-3 mb-16">
                                            <span className="px-3 py-1.5 bg-[#050505] border border-white/10 font-mono text-[9px] text-white/50 tracking-[0.1em] uppercase">AUTH_STRESS</span>
                                            <span className="px-3 py-1.5 bg-[#050505] border border-white/10 font-mono text-[9px] text-white/50 tracking-[0.1em] uppercase">DICT_MAPPING</span>
                                            <span className="px-3 py-1.5 bg-[#050505] border border-[#FF003C]/30 font-mono text-[9px] text-[#FF003C] tracking-[0.1em] uppercase">SESSION_HIJACK</span>
                                        </div>
                                    </div>

                                    {/* Kinetic Button */}
                                    <button
                                        onClick={() => navigate('/sequence/bruteforce')}
                                        className="relative w-full py-4 sm:py-6 bg-[#FF003C] text-white font-black text-lg sm:text-2xl italic tracking-tighter uppercase transition-all hover:bg-white hover:text-black skew-x-[-12deg] shadow-[10px_10px_0px_#050505] group/btn flex items-center justify-between px-6 sm:px-8"
                                    >
                                        <span className="skew-x-[12deg] block">INITIATE BREACH</span>
                                        <span className="skew-x-[12deg] material-symbols-outlined text-2xl sm:text-3xl transform group-hover/btn:translate-x-2 transition-transform">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Divider for desktop */}
                        <div className="hidden xl:flex flex-col items-center justify-center w-[2%] opacity-30">
                            <div className="w-[1px] h-32 bg-gradient-to-b from-transparent to-white"></div>
                            <span className="font-mono text-[10px] tracking-[0.3em] uppercase py-4 writing-vertical transform rotate-180">OR</span>
                            <div className="w-[1px] h-32 bg-gradient-to-t from-transparent to-white"></div>
                        </div>

                        {/* TYPE 2: SUSPICIOUS SCRIPT (The Blue Pill) */}
                        <motion.div variants={slamUp} className="group relative w-full xl:w-[30%] xl:mt-16 transition-all duration-500 hover:-translate-y-4">
                            {/* Ambient Hover Glow */}
                            <div className="absolute -inset-4 bg-[#00FFFF]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                            {/* Floating Metadata Card - Reversed position */}
                            <div className="absolute -top-6 -left-6 bg-[#00FFFF] text-black font-mono font-bold px-6 py-2 text-[10px] tracking-[0.2em] skew-x-[15deg] shadow-[8px_8px_0px_#050505] z-30 transition-transform group-hover:-translate-x-2">
                                <span className="skew-x-[-15deg] block uppercase">TYPE: MALWARE_TRIAGE</span>
                            </div>

                            {/* Main Container Geometry (Opposite Slashes) */}
                            <div
                                className="relative bg-[#0A0A0A] h-full shadow-[20px_20px_0px_rgba(5,5,5,0.9)] flex flex-col border border-[#00FFFF]/20"
                                style={{ clipPath: "polygon(50px 0, 100% 0, 100% calc(100% - 50px), calc(100% - 50px) 100%, 0 100%, 0 50px)" }}
                            >
                                {/* Inner Tonal Layer */}
                                <div className="bg-[#0D0D0D] flex-1 p-6 sm:p-10 md:p-14 relative overflow-hidden flex flex-col justify-between">
                                    {/* Accent Geometric Slash */}
                                    <div className="absolute bottom-0 left-0 w-[150%] h-32 bg-gradient-to-t from-[#00FFFF]/5 to-transparent rotate-12 -translate-x-1/4 translate-y-1/2 pointer-events-none"></div>

                                    <div>
                                        <div className="flex justify-between items-start mb-10">
                                            <span className="font-mono text-[#00FFFF] text-[10px] tracking-[0.4em] font-bold uppercase flex items-center gap-2">
                                                <span className="w-2 h-2 bg-[#00FFFF] shadow-[0_0_8px_#00FFFF] animate-pulse"></span>
                                                PROTOCOL // 004-GAMMA
                                            </span>
                                            <span className="material-symbols-outlined text-[#00FFFF] text-4xl sm:text-5xl drop-shadow-[0_0_15px_#00FFFF]">terminal</span>
                                        </div>

                                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-white mb-6 skew-x-[-8deg] drop-shadow-[2px_2px_0px_black]">
                                            SUSPICIOUS<br />SCRIPT_<wbr />EXEC
                                        </h2>

                                        <p className="text-white/60 font-sans text-sm sm:text-base leading-relaxed max-w-md mb-8">
                                            Deep-dive malware analysis and shell-script decryption. Trace <span className="text-[#00FFFF] font-bold">obfuscated payloads</span> and dismantle lateral movement scripts in real-time.
                                        </p>

                                        <ul className="space-y-3 font-mono text-[10px] text-white/50 uppercase tracking-[0.1em] mb-16">
                                            <li className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 bg-[#00FFFF]"></div> DE-OBFUSCATION_ENGINE_V4
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 bg-[#00FFFF]"></div> HEURISTIC_PATTERN_MATCH
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Kinetic Button (Ghost Style for Secondary) */}
                                    <button
                                        onClick={() => navigate('/sequence/script')}
                                        className="relative w-full py-4 sm:py-6 bg-transparent ring-2 ring-[#00FFFF] text-[#00FFFF] font-black text-lg sm:text-2xl italic tracking-tighter uppercase transition-all hover:bg-[#00FFFF] hover:text-black skew-x-[-12deg] shadow-[10px_10px_0px_#050505] group/btn flex items-center justify-between px-6 sm:px-8"
                                    >
                                        <span className="skew-x-[12deg] block">ANALYZE SCRIPT</span>
                                        <span className="skew-x-[12deg] material-symbols-outlined text-2xl sm:text-3xl transform group-hover/btn:translate-x-2 transition-transform">code_blocks</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Divider for desktop */}
                        <div className="hidden xl:flex flex-col items-center justify-center w-[2%] opacity-30 xl:mt-16">
                            <div className="w-[1px] h-32 bg-gradient-to-b from-transparent to-white"></div>
                            <span className="font-mono text-[10px] tracking-[0.3em] uppercase py-4 writing-vertical transform rotate-180">OR</span>
                            <div className="w-[1px] h-32 bg-gradient-to-t from-transparent to-white"></div>
                        </div>

                        {/* TYPE 3: SSH FORENSICS (The Green Pill) */}
                        <motion.div variants={slamUp} className="group relative w-full xl:w-[30%] xl:mt-32 transition-all duration-500 hover:-translate-y-4">
                            {/* Ambient Hover Glow */}
                            <div className="absolute -inset-4 bg-[#00FF00]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                            {/* Floating Metadata Card */}
                            <div className="absolute -bottom-6 -right-6 bg-[#00FF00] text-black font-mono font-bold px-6 py-2 text-[10px] tracking-[0.2em] skew-x-[-15deg] shadow-[8px_8px_0px_#050505] z-30 transition-transform group-hover:translate-x-2">
                                <span className="skew-x-[15deg] block uppercase">TYPE: INCIDENT_RESPONSE</span>
                            </div>

                            {/* Main Container Geometry */}
                            <div
                                className="relative bg-[#0A0A0A] h-full shadow-[20px_20px_0px_rgba(5,5,5,0.9)] flex flex-col border border-[#00FF00]/20"
                                style={{ clipPath: "polygon(0 0, calc(100% - 50px) 0, 100% 50px, 100% 100%, 50px 100%, 0 calc(100% - 50px))" }}
                            >
                                {/* Inner Tonal Layer */}
                                <div className="bg-[#0D0D0D] flex-1 p-6 sm:p-10 md:p-14 relative overflow-hidden flex flex-col justify-between">
                                    {/* Accent Geometric Slash */}
                                    <div className="absolute top-0 right-0 w-[150%] h-32 bg-gradient-to-b from-[#00FF00]/10 to-transparent -rotate-12 translate-x-1/4 -translate-y-1/2 pointer-events-none"></div>

                                    <div>
                                        <div className="flex justify-between items-start mb-10">
                                            <span className="font-mono text-[#00FF00] text-[10px] tracking-[0.4em] font-bold uppercase flex items-center gap-2">
                                                <span className="w-2 h-2 bg-[#00FF00] shadow-[0_0_8px_#00FF00] animate-pulse"></span>
                                                PROTOCOL // 009-SIGMA
                                            </span>
                                            <span className="material-symbols-outlined text-[#00FF00] text-4xl sm:text-5xl drop-shadow-[0_0_15px_#00FF00]">fingerprint</span>
                                        </div>

                                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-white mb-6 skew-x-[-8deg] drop-shadow-[2px_2px_0px_black]">
                                            SSH<br />FORENSICS
                                        </h2>

                                        <p className="text-white/60 font-sans text-sm sm:text-base leading-relaxed max-w-md mb-8">
                                            Trace unauthorized access and lateral movement through secure shell logs. Analyze <span className="text-[#00FF00] font-bold">session fingerprints</span> and uncover the intrusion origin.
                                        </p>

                                        <ul className="space-y-3 font-mono text-[10px] text-white/50 uppercase tracking-[0.1em] mb-16">
                                            <li className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 bg-[#00FF00]"></div> LOG_ANALYSIS_MATRIX
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 bg-[#00FF00]"></div> IP_GEO_TRACING
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Kinetic Button */}
                                    <button
                                        onClick={() => navigate('/sequence/ssh_forensics')}
                                        className="relative w-full py-4 sm:py-6 bg-transparent ring-2 ring-[#00FF00] text-[#00FF00] font-black text-lg sm:text-2xl italic tracking-tighter uppercase transition-all hover:bg-[#00FF00] hover:text-black skew-x-[-12deg] shadow-[10px_10px_0px_#050505] group/btn flex items-center justify-between px-6 sm:px-8"
                                    >
                                        <span className="skew-x-[12deg] block">INVESTIGATE LOGS</span>
                                        <span className="skew-x-[12deg] material-symbols-outlined text-2xl sm:text-3xl transform group-hover/btn:translate-x-2 transition-transform">travel_explore</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </motion.div>
            </main>
        </div>
    );
}