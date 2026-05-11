/**
 * TerminalPanel.jsx
 * Wraps the xterm.js DOM mount point.
 * The actual terminal logic lives in useTerminal — this is purely the container.
 *
 * Props:
 *   terminalRef      - ref from useTerminal, attach to the inner div
 *   currentPath      - string, shown in the header bar
 *   isReady          - bool, shows loading state before xterm mounts
 *   isProcessing     - bool, pulses border while awaiting API response
 *   hasNewDiscovery  - bool, triggers brief cyan glow on new discovery
 */

import React from 'react';

export default function TerminalPanel({ terminalRef, currentPath, isReady, isProcessing, hasNewDiscovery }) {
    const borderClass = hasNewDiscovery
        ? 'terminal-discovery-glow'
        : isProcessing
            ? 'terminal-processing-pulse'
            : 'terminal-glow';

    return (
        <div className={`w-full h-full flex flex-col relative ${borderClass}`}>

            {/* Terminal chrome bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/5 flex-shrink-0">
                {/* Left: traffic lights + OS label */}
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#FF003C]/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
                    </div>
                    <span className="font-label text-[10px] tracking-[0.3em] text-white uppercase">
                        Hyperion-OS // secure shell
                    </span>
                </div>

                {/* Center: current path */}
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#FF003C] text-sm">terminal</span>
                    <span className="font-label text-xs text-[#00EBF7] tracking-wider">
                        root@hyperion:<span className="text-white">{currentPath}</span>
                    </span>
                </div>

                {/* Right: status indicator */}
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`}></div>
                    <span className="font-label text-[9px] text-white tracking-widest uppercase">
                        {isReady ? 'ACTIVE' : 'INIT'}
                    </span>
                </div>
            </div>

            {/* Corner brackets — decorative framing */}
            <div className="absolute top-10 left-0 w-6 h-6 border-t border-l border-[#FF003C]/40 pointer-events-none z-10"></div>
            <div className="absolute top-10 right-0 w-6 h-6 border-t border-r border-[#FF003C]/40 pointer-events-none z-10"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#FF003C]/40 pointer-events-none z-10"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-[#FF003C]/40 pointer-events-none z-10"></div>

            {/* Loading state — shown before xterm mounts */}
            {!isReady && (
                <div className="flex-1 flex flex-col items-center justify-center bg-black/95 gap-4">
                    <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div
                                key={i}
                                className="w-1 h-6 bg-[#FF003C]"
                                style={{
                                    animation: 'termLoad 0.8s ease-in-out infinite',
                                    animationDelay: `${i * 0.12}s`,
                                }}
                            ></div>
                        ))}
                    </div>
                    <span className="font-label text-[10px] text-white tracking-[0.4em] uppercase">
                        Initializing secure shell...
                    </span>
                </div>
            )}

            {/* xterm.js mount point — useTerminal attaches here via terminalRef */}
            <div
                ref={terminalRef}
                className="flex-1 overflow-hidden bg-black/95"
                style={{ display: isReady ? 'block' : 'none' }}
            />

            {/* Scanline overlay */}
            <div
                className="absolute inset-0 pointer-events-none z-20 opacity-[0.03]"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
                }}
            ></div>

            <style>{`
                @keyframes termLoad {
                    0%, 100% { transform: scaleY(0.3); opacity: 0.3; }
                    50%       { transform: scaleY(1);   opacity: 1; }
                }
            `}</style>
        </div>
    );
}