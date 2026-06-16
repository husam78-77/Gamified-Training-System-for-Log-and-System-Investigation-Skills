import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

export default function OperativeProfile() {
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [overrideStatus, setOverrideStatus] = useState({ type: '', message: '' });
    const [isUpdating, setIsUpdating] = useState(false);

    const { user, token } = useAuth();
    const [profile, setProfile] = useState({
        username: 'LOADING...',
        email: 'AWAITING_SIGNAL...',
        role: 'student',
        level: 0,
        totalScore: 0,
        badgeCount: 0,
        accountAgeDays: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Failed to fetch profile data');

                const freshData = result.data || result;
                setProfile({
                    username: freshData.username || 'UNKNOWN_ENTITY',
                    email: freshData.email || 'unreachable@node.io',
                    role: freshData.role || 'student',
                    level: freshData.level || 1,
                    totalScore: freshData.totalScore || 0,
                    badgeCount: freshData.badgeCount || 0,
                    accountAgeDays: freshData.accountAgeDays || 1
                });
            } catch (error) {
                console.error("Failed to decrypt profile data", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchProfileData();
    }, [token]);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setOverrideStatus({ type: '', message: '' });

        if (passwordData.new !== passwordData.confirm) {
            return setOverrideStatus({ type: 'error', message: 'PAYLOAD_MISMATCH: Keys do not align.' });
        }

        setIsUpdating(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordData.current,
                    newPassword: passwordData.new,
                    confirmPassword: passwordData.confirm
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Override Failed');

            setOverrideStatus({ type: 'success', message: 'CREDENTIALS_UPDATED_SUCCESSFULLY' });
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (err) {
            setOverrideStatus({ type: 'error', message: err.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const getCyberpunkRole = (role) => {
        const roles = { 'student': 'PHANTOM_INITIATE', 'admin': 'SYSTEM_ARCHITECT' };
        return roles[role?.toLowerCase()] || 'ROGUE_OPERATIVE';
    };

    // --- Kinetic Animation Variants ---
    const staggerContainer = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
    };

    const slamUp = {
        hidden: { opacity: 0, y: 50, skewX: "10deg" },
        show: { opacity: 1, y: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
    };

    const slamLeft = {
        hidden: { opacity: 0, x: -60, skewX: "5deg" },
        show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 350, damping: 25 } }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#FF003C] selection:text-white relative flex flex-col">

            {/* ==========================================
                THE VOID: Background & Grids
                ========================================== */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:8rem_8rem]"></div>
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#FF003C]/5 blur-[120px] rounded-full mix-blend-screen"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] opacity-90"></div>
            </div>

            {/* Background Typography Watermark */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none opacity-[0.02] select-none">
                <h1 className="font-black italic text-[20vw] leading-none tracking-tighter whitespace-nowrap">DOSSIER</h1>
            </div>



            {/* ==========================================
                MAIN CANVAS
                ========================================== */}
            <main className="relative z-20 flex-1 w-full max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-32">
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-12">

                    {/* --- SECTION 1: OPERATIVE IDENTITY --- */}
                    <motion.section variants={slamUp} className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
                        <div className="lg:col-span-7 space-y-8 z-20">
                            <div className="inline-block bg-white px-4 py-1.5 skew-x-[-10deg] shadow-[4px_4px_0px_#FF003C]">
                                <span className="font-mono font-bold text-black tracking-[0.3em] text-[10px] uppercase skew-x-[10deg] block">
                                    SUBJECT_FILE: {loading ? 'DECRYPTING...' : 'VERIFIED'}
                                </span>
                            </div>

                            <h1 className="font-black text-4xl sm:text-7xl md:text-8xl lg:text-[7rem] italic text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tighter leading-none skew-x-[-8deg] uppercase drop-shadow-[4px_4px_0px_rgba(255,0,60,0.5)]">
                                {profile.username}
                            </h1>

                            <div className="flex flex-col md:flex-row gap-8 font-mono">
                                <div className="border-l-4 border-[#00FFFF] pl-5 bg-gradient-to-r from-[#00FFFF]/5 to-transparent py-2">
                                    <div className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">Digital Role</div>
                                    <div className="text-[#00FFFF] font-bold text-xl uppercase tracking-widest">
                                        {getCyberpunkRole(profile.role)}
                                    </div>
                                </div>
                                <div className="border-l-4 border-[#FF003C] pl-5 bg-gradient-to-r from-[#FF003C]/5 to-transparent py-2">
                                    <div className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">Direct Comms</div>
                                    <div className="text-white font-bold text-xl uppercase tracking-widest">
                                        {profile.email}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Silhouette Identity Card */}
                        <div className="lg:col-span-5 relative z-10">
                            {/* Decorative framing */}
                            <div className="absolute -top-6 -left-6 w-32 h-32 border-t-4 border-l-4 border-[#FF003C] opacity-50"></div>

                            <div
                                className="bg-[#0A0A0A] h-[350px] md:h-[450px] w-full relative overflow-hidden shadow-[20px_20px_0px_#050505] border border-white/5"
                                style={{ clipPath: "polygon(0 0, calc(100% - 50px) 0, 100% 50px, 100% 100%, 50px 100%, 0 calc(100% - 50px))" }}
                            >
                                <img
                                    alt="Agent Silhouette"
                                    className="w-full h-full object-cover mix-blend-luminosity opacity-60 grayscale contrast-125"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGlcYn76Rg0JxHo99uJ38ywe0PeVJOl1s-gVPfloNDELxK2UoShf7lYiPRLRdD8FFMTrlUrTAhpj9p704LWh8YPlVnlOM--ueVqpTafeeFKAxPNE5MAo8RRRfvt8UvqLFzLn_aqNVLGdGIlrzQWVCGkHkWLNpEOUEV5VfGAeNhC8h_Cle9aroAq5XfPYBvVXM9TOGhnGXSJcCKywQ5uD9q9fJSyukCsvLFhQR6cX1evU2sP73zGgcvbtHw3wKgEqk3yLqJ2l16pAfM"
                                />
                                <div className="absolute inset-0 bg-[#FF003C]/10 mix-blend-overlay"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>

                                <div className="absolute bottom-8 right-8 text-right flex flex-col items-end">
                                    <div className="bg-[#FF003C] px-6 py-2 skew-x-[-10deg] shadow-[4px_4px_0px_black] mb-2">
                                        <div className="font-black italic text-black text-4xl tracking-tighter skew-x-[10deg]">
                                            LVL_{profile.level}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-[#00FFFF] font-mono tracking-[0.3em] uppercase bg-black/50 px-3 py-1">
                                        Bio-Metric Verified
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* --- DOSSIER METADATA TAPE --- */}
                    <motion.section variants={slamUp} className="w-full relative">
                        <div className="w-full h-1 bg-[#FF003C] mb-8"></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 font-mono">
                            <div className="bg-[#0A0A0A] p-6 border border-white/5 relative overflow-hidden group">
                                <div className="absolute left-0 top-0 w-1 h-full bg-[#00FFFF]"></div>
                                <div className="text-white/40 text-[9px] tracking-[0.2em] uppercase mb-3 group-hover:text-[#00FFFF] transition-colors">Active_Duty_Days</div>
                                <div className="text-white text-4xl font-black italic tracking-tighter">{profile.accountAgeDays}</div>
                            </div>
                            <div className="bg-[#0A0A0A] p-6 border border-white/5 relative overflow-hidden group">
                                <div className="absolute left-0 top-0 w-1 h-full bg-[#FF003C]"></div>
                                <div className="text-white/40 text-[9px] tracking-[0.2em] uppercase mb-3 group-hover:text-[#FF003C] transition-colors">Total_Breach_Score</div>
                                <div className="text-white text-4xl font-black italic tracking-tighter">{profile.totalScore.toLocaleString()}</div>
                            </div>
                            <div className="bg-[#0A0A0A] p-6 border border-white/5 relative overflow-hidden group">
                                <div className="absolute left-0 top-0 w-1 h-full bg-white/50"></div>
                                <div className="text-white/40 text-[9px] tracking-[0.2em] uppercase mb-3 group-hover:text-white transition-colors">Acquired_Badges</div>
                                <div className="text-white text-4xl font-black italic tracking-tighter">{profile.badgeCount}</div>
                            </div>
                            <div className="bg-[#0A0A0A] p-6 border border-white/5 relative overflow-hidden flex items-center justify-center">
                                <span className="text-[#00FFFF] text-xs tracking-[0.3em] uppercase font-bold animate-pulse">STATUS: ONLINE</span>
                            </div>
                        </div>
                    </motion.section>

                    {/* --- SECTION 2: OVERRIDE & STATUS GRID --- */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 mt-4">

                        {/* SECURITY OVERRIDE */}
                        <motion.div variants={slamLeft} className="xl:col-span-7 bg-[#0D0D0D] p-10 md:p-14 relative overflow-hidden shadow-[15px_15px_0px_rgba(255,0,60,0.1)] border border-[#FF003C]/20" style={{ clipPath: "polygon(40px 0, 100% 0, 100% 100%, 0 100%, 0 40px)" }}>
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                <span className="material-symbols-outlined text-[10rem]">vpn_key</span>
                            </div>

                            <div className="flex items-center gap-4 mb-10">
                                <span className="material-symbols-outlined text-[#FF003C] text-4xl">lock_reset</span>
                                <h2 className="font-black text-4xl italic text-white uppercase tracking-tighter skew-x-[-8deg]">
                                    Security_Override
                                </h2>
                            </div>

                            <form className="space-y-8 max-w-xl relative z-10" onSubmit={handlePasswordChange}>
                                {overrideStatus.message && (
                                    <div className={`flex items-center gap-4 border-l-4 px-5 py-4 ${overrideStatus.type === 'error' ? 'border-[#FF003C] bg-[#FF003C]/10' : 'border-[#00FFFF] bg-[#00FFFF]/10'}`}>
                                        <span className={`material-symbols-outlined ${overrideStatus.type === 'error' ? 'text-[#FF003C]' : 'text-[#00FFFF]'}`}>
                                            {overrideStatus.type === 'error' ? 'gpp_bad' : 'gpp_good'}
                                        </span>
                                        <p className={`font-mono text-[10px] tracking-[0.2em] uppercase ${overrideStatus.type === 'error' ? 'text-[#FF003C]' : 'text-[#00FFFF]'}`}>
                                            {overrideStatus.message}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-3 group">
                                    <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 group-focus-within:text-[#00FFFF] transition-colors">Current_Access_Token</label>
                                    <input
                                        required
                                        value={passwordData.current}
                                        onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                                        className="w-full bg-transparent border-b-2 border-white/10 focus:border-[#00FFFF] text-white font-black tracking-widest text-2xl py-3 outline-none transition-colors placeholder:text-white/10"
                                        placeholder="••••••••••••"
                                        type="password"
                                    />
                                </div>
                                <div className="space-y-3 group">
                                    <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 group-focus-within:text-[#00FFFF] transition-colors">New_Encrypted_Key</label>
                                    <input
                                        required
                                        value={passwordData.new}
                                        onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                                        className="w-full bg-transparent border-b-2 border-white/10 focus:border-[#00FFFF] text-white font-black tracking-widest text-2xl py-3 outline-none transition-colors placeholder:text-white/10"
                                        placeholder="••••••••••••"
                                        type="password"
                                    />
                                </div>
                                <div className="space-y-3 group">
                                    <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 group-focus-within:text-[#00FFFF] transition-colors">Confirm_Payload</label>
                                    <input
                                        required
                                        value={passwordData.confirm}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                        className="w-full bg-transparent border-b-2 border-white/10 focus:border-[#00FFFF] text-white font-black tracking-widest text-2xl py-3 outline-none transition-colors placeholder:text-white/10"
                                        placeholder="••••••••••••"
                                        type="password"
                                    />
                                </div>

                                <div className="pt-6">
                                    <button
                                        disabled={isUpdating}
                                        className="w-full md:w-auto bg-[#FF003C] hover:bg-white text-white hover:text-black disabled:opacity-50 font-black italic text-xl px-12 py-5 skew-x-[-10deg] shadow-[8px_8px_0px_#050505] transition-all flex items-center justify-between gap-6 group/btn"
                                        type="submit"
                                    >
                                        <span className="skew-x-[10deg] tracking-tighter uppercase">{isUpdating ? 'OVERRIDING...' : 'UPDATE_CREDENTIALS'}</span>
                                        <span className="skew-x-[10deg] material-symbols-outlined transform group-hover/btn:translate-x-2 transition-transform">sync_lock</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>

                        {/* SYSTEM STATUS BENTO */}
                        <motion.div variants={slamUp} className="xl:col-span-5 flex flex-col gap-8">
                            <div
                                className="bg-[#0A0A0A] p-10 relative flex-1 border border-white/5 shadow-[0_0_40px_rgba(0,255,255,0.05)]"
                                style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)" }}
                            >
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[#00FFFF] to-transparent"></div>
                                <div className="flex items-center gap-4 text-[#00FFFF] mb-8">
                                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                                    <span className="font-black text-3xl tracking-tighter italic uppercase">SYSTEM_SECURE</span>
                                </div>
                                <ul className="font-mono text-[11px] text-white/50 leading-loose mb-10 tracking-[0.1em]">
                                    <li className="flex justify-between border-b border-white/5 pb-2"><span>FIREWALL</span> <span className="text-white">ACTIVE</span></li>
                                    <li className="flex justify-between border-b border-white/5 pb-2 mt-2"><span>ENCRYPTION</span> <span className="text-[#00FFFF]">AES-256</span></li>
                                    <li className="flex justify-between border-b border-white/5 pb-2 mt-2"><span>LAST_BREACH</span> <span className="text-white">14 DAYS AGO</span></li>
                                    <li className="flex justify-between pb-2 mt-2"><span>THREAT_LEVEL</span> <span className="text-[#00FFFF] animate-pulse">ZERO</span></li>
                                </ul>
                                <div className="w-full h-1 bg-[#050505]">
                                    <div className="h-full bg-[#00FFFF] w-full shadow-[0_0_15px_#00FFFF]"></div>
                                </div>
                            </div>

                            <div
                                className="bg-[#FF003C] p-8 text-black relative flex-1 shadow-[10px_10px_0px_#050505]"
                                style={{ clipPath: "polygon(30px 0, 100% 0, 100% 100%, 0 100%, 0 30px)" }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="material-symbols-outlined text-black">terminal</span>
                                    <h3 className="font-black italic text-2xl tracking-tighter uppercase">TERMINAL_LOGS</h3>
                                </div>
                                <div className="font-mono text-[10px] leading-relaxed font-bold tracking-[0.1em] space-y-2 mix-blend-color-burn opacity-80">
                                    <div> [SYSTEM] - PROFILE_SYNC_ESTABLISHED</div>
                                    <div> [SYSTEM] - STATS_AGGREGATION_COMPLETE</div>
                                    <div className="animate-pulse"> [AWAITING_COMMAND] _</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                </motion.div>
            </main>

        </div>
    );
}