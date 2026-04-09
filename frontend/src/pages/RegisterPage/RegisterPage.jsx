import { useState, useEffect } from 'react';                          // 👈 added useEffect
import { useNavigate, Link, useSearchParams } from 'react-router-dom'; // 👈 added useSearchParams
import { registerUser } from '../../services/authService';
import './Register.css';

export default function OperativeEnlistment() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 👇 Prefill email if coming from Google OAuth
  useEffect(() => {
    const googleEmail = searchParams.get('email');
    if (googleEmail) setEmail(decodeURIComponent(googleEmail));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!accepted) {
      setError('You must accept the protocol to enlist.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({ username, email, password });
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="enlistment-wrapper font-body selection:bg-primary-container selection:text-on-primary-container">

      {/* Background Scrolling "Breaches" */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-around opacity-10">
        <div className="scrolling-text font-label text-secondary tracking-[1em] whitespace-nowrap text-xs">
          BREACH_ID: 9928-X // TARGET: SECURE_CORE // STATUS: COMPROMISED // DEPTH: LEVEL_04 // VULNERABILITY: SQL_INJECTION
        </div>
        <div className="scrolling-text font-label text-secondary tracking-[1em] whitespace-nowrap text-xs mt-20">
          BREACH_ID: 4412-Z // TARGET: GRID_CONTROL // STATUS: ACTIVE // DEPTH: LEVEL_09 // VULNERABILITY: ZERO_DAY
        </div>
        <div className="scrolling-text font-label text-secondary tracking-[1em] whitespace-nowrap text-xs -mt-10">
          BREACH_ID: 1105-Q // TARGET: DATA_VAULT // STATUS: ENCRYPTED // DEPTH: LEVEL_01 // VULNERABILITY: SOCIAL_ENGINEERING
        </div>
        <div className="scrolling-text font-label text-secondary tracking-[1em] whitespace-nowrap text-xs mt-32">
          BREACH_ID: 8872-B // TARGET: COMMS_ARRAY // STATUS: DEPLOYED // DEPTH: LEVEL_03 // VULNERABILITY: BRUTE_FORCE
        </div>
      </div>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 flex justify-between items-center w-full px-8 py-6 bg-[#0A0A0A]/80 backdrop-blur-xl z-50">
        <div className="text-3xl italic font-black text-[#FF003C] drop-shadow-[0_0_15px_rgba(255,0,60,0.5)] font-headline uppercase tracking-tighter">
          KINETIC BREACH
        </div>
        <nav className="hidden md:flex gap-10">
          <a className="text-white/60 hover:text-white transition-colors font-headline font-black uppercase tracking-tighter hover:skew-x-[-12deg] hover:bg-[#FF003C] hover:text-white duration-150 px-4 py-1" href="#!">INTEL</a>
          <a className="text-white/60 hover:text-white transition-colors font-headline font-black uppercase tracking-tighter hover:skew-x-[-12deg] hover:bg-[#FF003C] hover:text-white duration-150 px-4 py-1" href="#!">BREACH</a>
          <a className="text-white/60 hover:text-white transition-colors font-headline font-black uppercase tracking-tighter hover:skew-x-[-12deg] hover:bg-[#FF003C] hover:text-white duration-150 px-4 py-1" href="#!">ARSENAL</a>
          <a className="text-white/60 hover:text-white transition-colors font-headline font-black uppercase tracking-tighter hover:skew-x-[-12deg] hover:bg-[#FF003C] hover:text-white duration-150 px-4 py-1" href="#!">RANKS</a>
        </nav>
        <div className="flex gap-4">
          <Link to="/login" className="font-headline font-black uppercase tracking-tighter text-[#FF003C] px-6 py-2 border border-[#FF003C]/30 hover:bg-[#FF003C] hover:text-white transition-all">
            LOGIN
          </Link>
          <button className="font-headline font-black uppercase tracking-tighter bg-[#FF003C] text-white px-6 py-2 slashed-button shiver transition-all">JOIN</button>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar Info */}
        <div className="lg:col-span-4 flex flex-col justify-start gap-8">
          <div className="relative">
            <h1 className="font-headline text-5xl font-black italic uppercase leading-none text-[#FF003C] -skew-x-6 drop-shadow-[0_0_20px_rgba(255,0,60,0.3)]">
              OPERATIVE<br />ENLISTMENT
            </h1>
            <div className="mt-6 flex items-center gap-4 text-secondary">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              <p className="font-label text-sm tracking-[0.2em]">PHANTOM PROTOCOL INITIALIZED</p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex flex-col gap-6 mt-12">
            <div className="flex items-center gap-6">
              <span className="font-headline text-5xl font-black italic text-[#FF003C]">01</span>
              <div className="h-[2px] w-full bg-surface-container-highest relative">
                <div className="absolute inset-0 w-full bg-[#FF003C]"></div>
              </div>
              <span className="font-label text-xs tracking-widest text-white whitespace-nowrap">AUTHENTICATION</span>
            </div>
            <div className="flex items-center gap-6 opacity-40">
              <span className="font-headline text-5xl font-black italic text-secondary">02</span>
              <div className="h-[2px] w-full bg-surface-container-highest"></div>
              <span className="font-label text-xs tracking-widest text-secondary whitespace-nowrap">VERIFICATION</span>
            </div>
          </div>

          <div className="mt-auto p-6 bg-surface-container-low border-l-4 border-secondary">
            <p className="font-label text-xs leading-relaxed text-secondary/70">
              SYSTEM_NOTICE: UNRECOGNIZED SIGNAL DETECTED. ALL ENLISTEES MUST COMPLY WITH THE KINETIC BREACH MASTER PROTOCOL. FAILURE TO SYNC WILL RESULT IN IMMEDIATE TERMINAL LOCKOUT.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          <section className="bg-surface-container-high slashed-container p-10 flex flex-col gap-10 shadow-[20px_20px_0px_rgba(255,0,60,0.05)] border-t border-white/5">
            <div className="flex justify-between items-end">
              <h2 className="font-headline text-3xl font-black text-white italic">PHANTOM_PROTOCOL_REGISTRY</h2>
              <span className="font-label text-xs text-[#FF003C] tracking-widest">
                {loading ? 'PROCESSING...' : 'AWAITING_INPUT...'}
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 border border-[#FF003C]/50 bg-[#FF003C]/10 px-4 py-3">
                <span className="material-symbols-outlined text-[#FF003C] text-sm">error</span>
                <p className="font-label text-xs tracking-widest text-[#FF003C] uppercase">{error}</p>
              </div>
            )}

            {/* 👇 Google email prefill notice */}
            {searchParams.get('email') && (
              <div className="flex items-center gap-3 border border-[#00FFFF]/30 bg-[#00FFFF]/5 px-4 py-3">
                <span className="material-symbols-outlined text-[#00FFFF] text-sm">info</span>
                <p className="font-label text-xs tracking-widest text-[#00FFFF]/70 uppercase">
                  Google signal detected — email pre-loaded. Set a username and passcode to complete enlistment.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              {/* Username */}
              <div className="flex flex-col gap-2">
                <label className="font-label text-xs text-secondary/60 tracking-tighter uppercase">OPERATIVE_USERNAME</label>
                <input
                  className="bg-surface-container-lowest border-0 border-b-2 border-outline focus:border-secondary focus:ring-0 text-white font-label p-4 transition-all"
                  placeholder="GHOST_PROTOCOL"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <span className="font-label text-[10px] text-white/30 italic">Neural signature identifier for network access.</span>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="font-label text-xs text-secondary/60 tracking-tighter uppercase">
                  ENCRYPTED_EMAIL
                  {/* 👇 Show lock icon if prefilled from Google */}
                  {searchParams.get('email') && (
                    <span className="ml-2 text-[#00FFFF]/60 normal-case tracking-normal">
                      (via Google)
                    </span>
                  )}
                </label>
                <input
                  className="bg-surface-container-lowest border-0 border-b-2 border-outline focus:border-secondary focus:ring-0 text-white font-label p-4 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="SIGNAL@SECURE_NODE.IO"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  // 👇 Lock the field if prefilled from Google
                  readOnly={!!searchParams.get('email')}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label className="font-label text-xs text-secondary/60 tracking-tighter uppercase">ACCESS_PASSCODE</label>
                <input
                  className="bg-surface-container-lowest border-0 border-b-2 border-outline focus:border-secondary focus:ring-0 text-white font-label p-4 transition-all"
                  placeholder="••••••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span className="font-label text-[10px] text-white/30 italic">Min 8 chars, 1 uppercase, 1 number.</span>
              </div>

              {/* Checkbox */}
              <div className="flex items-start gap-4 mt-4">
                <input
                  className="mt-1 w-5 h-5 bg-surface-container-lowest border-outline text-primary focus:ring-offset-background focus:ring-primary cursor-pointer"
                  id="protocol_accept"
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                <label className="font-label text-[10px] leading-relaxed text-white/40 uppercase cursor-pointer" htmlFor="protocol_accept">
                  I UNDERSTAND THAT JOINING THE KINETIC BREACH IS AN IRREVERSIBLE ACTION. MY NEURAL SIGNATURE WILL BE LOGGED, AND MY OPERATIVE STATUS WILL BE PERMANENT.
                </label>
              </div>

              {/* Already have account */}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-white/10"></span>
                <Link to="/login" className="font-label text-xs tracking-widest text-white/40 hover:text-[#00FFFF] transition-colors">
                  Already enlisted? <span className="text-[#00FFFF]/70">Access Terminal →</span>
                </Link>
              </div>

              {/* Submit */}
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="font-headline font-black text-3xl italic tracking-tighter bg-[#FF003C] disabled:opacity-50 disabled:cursor-not-allowed text-white px-12 py-6 slashed-button shiver shadow-[0_0_30px_rgba(255,0,60,0.4)] hover:shadow-[0_0_50px_rgba(255,0,60,0.6)] transition-all flex items-center gap-4"
                >
                  {loading ? 'ENLISTING...' : 'SIGN THE PROTOCOL'}
                  <span className="material-symbols-outlined text-4xl">
                    {loading ? 'progress_activity' : 'key'}
                  </span>
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-8 flex flex-col items-center gap-4 bg-[#0A0A0A] relative z-20">
        <div className="text-[#FF003C] font-black font-headline text-2xl tracking-tight">KINETIC BREACH</div>
        <div className="flex flex-wrap justify-center gap-8 font-label text-xs tracking-widest text-[#00FFFF]/50 mb-4">
          <a className="hover:text-[#00FFFF] transition-all" href="#!">TERMINAL_PROTOCOLS</a>
          <a className="hover:text-[#00FFFF] transition-all" href="#!">ENCRYPTION_POLICY</a>
          <a className="hover:text-[#00FFFF] transition-all" href="#!">SIGNAL_HELP</a>
        </div>
        <p className="font-label text-xs tracking-widest text-[#00FFFF]/30">
          © 2024 KINETIC BREACH. RESISTANCE IS MANDATORY.
        </p>
      </footer>

      {/* Decorative Corner Element */}
      <div className="fixed bottom-0 right-0 p-4 z-0 pointer-events-none overflow-hidden select-none">
        <div className="font-headline text-[15rem] leading-none font-black text-white/5 italic select-none">
          01
        </div>
      </div>
    </div>
  );
}