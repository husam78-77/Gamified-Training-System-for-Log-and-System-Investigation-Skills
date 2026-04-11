/**
 * TimerDisplay.jsx
 * HUD timer shown in the top-right of GamingEnvironment.
 * Handles both timed mode (countdown) and free mode (no timer).
 * Changes color and behavior as time runs out.
 *
 * Props:
 *   formattedTime   - "MM:SS" string | null (null = free mode)
 *   timeRemaining   - seconds number | null
 *   mode            - 'timed' | 'free'
 */

import React from 'react';

// Urgency thresholds in seconds
const WARN_THRESHOLD = 300; // 5 minutes  → yellow
const CRITICAL_THRESHOLD = 60;  // 1 minute   → red + pulse

export default function TimerDisplay({ formattedTime, timeRemaining, mode }) {
    const isFree = mode === 'free';
    const isWarn = !isFree && timeRemaining !== null && timeRemaining <= WARN_THRESHOLD && timeRemaining > CRITICAL_THRESHOLD;
    const isCritical = !isFree && timeRemaining !== null && timeRemaining <= CRITICAL_THRESHOLD;
    const isExpired = !isFree && timeRemaining === 0;

    // Color scheme per urgency
    const timerColor = isCritical
        ? 'text-[#FF003C]'
        : isWarn
            ? 'text-yellow-400'
            : 'text-[#00EBF7]';

    const glowClass = isCritical
        ? 'drop-shadow-[0_0_12px_rgba(255,0,60,0.8)]'
        : isWarn
            ? 'drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
            : 'drop-shadow-[0_0_8px_rgba(0,235,247,0.4)]';

    const statusLabel = isFree
        ? 'FREE_ROAM'
        : isCritical
            ? 'CRITICAL'
            : isWarn
                ? 'LOW_TIME'
                : 'TIME_REMAINING';

    const statusColor = isCritical
        ? 'text-[#FF003C]'
        : isWarn
            ? 'text-yellow-400'
            : 'text-[#00EBF7]/40';

    return (
        <div className="flex flex-col items-end gap-1">
            {/* Status badges */}
            <div className="flex items-center gap-2">
                {isCritical && (
                    <div className="px-2 py-0.5 bg-[#FF003C] text-black font-label text-[9px] font-black tracking-widest animate-pulse">
                        CRITICAL
                    </div>
                )}
                {!isFree && (
                    <div className="px-2 py-0.5 border border-[#00EBF7]/30 text-[#00EBF7]/60 font-label text-[9px] font-bold tracking-wider">
                        SYSTEM_ACTIVE
                    </div>
                )}
                {isFree && (
                    <div className="px-2 py-0.5 border border-white/10 text-white/20 font-label text-[9px] font-bold tracking-wider">
                        FREE_MODE
                    </div>
                )}
            </div>

            {/* Timer / Mode display */}
            <div className="flex flex-col items-end">
                <span className={`font-label text-[9px] tracking-[0.2em] uppercase ${statusColor}`}>
                    {statusLabel}
                </span>

                {isFree ? (
                    // Free mode — show ∞ symbol
                    <div className="font-headline text-5xl tracking-tighter italic text-white/10">
                        ∞
                    </div>
                ) : isExpired ? (
                    <div className="font-headline text-4xl tracking-tighter italic text-[#FF003C] animate-pulse">
                        TIME_UP
                    </div>
                ) : (
                    <div
                        className={`font-headline text-5xl tracking-tighter italic ${timerColor} ${glowClass} ${isCritical ? 'animate-pulse' : ''
                            } transition-colors duration-1000`}
                    >
                        {formattedTime || '00:00'}
                    </div>
                )}
            </div>

            {/* Warning bar — fills as time runs out */}
            {!isFree && timeRemaining !== null && (
                <TimerBar timeRemaining={timeRemaining} isCritical={isCritical} isWarn={isWarn} />
            )}
        </div>
    );
}

// ── Progress bar draining as time runs out ────────────────────────────────

function TimerBar({ timeRemaining, isCritical, isWarn }) {
    // Total duration stored in env — default 900s
    const total = parseInt(import.meta.env.VITE_TIMED_DURATION || '900', 10);
    const pct = Math.max(0, Math.min(100, (timeRemaining / total) * 100));

    const barColor = isCritical
        ? 'bg-[#FF003C]'
        : isWarn
            ? 'bg-yellow-400'
            : 'bg-[#00EBF7]';

    return (
        <div className="w-32 h-px bg-white/5 relative overflow-hidden">
            <div
                className={`absolute right-0 top-0 h-full ${barColor} transition-all duration-1000`}
                style={{ width: `${pct}%` }}
            ></div>
        </div>
    );
}