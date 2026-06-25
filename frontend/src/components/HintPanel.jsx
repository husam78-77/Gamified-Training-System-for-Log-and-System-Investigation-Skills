/**
 * HintPanel.jsx
 * The AI_ORACLE panel. Shows the selected hint with numbered navigation.
 * Handles loading, limit-reached, and error states.
 *
 * Props:
 *   hints           - full hint array
 *   hintsRemaining  - number (0–5)
 *   limitReached    - bool
 *   isLoading       - bool
 *   error           - string | null
 *   onRequestHint   - function → calls useHint.getHint()
 */

import React, { useState, useEffect } from 'react';

export default function HintPanel({
    hints = [],
    hintsRemaining = 5,
    limitReached = false,
    isLoading = false,
    error = null,
    onRequestHint,
}) {
    const [selectedIndex, setSelectedIndex] = useState(hints.length > 0 ? hints.length - 1 : 0);

    // Auto-select the newest hint whenever a new one is added
    useEffect(() => {
        if (hints.length > 0) {
            setSelectedIndex(hints.length - 1);
        }
    }, [hints.length]);

    const selectedHint = hints.length > 0 ? hints[selectedIndex] : null;
    const canRequest = !limitReached && !isLoading;

    return (
        <section className="flex-1 bg-surface-container-highest p-5 border-l-2 border-[#00EBF7]/30 relative overflow-hidden flex flex-col gap-4">

            {/* Background neurology icon — decorative */}
            <div className="absolute -top-2 -right-2 opacity-[0.04] scale-150 rotate-12 pointer-events-none select-none">
                <span className="material-symbols-outlined text-[120px] text-[#00EBF7]">neurology</span>
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00EBF7] text-base">smart_toy</span>
                    <h2 className="font-label text-[10px] font-bold tracking-[0.2em] text-[#00EBF7]/80 uppercase">
                        AI_Oracle
                    </h2>
                </div>

                {/* Hints remaining pips */}
                <div className="flex items-center gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-1.5 h-1.5 transition-all duration-300 ${i < hintsRemaining
                                    ? 'bg-[#00EBF7]'
                                    : 'bg-white/10'
                                }`}
                        ></div>
                    ))}
                </div>
            </div>

            {/* Hint display area */}
            <div className="relative z-10 flex-1 flex flex-col justify-between gap-4">

                {/* Current hint or placeholder */}
                <div className={`border-l-2 pl-3 py-1 transition-all duration-500 overflow-y-auto custom-scrollbar max-h-32 pr-2 ${selectedHint?.isNew
                        ? 'border-[#00EBF7] bg-[#00EBF7]/5'
                        : 'border-[#00EBF7]/20'
                    }`}>
                    {isLoading ? (
                        <LoadingState />
                    ) : selectedHint ? (
                        <p className="font-body text-xs leading-relaxed text-on-surface/90 italic">
                            "{selectedHint.text}"
                        </p>
                    ) : limitReached ? (
                        <LimitReachedState />
                    ) : error ? (
                        <ErrorState error={error} />
                    ) : (
                        <PlaceholderState />
                    )}
                </div>

                {/* Numbered hint navigation — only visible when hints exist */}
                {hints.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {hints.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedIndex(i)}
                                className={`w-7 h-7 font-label text-[9px] font-bold tracking-wide transition-all duration-200 border flex items-center justify-center ${
                                    i === selectedIndex
                                        ? 'bg-[#00EBF7] border-[#00EBF7] text-black'
                                        : 'bg-transparent border-[#00EBF7]/30 text-[#00EBF7]/60 hover:border-[#00EBF7]/60 hover:text-[#00EBF7] cursor-pointer'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}

                {/* Request hint button */}
                <button
                    onClick={onRequestHint}
                    disabled={!canRequest}
                    className={`w-full py-3 font-label text-[10px] font-bold tracking-[0.3em] uppercase transition-all duration-300 flex items-center justify-center gap-2 ${canRequest
                            ? 'bg-[#00EBF7]/10 border border-[#00EBF7]/30 text-[#00EBF7] hover:bg-[#00EBF7]/20 hover:border-[#00EBF7]/60 cursor-pointer'
                            : 'bg-white/5 border border-white/5 text-white cursor-not-allowed'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                            Analyzing...
                        </>
                    ) : limitReached ? (
                        <>
                            <span className="material-symbols-outlined text-sm">block</span>
                            No hints remaining
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-sm">psychology</span>
                            Request Analysis
                            <span className="text-white">({hintsRemaining} left)</span>
                        </>
                    )}
                </button>
            </div>

            {/* Bottom status line */}
            <div className="relative z-10 flex items-center gap-2 opacity-20">
                <div className="h-px flex-1 bg-[#00EBF7]"></div>
                <span className="font-label text-[8px] tracking-widest uppercase">
                    {limitReached ? 'ORACLE_DEPLETED' : 'ORACLE_READY'}
                </span>
            </div>
        </section>
    );
}

// ── Sub-states ────────────────────────────────────────────────────────────

function LoadingState() {
    return (
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#00EBF7] text-sm animate-spin">sync</span>
            <p className="font-label text-[10px] text-[#00EBF7]/60 tracking-wider italic">
                Analyzing your investigation path...
            </p>
        </div>
    );
}

function PlaceholderState() {
    return (
        <p className="font-body text-xs text-white italic leading-relaxed">
            The Oracle is watching. Request an analysis when you need guidance.
        </p>
    );
}

function LimitReachedState() {
    return (
        <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-white text-sm flex-shrink-0 mt-0.5">
                block
            </span>
            <p className="font-label text-[10px] text-white leading-relaxed">
                Oracle capacity exhausted for this session. Continue your investigation independently.
            </p>
        </div>
    );
}

function ErrorState({ error }) {
    return (
        <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[#FF003C]/60 text-sm flex-shrink-0 mt-0.5">
                error
            </span>
            <p className="font-label text-[10px] text-[#FF003C]/60 leading-relaxed">
                Oracle link disrupted. {error}
            </p>
        </div>
    );
}
