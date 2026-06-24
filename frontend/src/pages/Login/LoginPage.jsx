import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginUser, forgotPasswordRequest } from '../../services/authService';
import { motion } from 'framer-motion';

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
    hidden: { opacity: 0, x: -80, skewX: "10deg" },
    show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 900, damping: 20 } }
  };

  const slamRight = {
    hidden: { opacity: 0, x: 80, skewX: "-10deg" },
    show: { opacity: 1, x: 0, skewX: "0deg", transition: { type: "spring", stiffness: 900, damping: 20 } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative font-sans selection:bg-[#00FFFF] selection:text-black">

      {/* ==========================================
          THE BACKGROUND: The Void & Tactical Grid
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Subtle tactical grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        {/* Deep vignette */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#050505] via-transparent to-[#050505]"></div>
      </div>

      {/* ==========================================
          THE REVEAL (The Jaw Tear)
          ========================================== */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: "-100%" }}
        transition={{ duration: 0.4, ease: p5Ease, delay: 0.1 }}
        className="fixed inset-x-0 top-0 h-[50vh] bg-[#0A0A0A] z-[100] pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.9)]"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 85%)" }}
      />
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: "100%" }}
        transition={{ duration: 0.4, ease: p5Ease, delay: 0.1 }}
        className="fixed inset-x-0 bottom-0 h-[50vh] bg-[#FF003C] z-[100] pointer-events-none shadow-[0_-10px_40px_rgba(255,0,60,0.4)]"
        style={{ clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 100%)" }}
      />
      <motion.div
        initial={{ scaleY: 1, opacity: 1 }}
        animate={{ scaleY: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
        className="fixed inset-x-0 top-[45vh] h-4 bg-[#00FFFF] z-[101] pointer-events-none origin-center transform -skew-y-[4deg]"
      />

      {/* ========== FORGOT PASSWORD MODAL ========== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#050505]/95" onClick={closeForgotModal} />
          <motion.div
            initial={{ opacity: 0, scale: 1.1, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotate: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative w-full max-w-md bg-[#0D0D0D] p-10 z-10 shadow-[0_0_60px_rgba(255,0,60,0.15)]"
            // Slashed Top-Right and Bottom-Left
            style={{ clipPath: "polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))" }}
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF003C] to-[#500013]"></div>

            <button onClick={closeForgotModal} className="absolute top-6 right-6 text-white/40 hover:text-[#FF003C] transition-colors">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>

            <h2 className="font-black italic text-3xl text-[#FF003C] tracking-tighter uppercase mb-2">CREDENTIAL RECOVERY</h2>
            <p className="text-xs font-mono tracking-[0.2em] text-white/40 uppercase mb-10">Enter operative ID for temporary access</p>

            {forgotStatus === 'success' ? (
              <div className="flex flex-col items-center gap-8 py-6">
                <div className="w-20 h-20 bg-[#00FFFF]/10 border border-[#00FFFF]/30 flex items-center justify-center rotate-45">
                  <span className="material-symbols-outlined text-[#00FFFF] text-4xl -rotate-45">done_all</span>
                </div>
                <div className="text-center">
                  <p className="font-black italic text-white text-2xl uppercase tracking-tight">TRANSMISSION SENT</p>
                  <p className="text-xs font-mono text-white/40 tracking-[0.1em] mt-3 uppercase">Code expires in 01:00:00</p>
                </div>
                <button onClick={closeForgotModal} className="w-full bg-white text-black font-black italic text-lg py-4 uppercase tracking-tighter hover:bg-[#00FFFF] transition-colors skew-x-[-10deg]">
                  <span className="block skew-x-[10deg]">RETURN TO LOGIN</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-8">
                {forgotStatus === 'error' && (
                  <div className="flex items-center gap-4 bg-[#FF003C]/10 border-l-4 border-[#FF003C] px-4 py-3">
                    <span className="material-symbols-outlined text-[#FF003C]">warning</span>
                    <p className="text-xs font-mono tracking-widest text-[#FF003C] uppercase">Link severed. Retry.</p>
                  </div>
                )}
                <div className="space-y-3 group/input">
                  <label className="block font-mono font-bold text-xs tracking-[0.2em] text-[#00FFFF] opacity-60 group-focus-within/input:opacity-100 transition-opacity uppercase">Operative Email</label>
                  <input className="w-full bg-transparent border-0 border-b-2 border-white/15 py-3 px-0 text-xl font-bold focus:ring-0 focus:border-[#00FFFF] placeholder:text-white/10 transition-colors text-white tracking-wider outline-none" placeholder="agent@domain.com" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required autoFocus />
                </div>
                <button type="submit" disabled={forgotLoading} className="w-full relative bg-[#FF003C] hover:bg-[#D10031] disabled:opacity-50 text-white font-black italic text-xl py-5 px-8 flex items-center justify-between transition-all hover:translate-x-1 skew-x-[-10deg] group/btn">
                  <span className="block skew-x-[10deg] uppercase tracking-tighter">{forgotLoading ? 'TRANSMITTING...' : 'SEND ACCESS CODE'}</span>
                  <span className="material-symbols-outlined skew-x-[10deg]">{forgotLoading ? 'sync' : 'cell_tower'}</span>
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
      {/* ========== END MODAL ========== */}

      {/* Restricted Watermark */}
      <div className="fixed top-8 left-8 z-10 pointer-events-none opacity-[0.03]">
        <div className="font-black text-8xl tracking-tighter border-4 border-white px-8 py-4 rotate-[-5deg]">
          RESTRICTED AREA
        </div>
      </div>

      <main className="relative z-20 min-h-screen flex items-center justify-center p-6 flex-col">

        {/* ==========================================
            THE STAMP (Calling Card Drop)
            ========================================== */}
        <motion.div
          initial={{ opacity: 0, scale: 1.5, rotate: -5, filter: "brightness(2) blur(10px)" }}
          animate={{ opacity: 1, scale: 1, rotate: 0, filter: "brightness(1) blur(0px)" }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
          className="w-full max-w-[480px] relative"
        >
          {/* Breaking the Box: Overlapping Title */}
          <div className="relative z-30 ml-4 mb-[-24px] transform rotate-[-2deg] pointer-events-none">
            <h1 className="font-black italic text-6xl md:text-7xl text-white tracking-tighter drop-shadow-[4px_4px_0px_#FF003C]">
              PHANTOM
              <br />
              PROTOCOL
            </h1>
            <div className="inline-flex items-center gap-2 mt-2 bg-[#00FFFF] text-black px-3 py-1 font-mono text-[10px] font-bold tracking-[0.2em] uppercase shadow-[4px_4px_0px_#FF003C]">
              <span className="material-symbols-outlined text-sm">wifi_tethering</span>
              SYSTEM_LINK_ACTIVE
            </div>
          </div>

          {/* Tonal Stacking Card - No borders, just glow and cut corners */}
          <div
            className="bg-[#0D0D0D]/95 backdrop-blur-xl p-10 md:p-14 shadow-[0_0_60px_rgba(255,0,60,0.08)] relative z-20"
            style={{ clipPath: "polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 40px 100%, 0 calc(100% - 40px))" }}
          >
            {/* Inner accent slashes for depth */}
            <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-l from-[#FF003C] to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-32 h-1 bg-gradient-to-r from-[#00FFFF] to-transparent"></div>

            <motion.form
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-10 pt-6"
              onSubmit={handleSubmit}
            >
              {error && (
                <motion.div variants={slamLeft} className="flex items-center gap-4 bg-[#FF003C]/10 border-l-4 border-[#FF003C] px-5 py-4">
                  <span className="material-symbols-outlined text-[#FF003C]">gpp_bad</span>
                  <p className="font-mono text-xs tracking-[0.1em] text-[#FF003C] uppercase">{error}</p>
                </motion.div>
              )}

              <motion.div variants={slamRight} className="space-y-2 group/input relative">
                <label className="block font-mono font-bold text-[10px] tracking-[0.25em] text-[#00FFFF] opacity-50 group-focus-within/input:opacity-100 transition-opacity uppercase">OPERATIVE_EMAIL</label>
                <input className="w-full bg-transparent border-0 border-b-2 border-white/10 py-3 px-0 text-xl font-bold focus:ring-0 focus:border-[#00FFFF] placeholder:text-white/10 transition-colors tracking-wider outline-none" placeholder="agent@domain.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </motion.div>

              <motion.div variants={slamLeft} className="space-y-2 group/input relative">
                <label className="block font-mono font-bold text-[10px] tracking-[0.25em] text-[#00FFFF] opacity-50 group-focus-within/input:opacity-100 transition-opacity uppercase">ACCESS_KEY</label>
                <input className="w-full bg-transparent border-0 border-b-2 border-white/10 py-3 px-0 text-xl font-bold focus:ring-0 focus:border-[#00FFFF] placeholder:text-white/10 transition-colors outline-none" placeholder="••••••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </motion.div>

              <motion.div variants={slamRight} className="pt-6 space-y-6">

                {/* Primary Button: Parallelogram, red, shivering hover */}
                <button className="w-full bg-[#FF003C] hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-2xl py-6 px-8 flex items-center justify-between group/btn transition-all hover:translate-x-[4px] skew-x-[-12deg] shadow-[8px_8px_0px_rgba(0,0,0,0.5)]" type="submit" disabled={loading}>
                  <span className="block skew-x-[12deg] uppercase tracking-tighter italic">
                    {loading ? 'AUTHENTICATING...' : 'INITIATE ACCESS'}
                  </span>
                  <span className="block skew-x-[12deg] material-symbols-outlined transform group-hover/btn:translate-x-2 transition-transform text-3xl">
                    {loading ? 'rotate_right' : 'arrow_forward'}
                  </span>
                </button>

                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-white/10"></div>
                  <span className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Alternative_Vector</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-white/10"></div>
                </div>

                {/* Secondary Button: Ghost border, Electric Cyan hover */}
                <button type="button" onClick={handleGoogleLogin} className="w-full bg-transparent border border-white/15 hover:border-[#00FFFF] hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:text-[#00FFFF] text-white font-mono font-bold text-xs py-4 px-8 flex items-center justify-center gap-4 transition-all tracking-[0.2em] uppercase">
                  <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Bypass via Google
                </button>
              </motion.div>

              {/* Tactical Metadata & Links */}
              <motion.div variants={slamLeft} className="flex flex-col gap-5 pt-6 mt-6 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => setShowForgotModal(true)} className="font-mono text-[10px] tracking-[0.1em] text-white/40 hover:text-[#00FFFF] transition-colors flex items-center gap-2 group/link">
                    <span className="w-1.5 h-1.5 bg-white/20 group-hover/link:bg-[#00FFFF] transition-colors"></span>
                    Lost Signal?
                  </button>
                  <Link to="/register" className="font-mono text-[10px] tracking-[0.1em] text-white/40 hover:text-white transition-colors flex items-center gap-2 group/link">
                    No clearance? <span className="text-[#FF003C] group-hover/link:text-[#FF003C]/80 ml-1 font-bold">Request Access</span>
                  </Link>
                </div>
              </motion.div>
            </motion.form>
          </div>
        </motion.div>
      </main>

      {/* Persistent HUD Elements */}
      <div className="fixed bottom-6 right-8 z-30 font-mono text-[10px] text-[#00FFFF]/40 space-y-1.5 text-right pointer-events-none tracking-widest">
        <p>SYS.VER // 9.0.4</p>
        <p>LATENCY // 14MS</p>
        <p>SESSION_ID // 98X-KINETIC-77</p>
      </div>

      <div className="fixed bottom-6 left-8 z-30 font-mono text-[10px] text-[#FF003C] space-y-1.5 pointer-events-none tracking-widest">
        <p className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 bg-[#FF003C] shadow-[0_0_8px_#FF003C] animate-pulse"></span>
          UPLINK_SECURE
        </p>
      </div>
    </div>
  );
}