import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

export default function KineticBreach() {
  const navigate = useNavigate();
  return (
    <div className="kinetic-wrapper font-body selection:bg-[#FF003C] selection:text-white">
      {/* TopAppBar */}
      <nav className="fixed top-0 flex justify-between items-center w-full px-8 py-6 bg-[#0A0A0A]/95 z-50">
        <div className="text-3xl italic font-black text-[#FF003C] drop-shadow-[0_0_15px_rgba(255,0,60,0.5)] font-headline uppercase tracking-tighter">
          KINETIC BREACH
        </div>

        <div className="hidden md:flex gap-8 items-center">
          <a className="font-headline font-black uppercase tracking-tighter text-[#FF003C] border-b-4 border-[#FF003C] skew-x-[-12deg] px-4 transition-all" href="#!">INTEL</a>
          <a className="font-headline font-black uppercase tracking-tighter text-white/60 hover:text-white transition-colors hover:skew-x-[-12deg] hover:bg-[#FF003C] hover:text-white duration-150 px-4" href="#!">BREACH</a>
          <a className="font-headline font-black uppercase tracking-tighter text-white/60 hover:text-white transition-colors hover:skew-x-[-12deg] hover:bg-[#FF003C] hover:text-white duration-150 px-4" href="#!">ARSENAL</a>
          <a className="font-headline font-black uppercase tracking-tighter text-white/60 hover:text-white transition-colors hover:skew-x-[-12deg] hover:bg-[#FF003C] hover:text-white duration-150 px-4" href="#!">RANKS</a>
        </div>

        <div className="flex gap-4">
          <button onClick={() => navigate('/login')} className="font-headline font-black uppercase tracking-tighter text-white/60 hover:text-white px-4 py-2 transition-colors">LOGIN</button>
          <button onClick={() => navigate('/register')} className="font-headline font-black uppercase tracking-tighter bg-[#FF003C] text-white px-6 py-2 skew-x-[-12deg] hover:translate-x-1 transition-transform">JOIN</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-screen flex items-center justify-center pt-20 px-8 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 grayscale contrast-125">
          <img
            alt="Cyberpunk high-tech server room with glowing red cables and digital displays"
            className="w-full h-full object-cover"
            data-alt="cinematic close-up of futuristic hardware with neon red fiber optics and complex mechanical geometry in dark atmospheric setting"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAT7G_QPO-S9VvfXfMm_dDlG7WhYDAuD3bIIYGZTo-OrohGYx_K2E8a83Lkoc-WM3VaflgfVycimoEjI89apviQA_WYakM0YJIHt0LZyUmQ4obLzBGDEWQzGOf8qgYCkUumyHtMaVWcTQPcW7V4FhyHO5qqv1owuPrjSoDCHwDy7NK_X8kYltl4Hv-L_ere-pF_ZEShf_Lin6oHJ9Y8b8oVZv9XFlZFS4dAwga55aP0peNAaD5iCrfz8AUXAbvcSSSq8tgQDNxVJX1A"
          />
        </div>

        <div className="relative z-10 w-full max-w-7xl">
          <div className="flex flex-col items-start gap-4">
            <div className="bg-[#FF003C] text-white px-4 py-1 skew-x-[-12deg] font-label font-bold text-sm tracking-[0.2em]">
              SYSTEM STATUS: VULNERABLE
            </div>

            <h1 className="text-7xl md:text-[12rem] font-headline font-black italic uppercase leading-[0.8] tracking-tighter glitch-text -ml-2 md:-ml-8 transform -rotate-2">
              JOIN THE<br />
              <span className="text-[#FF003C] inline-block translate-x-12">RESISTANCE</span>
            </h1>

            <div className="mt-12 flex flex-col md:flex-row gap-8 items-end w-full">
              <p className="max-w-md font-body text-lg text-on-surface-variant font-bold border-l-4 border-[#00FFFF] pl-6 py-2 bg-surface-container/40 backdrop-blur-md">
                PHANTOM PROTOCOL IS NOW ACTIVE. DEPLOY YOUR SIGIL. BREACH THE PERIMETER. LEAVE NO TRACE IN THE VOID.
              </p>

              <div className="flex-grow flex justify-end">
                <button onClick={() => navigate('/register')} className="group relative px-12 py-6 bg-[#FF003C] text-white font-headline font-black text-3xl italic uppercase skew-x-[-12deg] hover:translate-x-4 transition-all duration-300">
                  <span className="relative z-10 group-hover:drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">INITIALIZE BREACH</span>
                  <div className="absolute inset-0 bg-[#00FFFF] opacity-0 group-hover:opacity-20 transition-opacity"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Bento Grid Features */}
      <section className="py-32 px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* S-RANK MISSIONS */}
          <div className="md:col-span-8 bg-surface-container-high slash-top-right relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 z-20">
              <span className="font-label font-bold text-4xl text-[#FF003C]">S-RANK</span>
            </div>
            <img
              alt="Aggressive red abstract digital art"
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700"
              data-alt="abstract digital canvas with sharp red triangular fragments and deep black shadows in high contrast aggressive composition"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJPE7rJekYkY2lbye4BxjE3GTNeXZ3_EebiviQpeXSaYzA7Lz44Oet6uSx9FNtMuES3ely-mDUMAvo9rZ89Q9V6sb5R7zQfIO4XYB6eqrkp5dfHXaYvubtep2G0DyGUV7sgyX-gbqAjX06g4MV8ZzU2WNT3XFxzWOZOhC9UsH20jery83nnDPh-TYB4ONoSrfGAhNHidA1XM5zSAqFS1tGIbjSDUacQtQKnAPbS0QdHKHjn686Q5wiS_TPX-DYO-1aEdxK_KY2qJdo"
            />
            <div className="relative z-10 p-12 mt-40">
              <h3 className="font-headline font-black text-5xl uppercase tracking-tighter mb-4 text-white">S-RANK MISSIONS</h3>
              <p className="font-body text-xl max-w-lg mb-8 text-on-surface-variant">High-stakes tactical operations. Zero room for failure. Rewards scale with system damage.</p>
              <button className="bg-white text-black font-label font-bold py-3 px-8 skew-x-[-12deg] hover:bg-[#00FFFF] transition-colors">ACCESS TERMINAL</button>
            </div>
          </div>

          {/* REAL-TIME LOGS */}
          <div className="md:col-span-4 bg-surface-container-lowest p-8 border-r-8 border-[#FF003C] flex flex-col justify-between persona-shadow">
            <div>
              <div className="flex items-center gap-2 mb-8 text-[#00FFFF]">
                <span className="material-symbols-outlined">terminal</span>
                <span className="font-label uppercase font-bold tracking-widest">LIVE_FEED</span>
              </div>

              <div className="space-y-4 font-label text-xs text-[#00FFFF]/60">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>&gt; EXPLOIT_RUN: NODE_77</span>
                  <span className="text-[#FF003C]">SUCCESS</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>&gt; TRACE_DETECTED</span>
                  <span className="text-white">PURGING...</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>&gt; BYPASS: SEC_GATEWAY</span>
                  <span className="text-[#FF003C]">SUCCESS</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>&gt; PACKET_SNIFF: ACTIVE</span>
                  <span className="text-[#00FFFF]">ON-LINE</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="font-headline font-black text-4xl uppercase leading-none mb-2">REAL-TIME LOGS</h3>
              <div className="h-1 w-full bg-[#FF003C]"></div>
            </div>
          </div>

          {/* SQUAD INTEL */}
          <div className="md:col-span-4 bg-[#FF003C] p-8 skew-x-[4deg]">
            <div className="-skew-x-[4deg]">
              <h3 className="font-headline font-black text-4xl uppercase text-white mb-6 italic">SQUAD INTEL</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-black/20 p-4">
                  <div className="w-12 h-12 bg-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-black" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  </div>
                  <div>
                    <div className="font-label font-bold text-white uppercase">OPERATIVE_ZERO</div>
                    <div className="text-xs text-white/70">SPECIALTY: CRYPTO-WARFARE</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-black/20 p-4">
                  <div className="w-12 h-12 bg-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-black" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  </div>
                  <div>
                    <div className="font-label font-bold text-white uppercase">GHOST_WALKER</div>
                    <div className="text-xs text-white/70">SPECIALTY: STEALTH_LOGISTICS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ASYMMETRIC CONTENT */}
          <div className="md:col-span-8 bg-surface-container-high p-1 flex flex-col md:flex-row gap-1">
            <div className="bg-background flex-grow p-12">
              <h2 className="font-headline font-black text-6xl uppercase tracking-tighter mb-6 leading-none">THE VOID CALLS.</h2>
              <p className="font-body text-on-surface-variant mb-8 leading-relaxed">The architecture of the old world is crumbling. We are the architects of what comes next. Join the protocol and rewrite the source code of reality.</p>
              <div className="flex gap-4">
                <a className="inline-flex items-center gap-2 text-[#00FFFF] font-label font-bold hover:gap-4 transition-all" href="#!">
                  VIEW MANIFESTO <span className="material-symbols-outlined">trending_flat</span>
                </a>
              </div>
            </div>
            <div className="w-full md:w-1/3 bg-[#00FFFF] flex items-center justify-center p-8 group overflow-hidden">
              <span className="material-symbols-outlined text-black text-9xl group-hover:scale-125 transition-transform duration-500" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            </div>
          </div>

        </div>
      </section>

      {/* Tactical CTA Section */}
      <section className="relative py-40 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-32 bg-[#FF003C] -rotate-6 z-0"></div>
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <h2 className="font-headline font-black text-6xl md:text-9xl uppercase italic tracking-tighter text-white drop-shadow-2xl">READY TO BREACH?</h2>
          <div className="mt-12 flex gap-8">
            <button onClick={() => navigate('/login')} className="bg-black text-white px-12 py-5 font-headline font-black text-2xl skew-x-[-12deg] hover:bg-white hover:text-black transition-colors duration-300 border border-white/20">SYSTEM LOGIN</button>
            <button onClick={() => navigate('/register')} className="bg-[#00FFFF] text-black px-12 py-5 font-headline font-black text-2xl skew-x-[-12deg] hover:translate-y-[-4px] transition-transform shadow-[0_0_30px_rgba(0,255,255,0.4)]">ENLIST NOW</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-8 flex flex-col items-center gap-4 bg-[#0A0A0A]">
        <div className="text-[#FF003C] font-black font-headline text-2xl italic">KINETIC BREACH</div>
        <div className="flex gap-8">
          <a className="font-label text-xs tracking-widest text-[#00FFFF]/50 hover:text-[#00FFFF] transition-all" href="#!">TERMINAL_PROTOCOLS</a>
          <a className="font-label text-xs tracking-widest text-[#00FFFF]/50 hover:text-[#00FFFF] transition-all" href="#!">ENCRYPTION_POLICY</a>
          <a className="font-label text-xs tracking-widest text-[#00FFFF]/50 hover:text-[#00FFFF] transition-all" href="#!">SIGNAL_HELP</a>
        </div>
        <div className="font-label text-xs tracking-widest text-[#00FFFF]/30 mt-4 uppercase">
          © 2024 KINETIC BREACH. RESISTANCE IS MANDATORY.
        </div>
      </footer>
    </div>
  );
}