import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginUser, forgotPasswordRequest } from '../../services/authService';
import './Login.css';

export default function PhantomLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 👇 Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState(''); // 'success' | 'error' | ''

  const { login } = useAuth();
  const navigate = useNavigate();

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

  // 👇 Forgot password handler
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

  return (
    <div className="phantom-wrapper font-body selection:bg-primary-container selection:text-white">

      {/* ========== FORGOT PASSWORD MODAL ========== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeForgotModal}
          />

          {/* Modal Box */}
          <div className="relative w-full max-w-md bg-[#0A0A0A] border border-[#FF003C]/50 shadow-[0_0_60px_rgba(255,0,60,0.2)] p-8 z-10">
            {/* Red top accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#FF003C] shadow-[0_0_15px_#FF003C]"></div>

            {/* Close button */}
            <button
              onClick={closeForgotModal}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="font-headline font-black italic text-2xl text-[#FF003C] tracking-tighter uppercase mb-2">
              CREDENTIAL RECOVERY
            </h2>
            <p className="font-label text-xs tracking-widest text-white/40 uppercase mb-8">
              Enter your operative email to receive a temporary access code
            </p>

            {/* Success state */}
            {forgotStatus === 'success' ? (
              <div className="flex flex-col items-center gap-6 py-4">
                <div className="w-16 h-16 bg-[#00FF00]/10 border-2 border-[#00FF00] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#00FF00] text-3xl">check</span>
                </div>
                <div className="text-center">
                  <p className="font-headline font-black italic text-white text-xl uppercase tracking-tight">
                    TRANSMISSION SENT
                  </p>
                  <p className="font-label text-xs text-white/40 tracking-widest mt-2 uppercase">
                    Check your email for the temporary access code.
                    It expires in 1 hour.
                  </p>
                </div>
                <button
                  onClick={closeForgotModal}
                  className="w-full bg-[#FF003C] text-white font-headline font-black italic py-3 uppercase tracking-tighter hover:bg-[#D10031] transition-colors"
                >
                  RETURN TO LOGIN
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-6">
                {forgotStatus === 'error' && (
                  <div className="flex items-center gap-3 border border-[#FF003C]/50 bg-[#FF003C]/10 px-4 py-3">
                    <span className="material-symbols-outlined text-[#FF003C] text-sm">error</span>
                    <p className="font-label text-xs tracking-widest text-[#FF003C] uppercase">
                      Transmission failed. Try again.
                    </p>
                  </div>
                )}

                <div className="space-y-2 group/input">
                  <label className="block font-label font-bold text-xs tracking-[0.2em] text-[#00FFFF] opacity-70 group-focus-within/input:opacity-100 transition-opacity uppercase">
                    Operative Email
                  </label>
                  <input
                    className="w-full bg-transparent border-0 border-b-2 border-white/20 py-3 px-0 text-lg font-headline focus:ring-0 focus:border-[#FF003C] placeholder:text-white/10 transition-all text-white tracking-widest"
                    placeholder="agent@domain.com"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-[#FF003C] hover:bg-[#D10031] disabled:opacity-50 disabled:cursor-not-allowed text-white font-headline font-black italic text-lg py-4 flex items-center justify-between px-6 transition-all uppercase tracking-tighter"
                >
                  <span>{forgotLoading ? 'TRANSMITTING...' : 'SEND ACCESS CODE'}</span>
                  <span className="material-symbols-outlined">
                    {forgotLoading ? 'progress_activity' : 'send'}
                  </span>
                </button>

                <p className="font-label text-[10px] text-white/20 uppercase tracking-widest text-center">
                  Code expires in 1 hour — change password after login
                </p>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ========== END MODAL ========== */}

      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img
          className="w-full h-full object-cover filter blur-lg brightness-[0.2] contrast-125 scale-110"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCEy2zIVPPR22mzl5y53pxk4frkkFDpTNDPpdCXVLTonBTxgroGHtxQ9o7X9Uc3HZFfnDjdIIgHS9_D9wj54UUNhiX1HDusTpnshZHe_c4etSWfM-qe_ABQUohuHKqvmzWQFiSy6SOQXPmWcFCvHvUXKVa6_7VvAIBq8E00P0kCu5rVkCh8LeOamASFilKg69IkUSZvlYmfkuDD9Dp7p7SToGWacUPLKcFzpI4izRFDxgFDPUpyIJCb5FoBjPLjZCMBEQRBGS2wBcx"
          alt="SOC Background"
        />
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
        <div className="w-full max-w-md transform skew-x-[-2deg] transition-all duration-500">

          {/* Branding */}
          <div className="mb-12 flex flex-col items-start transform skew-x-[2deg]">
            <h1 className="font-headline font-black italic text-5xl md:text-6xl text-[#FF003C] tracking-tighter drop-shadow-[0_0_15px_rgba(255,0,60,0.5)]">
              PHANTOM PROTOCOL
            </h1>
            <div className="flex items-center gap-3 mt-2 bg-[#FF003C] text-white px-3 py-1 font-label text-xs font-bold tracking-widest uppercase">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              SYSTEM_LINK_ACTIVE
            </div>
          </div>

          {/* Card */}
          <div className="slashed-card bg-surface-container-lowest/80 backdrop-blur-2xl border border-white/5 p-8 md:p-12 shadow-[20px_20px_60px_rgba(0,0,0,0.8)] relative">
            <div className="absolute top-0 right-0 w-24 h-1 bg-[#FF003C] shadow-[0_0_15px_#FF003C]"></div>

            <form className="space-y-8 transform skew-x-[2deg]" onSubmit={handleSubmit}>

              {error && (
                <div className="flex items-center gap-3 border border-[#FF003C]/50 bg-[#FF003C]/10 px-4 py-3">
                  <span className="material-symbols-outlined text-[#FF003C] text-sm">error</span>
                  <p className="font-label text-xs tracking-widest text-[#FF003C] uppercase">{error}</p>
                </div>
              )}

              <div className="space-y-2 group/input">
                <label className="block font-label font-bold text-sm tracking-[0.2em] text-[#00FFFF] opacity-70 group-focus-within/input:opacity-100 transition-opacity">
                  OPERATIVE_EMAIL
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant py-4 px-0 text-xl font-headline focus:ring-0 focus:border-[#FF003C] placeholder:text-white/10 transition-all tracking-widest"
                    placeholder="agent@domain.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <div className="absolute right-0 bottom-4 opacity-30">
                    <span className="material-symbols-outlined">person_filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 group/input">
                <label className="block font-label font-bold text-sm tracking-[0.2em] text-[#00FFFF] opacity-70 group-focus-within/input:opacity-100 transition-opacity">
                  ACCESS_KEY
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant py-4 px-0 text-xl font-headline focus:ring-0 focus:border-[#FF003C] placeholder:text-white/10 transition-all"
                    placeholder="••••••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <div className="absolute right-0 bottom-4 opacity-30">
                    <span className="material-symbols-outlined">vpn_key</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-4">
                <button
                  className="w-full bg-[#FF003C] hover:bg-[#D10031] disabled:opacity-50 disabled:cursor-not-allowed text-white font-headline font-black text-xl py-6 px-8 flex items-center justify-between group/btn transition-all shiver-effect shadow-[0_10px_30px_rgba(255,0,60,0.3)]"
                  type="submit"
                  disabled={loading}
                >
                  <span className="uppercase tracking-tighter">
                    {loading ? 'AUTHENTICATING...' : 'INITIATE ACCESS'}
                  </span>
                  {loading
                    ? <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined transform group-hover/btn:translate-x-2 transition-transform">arrow_forward_ios</span>
                  }
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-white/10"></div>
                  <span className="font-label text-[10px] tracking-widest text-white/30 uppercase">or</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-white/10"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full bg-transparent border border-white/10 hover:border-[#00FFFF]/40 hover:bg-white/5 text-white font-label font-bold text-sm py-4 px-8 flex items-center justify-center gap-3 transition-all tracking-widest uppercase"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                {/* 👇 Forgotten credentials — now opens modal */}
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-label text-xs tracking-widest text-[#00FFFF]/50 hover:text-[#00FFFF] transition-colors flex items-center gap-2 group/link text-left"
                >
                  <span className="w-2 h-2 bg-[#00FFFF]/20 group-hover/link:bg-[#00FFFF] transition-colors"></span>
                  Forgotten credentials?
                </button>

                <div className="h-[1px] w-full bg-gradient-to-r from-white/10 to-transparent"></div>
                <Link
                  to="/register"
                  className="font-label text-xs tracking-widest text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 group/link"
                >
                  <span className="w-2 h-2 bg-white/10 group-hover/link:bg-white/60 transition-colors"></span>
                  No account? <span className="text-[#00FFFF]/70 hover:text-[#00FFFF] ml-1">Request Clearance →</span>
                </Link>

                <div className="h-[1px] w-full bg-gradient-to-r from-white/10 to-transparent"></div>
                <p className="font-label text-[10px] text-white/30 uppercase tracking-[0.3em]">
                  Connection status: <span className="text-[#00FF00]">ENCRYPTED</span>
                </p>
              </div>
            </form>
          </div>
        </div>
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