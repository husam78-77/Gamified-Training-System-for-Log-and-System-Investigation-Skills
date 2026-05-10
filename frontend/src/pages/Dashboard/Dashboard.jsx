import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useProgression } from '../../context/ProgressionContext';

export default function Dashboard() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const { progression } = useProgression();
    const [bruteForceMission, setBruteForceMission] = useState(null);
    const [scriptMission, setScriptMission] = useState(null);

    useEffect(() => {
        if (!token) return;
        const loadMissions = async () => {
            try {
                const scenRes = await fetch(`${import.meta.env.VITE_API_URL}/api/scenarios`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const scenJson = await scenRes.json();
                
                const progRes = await fetch(`${import.meta.env.VITE_API_URL}/api/users/progression`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const progJson = await progRes.json();

                if (scenJson.success && progJson.success) {
                    const allScenarios = scenJson.data.grouped || {};
                    const completedIds = new Set(
                        (progJson.data.missionArchive || [])
                            .filter(m => m.missionCompleted)
                            .map(m => m.scenarioId)
                    );

                    const bruteScenarios = allScenarios['brute_force'] || allScenarios['bruteforce'] || [];
                    const nextBrute = bruteScenarios.find(s => !completedIds.has(s.scenario_id));
                    setBruteForceMission(nextBrute || null);

                    const scriptScenarios = allScenarios['suspicious_script'] || allScenarios['script'] || [];
                    const nextScript = scriptScenarios.find(s => !completedIds.has(s.scenario_id));
                    setScriptMission(nextScript || null);
                }
            } catch (err) {
                console.error("Failed to load active vectors:", err);
            }
        };
        loadMissions();
    }, [token]);
    // --- Kinetic Animation Variants ---
    const staggerContainer = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.1 }
        }
    };

    const slamUp = {
        hidden: { opacity: 0, y: 60, skewX: "15deg" },
        show: { opacity: 1, y: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
    };

    const slamDown = {
        hidden: { opacity: 0, y: -40, skewX: "-10deg" },
        show: { opacity: 1, y: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00FFFF] selection:text-black overflow-hidden relative flex flex-col">

            {/* ==========================================
                THE VOID: Tactical Background & Grid
                ========================================== */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Micro-grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
                {/* Macro-grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:8rem_8rem]"></div>
                {/* Vignette & Core Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,0,60,0.03),transparent_50%)]"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] opacity-90"></div>
            </div>

            {/* Restricted Watermark */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none opacity-[0.02]">
                <h1 className="font-black italic text-[20vw] leading-none tracking-tighter whitespace-nowrap">BREACH</h1>
            </div>

            {/* ==========================================
                FLOATING COMMAND RIBBON (Replaces Sidebar)
                ========================================== */}
            <motion.header
                variants={slamDown}
                initial="hidden"
                animate="show"
                className="relative z-40 w-full max-w-[1800px] mx-auto px-6 md:px-12 pt-8"
            >

            </motion.header>

            {/* ==========================================
                MAIN CANVAS
                ========================================== */}
            <main className="relative z-20 flex-1 w-full max-w-[1800px] mx-auto px-6 md:px-12 pt-12 pb-24 overflow-y-auto custom-scrollbar">
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-16">

                    {/* --- Hero Progress Section --- */}
                    <motion.section variants={slamUp} className="relative w-full">
                        <div className="flex flex-col lg:flex-row items-end gap-12">
                            {/* Level Stamp */}
                            <div className="relative z-10 shrink-0 transform -skew-x-[10deg] translate-y-4">
                                <div className="absolute -top-6 left-2 bg-white text-black px-4 py-1 font-bold text-xs tracking-[0.3em] uppercase z-20 shadow-[4px_4px_0px_#FF003C]">
                                    CURRENT_LEVEL
                                </div>
                                <h2 className="text-9xl md:text-[14rem] font-black italic leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 drop-shadow-[8px_8px_0px_rgba(255,0,60,0.8)]">
                                    {progression?.identity?.level || 1}
                                </h2>
                            </div>

                            {/* XP Bar Component */}
                            <div className="flex-1 w-full pb-4 lg:pb-8">
                                <div className="flex items-end justify-between font-mono text-[10px] font-bold text-[#00FFFF] mb-4 uppercase tracking-[0.25em]">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-white/40">NEXT_UNLOCK: CLOAKING_RIG</span>
                                        <span className="text-lg text-white">XP_PROGRESSION</span>
                                    </div>
                                    <span className="text-xl">{progression?.identity?.xp || 0} <span className="text-white/30">/ {(progression?.identity?.level || 1) * 1000} XP</span></span>
                                </div>

                                {/* Slanted Bar Container */}
                                <div className="h-12 bg-[#0A0A0A] relative overflow-hidden skew-x-[-15deg] border-b-2 border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                                    {/* The Fill */}
                                    <div className="h-full bg-gradient-to-r from-[#FF003C] to-[#FF003C]/80 shadow-[0_0_30px_#FF003C] relative overflow-hidden flex items-center border-r-4 border-white"
                                         style={{ width: `${Math.min(100, Math.max(0, ((progression?.identity?.xp || 0) / ((progression?.identity?.level || 1) * 1000)) * 100))}%` }}>
                                        {/* Scanline effect */}
                                        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                    </div>
                                    {/* Grid Overlay */}
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,#000_2px,transparent_2px)] bg-[size:40px_100%] opacity-20 pointer-events-none"></div>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* --- Dynamic Asymmetrical Grid --- */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 xl:gap-16">

                        {/* ACTIVE VECTORS (Missions - Takes up 7 columns) */}
                        <div className="xl:col-span-7 space-y-12">
                            <motion.div variants={slamUp} className="flex items-center gap-6">
                                <h3 className="text-5xl font-black italic uppercase tracking-tighter skew-x-[-8deg] text-white">
                                    ACTIVE_VECTORS
                                </h3>
                                <div className="h-2 flex-1 bg-gradient-to-r from-[#FF003C] via-[#FF003C]/20 to-transparent skew-x-[-8deg]"></div>
                            </motion.div>

                            <div className="flex flex-col gap-10">
                                {/* Mission Card 1 (Critical) */}
                                <motion.div variants={slamUp} className="group relative transition-all duration-500 hover:translate-x-4">
                                    <div className="absolute -top-4 right-8 bg-[#FF003C] text-black px-4 py-1.5 font-mono text-[10px] font-bold z-20 uppercase tracking-widest shadow-[6px_6px_0px_#050505] skew-x-[-10deg]">
                                        <span className="skew-x-[10deg] block">PRIORITY: CRITICAL</span>
                                    </div>

                                    <div
                                        className="bg-[#0A0A0A] relative flex flex-col md:flex-row h-full shadow-[20px_20px_0px_rgba(5,5,5,0.8)] border border-white/5"
                                        style={{ clipPath: "polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 40px 100%, 0 calc(100% - 40px))" }}
                                    >
                                        <div className="relative w-full md:w-[45%] overflow-hidden bg-black min-h-[250px]">
                                            <img
                                                alt="Server Room Breach"
                                                className="absolute inset-0 w-full h-full object-cover grayscale contrast-150 opacity-40 group-hover:grayscale-0 group-hover:opacity-90 transition-all duration-700 scale-110 group-hover:scale-100 mix-blend-luminosity"
                                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJrtfo386RqE6kjgGUpz1X2Qnhu_oKuUHjS3ht9btxbiLrjDb7ETfxfX9GwVZ4bpXXA5eBfJbzvKuKose0Lz52oB52dwEmKy56r0uMJ4Ibvae_1q72Hp52v9CE4T6gRZWNliXVMIdWbTylwd8ZVmXU19s5vtO6HFuuMo5tOX1B_JYm7G9h8QJE3pW2_kbwNXog1RgDaSZezBT-CRLJ17XhvPgYerORpoPBRPvDcrQrKhNcZJxHpYik_Uzyiypfh6wASVuQtL-kMD2I"
                                            />
                                            <div className="absolute inset-0 bg-[#FF003C]/20 mix-blend-overlay"></div>
                                        </div>
                                        <div className="p-8 md:p-10 flex-1 flex flex-col justify-between bg-gradient-to-br from-[#0A0A0A] to-[#050505]">
                                            <div>
                                                <p className="font-mono font-bold text-[#00FFFF] text-[10px] tracking-[0.2em] mb-2 uppercase">NODE_EXPLOITATION</p>
                                                <h4 className="text-3xl font-black italic leading-tight uppercase text-white mb-4">
                                                    {bruteForceMission ? bruteForceMission.title : "NO NEW MISSIONS"}
                                                </h4>
                                            </div>
                                            {bruteForceMission && (
                                                <button 
                                                    onClick={() => navigate(`/briefing/${bruteForceMission.scenario_id}?mode=free&type=${bruteForceMission.type}`)}
                                                    className="mt-8 w-full bg-white text-black font-black italic text-xl py-4 skew-x-[-10deg] group-hover:bg-[#FF003C] group-hover:text-white transition-all flex items-center justify-between px-6 shadow-[8px_8px_0px_#050505]">
                                                    <span className="skew-x-[10deg] uppercase tracking-tighter">EXECUTE BREACH</span>
                                                    <span className="skew-x-[10deg] material-symbols-outlined text-3xl">arrow_forward</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Mission Card 2 (Low Priority) */}
                                <motion.div variants={slamUp} className="group relative transition-all duration-500 hover:translate-x-4 md:ml-12">
                                    <div className="absolute -top-4 right-8 bg-white text-black px-4 py-1.5 font-mono text-[10px] font-bold z-20 uppercase tracking-widest shadow-[6px_6px_0px_#050505] skew-x-[-10deg]">
                                        <span className="skew-x-[10deg] block">PRIORITY: LOW</span>
                                    </div>

                                    <div
                                        className="bg-[#0A0A0A] relative flex flex-col md:flex-row h-full shadow-[20px_20px_0px_rgba(5,5,5,0.8)] border border-white/5"
                                        style={{ clipPath: "polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 40px 100%, 0 calc(100% - 40px))" }}
                                    >
                                        <div className="relative w-full md:w-[45%] overflow-hidden bg-black min-h-[250px]">
                                            <img
                                                alt="Digital Circuitry"
                                                className="absolute inset-0 w-full h-full object-cover grayscale contrast-150 opacity-30 group-hover:opacity-70 transition-all duration-700 scale-110 group-hover:scale-100"
                                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtGi3tZD4Pj0MIUrCjX-y-XWiOo0UC5ZSkQM33NS9kakcoXytQTIEPnQoUobdJTl_xvEFwpINSiL9N5x9rGRaklN99kIER5nbcXmxtK1IOJU-wN4Rr99ujhewlWDBPBysUaUMxm6yiXSd4qaKaqmr8j9TFziHmTS6Z70xa6tdWoTYjtYPk19q5L3yuxkJap8-5og4GXRHkOQOp6euZSjsVPf2R3AbKvU7Xk2h_VL9qAEClCVyGSx8n2Nt2pGoUe1Yxru342Upt5mJR"
                                            />
                                            <div className="absolute inset-0 bg-[#00FFFF]/10 mix-blend-overlay"></div>
                                        </div>
                                        <div className="p-8 md:p-10 flex-1 flex flex-col justify-between bg-gradient-to-br from-[#0A0A0A] to-[#050505]">
                                            <div>
                                                <p className="font-mono font-bold text-white/40 text-[10px] tracking-[0.2em] mb-2 uppercase">SIGNAL_INTERCEPT</p>
                                                <h4 className="text-3xl font-black italic leading-tight uppercase text-white mb-4">
                                                    {scriptMission ? scriptMission.title : "NO NEW MISSIONS"}
                                                </h4>
                                            </div>
                                            {scriptMission && (
                                                <button 
                                                    onClick={() => navigate(`/briefing/${scriptMission.scenario_id}?mode=free&type=${scriptMission.type}`)}
                                                    className="mt-8 w-full bg-transparent ring-2 ring-white/10 text-white font-black italic text-xl py-4 skew-x-[-10deg] group-hover:ring-[#00FFFF] group-hover:bg-[#00FFFF]/10 group-hover:text-[#00FFFF] transition-all flex items-center justify-between px-6 shadow-[8px_8px_0px_#050505]">
                                                    <span className="skew-x-[10deg] uppercase tracking-tighter">ANALYZE FEED</span>
                                                    <span className="skew-x-[10deg] material-symbols-outlined text-3xl">analytics</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* DATA SHARDS (Logs & Stats - Takes up 5 columns) */}
                        <div className="xl:col-span-5 space-y-12">

                            {/* METRICS (Moved above logs for better flow without sidebar) */}
                            <motion.div variants={slamUp} className="bg-[#0D0D0D] p-10 skew-x-[2deg] shadow-[15px_15px_0px_rgba(255,0,60,0.15)] relative border border-[#FF003C]/20" style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)" }}>
                                <div className="absolute top-0 right-0 w-24 h-2 bg-[#FF003C]"></div>

                                <h3 className="text-sm font-mono font-bold uppercase mb-8 tracking-[0.2em] text-[#FF003C] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">monitoring</span>
                                    OPERATIVE_METRICS
                                </h3>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-[#050505] skew-x-[-5deg] ring-1 ring-white/10 flex flex-col justify-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-white/20"></div>
                                        <p className="font-black italic text-5xl text-white leading-none skew-x-[5deg]">12</p>
                                        <p className="font-mono text-[10px] font-bold text-white/40 mt-3 uppercase tracking-[0.2em] skew-x-[5deg]">Breaches</p>
                                    </div>
                                    <div className="p-6 bg-[#050505] skew-x-[-5deg] ring-1 ring-white/10 flex flex-col justify-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-white/20"></div>
                                        <p className="font-black italic text-5xl text-white leading-none skew-x-[5deg]">84<span className="text-2xl">%</span></p>
                                        <p className="font-mono text-[10px] font-bold text-white/40 mt-3 uppercase tracking-[0.2em] skew-x-[5deg]">Accuracy</p>
                                    </div>
                                    <div className="p-6 bg-[#00FFFF]/5 skew-x-[-5deg] ring-1 ring-[#00FFFF]/30 shadow-[inset_0_0_30px_rgba(0,255,255,0.05)] flex flex-col justify-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#00FFFF]"></div>
                                        <p className="font-black italic text-5xl text-[#00FFFF] leading-none skew-x-[5deg] drop-shadow-[0_0_10px_#00FFFF]">2.4<span className="text-2xl text-[#00FFFF]/50">k</span></p>
                                        <p className="font-mono text-[10px] font-bold text-[#00FFFF]/60 mt-3 uppercase tracking-[0.2em] skew-x-[5deg]">Nodes Hacked</p>
                                    </div>
                                    <div className="p-6 bg-[#050505] skew-x-[-5deg] ring-1 ring-white/10 flex flex-col justify-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#FF003C]/50"></div>
                                        <p className="font-black italic text-5xl text-white/20 leading-none skew-x-[5deg]">0</p>
                                        <p className="font-mono text-[10px] font-bold text-white/40 mt-3 uppercase tracking-[0.2em] skew-x-[5deg]">Flatlines</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* SYSTEM LOG */}
                            <motion.div variants={slamUp} className="bg-[#0A0A0A] p-10 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/5" style={{ clipPath: "polygon(30px 0, 100% 0, 100% 100%, 0 100%, 0 30px)" }}>
                                <div className="absolute top-0 right-0 w-48 h-48 bg-[#00FFFF]/5 rounded-full blur-[50px]"></div>
                                <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-[#00FFFF] to-transparent"></div>

                                <h3 className="text-sm font-mono font-bold uppercase mb-8 tracking-[0.2em] flex items-center gap-3 text-white">
                                    <span className="w-2 h-2 bg-[#00FFFF] shadow-[0_0_10px_#00FFFF] animate-pulse"></span>
                                    TERMINAL_LOG.DAT
                                </h3>

                                <div className="space-y-6 font-mono text-[11px] tracking-widest uppercase">
                                    <div className="flex gap-6 items-start border-b border-white/5 pb-5 hover:bg-white/[0.02] transition-colors p-2 -mx-2 rounded">
                                        <span className="text-[#00FFFF] shrink-0 opacity-70">14:22:01</span>
                                        <p className="text-white/80 leading-relaxed"><span className="text-[#FF003C] font-bold bg-[#FF003C]/10 px-1">[SUCCESS]</span> Firewall bypassed in 0.4s (Tokyo Node). Payload injected.</p>
                                    </div>
                                    <div className="flex gap-6 items-start border-b border-white/5 pb-5 hover:bg-white/[0.02] transition-colors p-2 -mx-2 rounded">
                                        <span className="text-[#00FFFF] shrink-0 opacity-70">13:45:33</span>
                                        <p className="text-white/80 leading-relaxed"><span className="text-[#00FFFF] font-bold bg-[#00FFFF]/10 px-1">[UPDATE]</span> Operative level increased to 42. Skill points allocated.</p>
                                    </div>
                                    <div className="flex gap-6 items-start border-b border-white/5 pb-5 hover:bg-white/[0.02] transition-colors p-2 -mx-2 rounded">
                                        <span className="text-white/30 shrink-0">12:10:14</span>
                                        <p className="text-white/40 leading-relaxed"><span className="text-white/30">[LOGIN]</span> Terminal access granted from external IP 192.168.X.1</p>
                                    </div>
                                    <div className="flex gap-6 items-start hover:bg-white/[0.02] transition-colors p-2 -mx-2 rounded">
                                        <span className="text-[#FF003C] shrink-0 animate-pulse">09:30:00</span>
                                        <p className="text-[#FF003C] leading-relaxed"><span className="font-bold bg-[#FF003C]/20 px-1">[CRITICAL]</span> Unauthorized breach detected in Sector 7 Training Deck.</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* ==========================================
                FLOATING HUD COMPONENT (Bottom Right)
                ========================================== */}
            <div className="fixed bottom-12 right-12 flex items-end gap-6 z-50 pointer-events-none">
                <div
                    className="bg-[#050505]/95 px-8 py-6 backdrop-blur-xl hidden lg:block shadow-[0_0_50px_rgba(255,0,60,0.15)] border border-[#FF003C]/30"
                    style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}
                >
                    <div className="absolute right-0 top-0 w-1.5 h-full bg-[#FF003C] shadow-[0_0_15px_#FF003C]"></div>
                    <p className="font-mono text-[10px] font-bold text-[#FF003C] uppercase tracking-[0.3em] mb-2">Imminent Unlock</p>
                    <p className="text-3xl font-black italic text-white uppercase tracking-tighter">1,800 XP</p>
                </div>

                {/* Action FAB */}
                <button className="w-20 h-20 bg-[#FF003C] shadow-[0_0_50px_rgba(255,0,60,0.6)] flex items-center justify-center pointer-events-auto hover:bg-white hover:text-black hover:scale-110 transition-all skew-x-[-12deg]">
                    <span className="material-symbols-outlined text-4xl skew-x-[12deg]">bolt</span>
                </button>
            </div>
        </div>
    );
}