import React from 'react';
import './Login.css';

export default function PhantomLogin() {
  return (
    <div className="phantom-wrapper font-body selection:bg-primary-container selection:text-white">
      {/* Background Layer: Blurred SOC Terminal */}
      <div className="fixed inset-0 z-0">
        <img
          className="w-full h-full object-cover filter blur-lg brightness-[0.2] contrast-125 scale-110"
          data-alt="Blurred cybersecurity operations center with multiple monitors displaying red terminal code and data streams in a dark room"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCEy2zIVPPR22mzl5y53pxk4frkkFDpTNDPpdCXVLTonBTxgroGHtxQ9o7X9Uc3HZFfnDjdIIgHS9_D9wj54UUNhiX1HDusTpnshZHe_c4etSWfM-qe_ABQUohuHKqvmzWQFiSy6SOQXPmWcFCvHvUXKVa6_7VvAIBq8E00P0kCu5rVkCh8LeOamASFilKg69IkUSZvlYmfkuDD9Dp7p7SToGWacUPLKcFzpI4izRFDxgFDPUpyIJCb5FoBjPLjZCMBEQRBGS2wBcx"
          alt="SOC Background"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent"></div>
        <div className="absolute inset-0 bg-[#FF003C]/5 mix-blend-overlay"></div>
      </div>

      {/* Restricted Area Watermark */}
      <div className="fixed top-12 left-12 z-10 pointer-events-none opacity-20">
        <div className="font-headline font-black text-6xl tracking-tighter text-outline-variant border-2 border-outline-variant px-6 py-2 rotate-[-12deg]">
          RESTRICTED AREA
        </div>
      </div>

      {/* Main Content Canvas */}
      <main className="relative z-20 min-h-screen flex items-center justify-center p-6">
        {/* Login Container: Skewed & Slashed */}
        <div className="w-full max-w-md transform skew-x-[-2deg] transition-all duration-500">

          {/* Branding Anchor */}
          <div className="mb-12 flex flex-col items-start transform skew-x-[2deg]">
            <h1 className="font-headline font-black italic text-5xl md:text-6xl text-[#FF003C] tracking-tighter drop-shadow-[0_0_15px_rgba(255,0,60,0.5)]">
              PHANTOM PROTOCOL
            </h1>
            <div className="flex items-center gap-3 mt-2 bg-[#FF003C] text-white px-3 py-1 font-label text-xs font-bold tracking-widest uppercase">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              SYSTEM_LINK_ACTIVE
            </div>
          </div>

          {/* The Card */}
          <div className="slashed-card bg-surface-container-lowest/80 backdrop-blur-2xl border border-white/5 p-8 md:p-12 shadow-[20px_20px_60px_rgba(0,0,0,0.8)] relative group">

            {/* Inner Glitch Accent */}
            <div className="absolute top-0 right-0 w-24 h-1 bg-[#FF003C] shadow-[0_0_15px_#FF003C]"></div>

            <form className="space-y-8 transform skew-x-[2deg]">
              {/* Operative ID Field */}
              <div className="space-y-2 group/input">
                <label className="block font-label font-bold text-sm tracking-[0.2em] text-[#00FFFF] opacity-70 group-focus-within/input:opacity-100 transition-opacity">
                  OPERATIVE_ID
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant py-4 px-0 text-xl font-headline focus:ring-0 focus:border-[#FF003C] placeholder:text-white/10 transition-all uppercase tracking-widest"
                    placeholder="PX-000-ALPHA"
                    type="text"
                  />
                  <div className="absolute right-0 bottom-4 opacity-30">
                    <span className="material-symbols-outlined">person_filled</span>
                  </div>
                </div>
              </div>

              {/* Access Key Field */}
              <div className="space-y-2 group/input">
                <label className="block font-label font-bold text-sm tracking-[0.2em] text-[#00FFFF] opacity-70 group-focus-within/input:opacity-100 transition-opacity">
                  ACCESS_KEY
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-transparent border-0 border-b-2 border-outline-variant py-4 px-0 text-xl font-headline focus:ring-0 focus:border-[#FF003C] placeholder:text-white/10 transition-all"
                    placeholder="••••••••••••"
                    type="password"
                  />
                  <div className="absolute right-0 bottom-4 opacity-30">
                    <span className="material-symbols-outlined">vpn_key</span>
                  </div>
                </div>
              </div>

              {/* Login Button */}
              <div className="pt-6">
                <button
                  className="w-full bg-[#FF003C] hover:bg-[#D10031] text-white font-headline font-black text-xl py-6 px-8 flex items-center justify-between group/btn transition-all shiver-effect shadow-[0_10px_30px_rgba(255,0,60,0.3)]"
                  type="submit"
                >
                  <span className="uppercase tracking-tighter">INITIATE ACCESS</span>
                  <span className="material-symbols-outlined transform group-hover/btn:translate-x-2 transition-transform">arrow_forward_ios</span>
                </button>
              </div>

              {/* Footer Links */}
              <div className="flex flex-col gap-4 pt-4">
                <a className="font-label text-xs tracking-widest text-[#00FFFF]/50 hover:text-[#00FFFF] transition-colors flex items-center gap-2 group/link" href="#!">
                  <span className="w-2 h-2 bg-[#00FFFF]/20 group-hover/link:bg-[#00FFFF] transition-colors"></span>
                  Forgotten credentials?
                </a>
                <div className="h-[1px] w-full bg-gradient-to-r from-white/10 to-transparent"></div>
                <p className="font-label text-[10px] text-white/30 uppercase tracking-[0.3em]">
                  Connection status: <span className="text-[#00FF00]">ENCRYPTED</span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Terminal Overlay Elements */}
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