import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginUser, forgotPasswordRequest } from '../../services/authService';
import { motion } from 'framer-motion';
import './Login.css';

export default function PhantomLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  // The signature P5 snapping ease curve
  const p5Ease = [0.85, 0, 0.15, 1];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      login(data.data.user, data.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`;
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotStatus('');
    try {
      await forgotPasswordRequest(forgotEmail);
      setForgotStatus('success');
    } catch {
      setForgotStatus('error');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotStatus('');
  };

  // --- Animation Variants ---
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const slamLeft = {
    hidden: { opacity: 0, x: -80, skewX: "20deg" },
    show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 900, damping: 20 } }
  };

  const slamRight = {
    hidden: { opacity: 0, x: 80, skewX: "-20deg" },
    show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 900, damping: 20 } }
  };

  return (
    <div className="phantom-wrapper font-body selection:bg-primary-container selection:text-white overflow-hidden relative">

      {/* ==========================================
          THE REVEAL (The Jaw Tear)
          Violently rips the screen open
          ========================================== */}

      {/* Top Black Jaw */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: "-100%" }}
        exit={{ y: 0 }}
        transition={{ duration: 0.3, ease: p5Ease, delay: 0.1 }}
        className="fixed inset-x-0 top-0 h-[60vh] bg-[#050505] z-[100] pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 80%)" }}
      />
      {/* Bottom Red Jaw */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: "100%" }}
        exit={{ y: 0 }}
        transition={{ duration: 0.3, ease: p5Ease, delay: 0.1 }}
        className="fixed inset-x-0 bottom-0 h-[60vh] bg-[#FF003C] z-[100] pointer-events-none shadow-[0_-10px_30px_rgba(255,0,60,0.5)]"
        style={{ clipPath: "polygon(0 20%, 100% 0, 100% 100%, 0 100%)" }}
      />
      {/* White Flash Stroke */}
      <motion.div
        initial={{ scaleY: 1, opacity: 1 }}
        animate={{ scaleY: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
        className="fixed inset-x-0 top-[45vh] h-8 bg-white z-[101] pointer-events-none origin-center transform -skew-y-[6deg]"
      />

      {/* ========== FORGOT PASSWORD MODAL ========== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeForgotModal} />
          <motion.div
            initial={{ opacity: 0, scale: 1.2, rotate: 10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md bg-[#0A0A0A] border border-[#FF003C]/50 shadow-[0_0_60px_rgba(255,0,60,0.2)] p-8 z-10"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-[#FF003C] shadow-[0_0_15px_#FF003C]"></div>
            <button onClick={closeForgotModal} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="font-headline font-black italic text-2xl text-[#FF003C] tracking-tighter uppercase mb-2">CREDENTIAL RECOVERY</h2>
            <p className="font-label text-xs tracking-widest text-white/40 uppercase mb-8">Enter your operative email to receive a temporary access code</p>

            {forgotStatus === 'success' ? (
              <div className="flex flex-col items-center gap-6 py-4">
                <div className="w-16 h-16 bg-[#00FF00]/10 border-2 border-[#00FF00] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#00FF00] text-3xl">check</span>
                </div>
                <div className="text-center">
                  <p className="font-headline font-black italic text-white text-xl uppercase tracking-tight">TRANSMISSION SENT</p>
                  <p className="font-label text-xs text-white/40 tracking-widest mt-2 uppercase">Check your email for the temporary access code. It expires in 1 hour.</p>
                </div>
                <button onClick={closeForgotModal} className="w-full bg-[#FF003C] text-white font-headline font-black italic py-3 uppercase tracking-tighter hover:bg-[#D10031] transition-colors">
                  RETURN TO LOGIN
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-6">
                {forgotStatus === 'error' && (
                  <div className="flex items-center gap-3 border border-[#FF003C]/50 bg-[#FF003C]/10 px-4 py-3">
                    <span className="material-symbols-outlined text-[#FF003C] text-sm">error</span>
                    <p className="font-label text-xs tracking-widest text-[#FF003C] uppercase">Transmission failed. Try again.</p>
                  </div>
                )}
                <div className="space-y-2 group/input">
                  <label className="block font-label font-bold text-xs tracking-[0.2em] text-[#00FFFF] opacity-70 group-focus-within/input:opacity-100 transition-opacity uppercase">Operative Email</label>
                  <input className="w-full bg-transparent border-0 border-b-2 border-white/20 py-3 px-0 text-lg font-headline focus:ring-0 focus:border-[#FF003C] placeholder:text-white/10 transition-all text-white tracking-widest" placeholder="agent@domain.com" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required autoFocus />
                </div>
                <button type="submit" disabled={forgotLoading} className="w-full bg-[#FF003C] hover:bg-[#D10031] disabled:opacity-50 disabled:cursor-not-allowed text-white font-headline font-black italic text-lg py-4 flex items-center justify-between px-6 transition-all uppercase tracking-tighter">
                  <span>{forgotLoading ? 'TRANSMITTING...' : 'SEND ACCESS CODE'}</span>
                  <span className="material-symbols-outlined">{forgotLoading ? 'progress_activity' : 'send'}</span>
                </button>
                <p className="font-label text-[10px] text-white/20 uppercase tracking-widest text-center">Code expires in 1 hour — change password after login</p>
              </form>
            )}
          </motion.div>
        </div>
      )}
      {/* ========== END MODAL ========== */}

      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img className="w-full h-full object-cover filter blur-lg brightness-[0.2] contrast-125 scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCEy2zIVPPR22mzl5y53pxk4frkkFDpTNDPpdCXVLTonBTxgroGHtxQ9o7X9Uc3HZFfnDjdIIgHS9_D9wj54UUNhiX1HDusTpnshZHe_c4etSWfM-qe_ABQUohuHKqvmzWQFiSy6SOQXPmWcFCvHvUXKVa6_7VvAIBq8E00P0kCu5rVkCh8LeOamASFilKg69IkUSZvlYmfkuDD9Dp7p7SToGWacUPLKcFzpI4izRFDxgFDPUpyIJCb5FoBjPLjZCMBEQRBGS2wBcx" alt="SOC Background" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent"></div>
        <div className="absolute inset-0 bg-[#FF003C]/5 mix-blend-overlay"></div>
      </div>

      {/* Restricted Watermark */}
      <div className="fixed top-12 left-12 z-10 pointer-events-none opacity-20">
        <div className="font-headline font-black text-6xl tracking-tighter text-outline-variant border-2 border-outline-variant px-6 py-2 rotate-[-12deg]">
          RESTRICTED AREA
        </div>
      </div>

      <main className="relative z-20 min-h-screen flex items-center justify-center p-6">

        {/* ==========================================
            THE STAMP (Calling Card Drop)
            Starts huge, rotates, and slams into position
            ========================================== */}
        <motion.div
          initial={{ opacity: 0, scale: 2.5, rotate: -15, filter: "brightness(2) blur(10px)" }}
          animate={{ opacity: 1, scale: 1, rotate: -2, filter: "brightness(1) blur(0px)" }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.05 }}
          className="w-full max-w-md transition-all duration-500"
        >
          {/* Branding */}
          <div className="mb-12 flex flex-col items-start transform skew-x-[2deg]">
            <h1 className="font-headline font-black italic text-5xl md:text-6xl text-[#FF003C] tracking-tighter drop-shadow-[0_0_15px_rgba(255,0,60,0.5)]">
              PHANTOM PROTOCOL
            </h1>
            <div className="flex items-center gap-3 mt-2 bg-[#FF003C] text-white px-3 py-1 font-label text-xs font-bold tracking-widest uppercase shadow-[5px_5px_0px_#050505]">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              SYSTEM_LINK_ACTIVE
            </div>
          </div>

          {/* Card */}
          <div className="slashed-card bg-[#0D0D0D]/90 backdrop-blur-2xl border border-[#FF003C]/30 p-8 md:p-12 shadow-[20px_20px_0px_rgba(5,5,5,0.9)] relative">
            <div className="absolute top-0 left-0 w-8 h-8 bg-[#FF003C]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
            <div className="absolute bottom-0 right-0 w-12 h-12 bg-white" style={{ clipPath: "polygon(100% 100%, 100% 0, 0 100%)" }} />

            <motion.form
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-8 transform skew-x-[2deg]"
              onSubmit={handleSubmit}
            >
              {error && (
                <motion.div variants={slamLeft} className="flex items-center gap-3 border border-[#FF003C]/50 bg-[#FF003C]/10 px-4 py-3">
                  <span className="material-symbols-outlined text-[#FF003C] text-sm">error</span>
                  <p className="font-label text-xs tracking-widest text-[#FF003C] uppercase">{error}</p>
                </motion.div>
              )}

              <motion.div variants={slamRight} className="space-y-2 group/input">
                <label className="block font-label font-bold text-sm tracking-[0.2em] text-[#00FFFF] opacity-70 group-focus-within/input:opacity-100 transition-opacity">OPERATIVE_EMAIL</label>
                <div className="relative">
                  <input className="w-full bg-transparent border-0 border-b-2 border-outline-variant py-4 px-0 text-xl font-headline focus:ring-0 focus:border-[#FF003C] placeholder:text-white/10 transition-all tracking-widest" placeholder="agent@domain.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  <div className="absolute right-0 bottom-4 opacity-30"><span className="material-symbols-outlined">person_filled</span></div>
                </div>
              </motion.div>

              <motion.div variants={slamLeft} className="space-y-2 group/input">
                <label className="block font-label font-bold text-sm tracking-[0.2em] text-[#00FFFF] opacity-70 group-focus-within/input:opacity-100 transition-opacity">ACCESS_KEY</label>
                <div className="relative">
                  <input className="w-full bg-transparent border-0 border-b-2 border-outline-variant py-4 px-0 text-xl font-headline focus:ring-0 focus:border-[#FF003C] placeholder:text-white/10 transition-all" placeholder="••••••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  <div className="absolute right-0 bottom-4 opacity-30"><span className="material-symbols-outlined">vpn_key</span></div>
                </div>
              </motion.div>

              <motion.div variants={slamRight} className="pt-6 space-y-4">
                <button className="w-full bg-[#FF003C] hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-headline font-black text-xl py-6 px-8 flex items-center justify-between group/btn transition-all shiver-effect shadow-[10px_10px_0px_#050505]" type="submit" disabled={loading}>
                  <span className="uppercase tracking-tighter">{loading ? 'AUTHENTICATING...' : 'INITIATE ACCESS'}</span>
                  {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined transform group-hover/btn:translate-x-2 transition-transform">arrow_forward_ios</span>}
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-white/10"></div>
                  <span className="font-label text-[10px] tracking-widest text-white/30 uppercase">or</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-white/10"></div>
                </div>

                <button type="button" onClick={handleGoogleLogin} className="w-full bg-[#1A1A1A] border-2 border-white/10 hover:border-white hover:bg-white/10 text-white font-label font-bold text-sm py-4 px-8 flex items-center justify-center gap-3 transition-all tracking-widest uppercase">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
              </motion.div>

              <motion.div variants={slamLeft} className="flex flex-col gap-4 pt-4">
                <button type="button" onClick={() => setShowForgotModal(true)} className="font-label text-xs tracking-widest text-[#00FFFF]/50 hover:text-[#00FFFF] transition-colors flex items-center gap-2 group/link text-left">
                  <span className="w-2 h-2 bg-[#00FFFF]/20 group-hover/link:bg-[#00FFFF] transition-colors"></span>
                  Forgotten credentials?
                </button>
                <div className="h-[1px] w-full bg-gradient-to-r from-white/10 to-transparent"></div>
                <Link to="/register" className="font-label text-xs tracking-widest text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 group/link">
                  <span className="w-2 h-2 bg-white/10 group-hover/link:bg-white/60 transition-colors"></span>
                  No account? <span className="text-[#FF003C] hover:text-[#FF003C]/70 ml-1 font-bold">Request Clearance →</span>
                </Link>
                <div className="h-[1px] w-full bg-gradient-to-r from-white/10 to-transparent"></div>
                <p className="font-label text-[10px] text-white/30 uppercase tracking-[0.3em]">
                  Connection status: <span className="text-[#00FF00]">ENCRYPTED</span>
                </p>
              </motion.div>
            </motion.form>
          </div>
        </motion.div>
      </main>

      <div className="fixed bottom-8 right-8 z-30 font-label text-[10px] text-[#00FFFF]/40 space-y-1 text-right pointer-events-none">
        <p>IP_ORIGIN: 192.168.1.104</p>
        <p>LATENCY: 14MS</p>
        <p>SESSION_ID: 98X-KINETIC-77</p>
      </div>
      <div className="fixed bottom-8 left-8 z-30 font-label text-[10px] text-[#FF003C]/60 space-y-1 pointer-events-none">
        <p className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 bg-[#FF003C] animate-pulse"></span>
          MONITORING_ACTIVE
        </p>
      </div>
    </div>
  );
}