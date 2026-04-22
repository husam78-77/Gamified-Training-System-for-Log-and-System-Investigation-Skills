/**
 * useHint.js  ← frontend/src/hooks/useHint.js
 * Phase 5 — Handles auto-triggered hints pushed via command execution response
 *
 * CHANGES FROM PHASE 2:
 *   1. New: consumeAutoHint() — called by useTerminal when a command response
 *      contains an auto_hint field. Injects the hint into the hint panel
 *      with an 'isAuto' flag so HintPanel can render it differently
 *      (e.g. "ARIA INTERVENED" label vs "HINT REQUESTED" label).
 *   2. New: autoHintCount state — tracks how many hints were auto-pushed
 *      vs manually requested (useful for scoring display).
 *   3. hintsRemaining is decremented when an auto-hint arrives,
 *      because it still consumes one of the session's hint slots.
 *   4. Everything else identical to Phase 2.
 *
 * HOW AUTO-HINTS REACH THE FRONTEND:
 *   terminalController.executeCommand() calls evaluateAutoTrigger() after
 *   processing each command. If a trigger fires, it calls generateAutoHint()
 *   and includes { auto_hint: { hint, hintLevel } } in the execute response.
 *   useTerminal reads this field and calls hint.consumeAutoHint().
 *   No websocket, no polling, no separate endpoint needed.
 *
 * Path: frontend/src/hooks/useHint.js
 */

import { useState, useEffect, useCallback } from 'react';
import { requestHint, fetchHintLog } from '../services/hintService';

const MAX_HINTS = 5;

/**
 * @param {number} sessionId
 * @param {string} token
 */
export const useHint = (sessionId, token) => {
    const [hints, setHints] = useState([]);
    const [hintsRemaining, setHintsRemaining] = useState(MAX_HINTS);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [limitReached, setLimitReached] = useState(false);

    // Phase 2 fields
    const [currentHintLevel, setCurrentHintLevel] = useState(null);
    const [hintsRemainingForStep, setHintsRemainingForStep] = useState(null);
    const [stepProgress, setStepProgress] = useState([]);

    // Phase 5: auto-hint tracking
    const [autoHintCount, setAutoHintCount] = useState(0);

    // ── Restore on mount ──────────────────────────────────────────────────
    useEffect(() => {
        if (!sessionId || !token) return;
        const restore = async () => {
            try {
                const data = await fetchHintLog(sessionId, token);
                if (data.hints.length > 0) {
                    setHints(data.hints.map(h => ({
                        id: h.hint_id,
                        text: h.hint_returned,
                        timestamp: h.timestamp,
                        hintLevel: h.hint_level ?? 1,
                        isAuto: false, // Historical hints don't distinguish on restore
                    })));
                    setHintsRemaining(data.hintsRemaining);
                    if (data.hintsRemaining === 0) setLimitReached(true);
                }
                if (data.stepProgress?.length > 0) {
                    setStepProgress(data.stepProgress);
                }
            } catch (_) { }
        };
        restore();
    }, [sessionId, token]);

    // ── Manual hint request ───────────────────────────────────────────────
    const getHint = useCallback(async () => {
        if (!sessionId || !token) return;
        if (limitReached || hintsRemaining <= 0) { setLimitReached(true); return; }

        setIsLoading(true);
        setError(null);

        try {
            const data = await requestHint(sessionId, token);

            const newHint = {
                id: Date.now(),
                text: data.hint,
                timestamp: new Date().toISOString(),
                isNew: true,
                isAuto: false,           // Manually requested
                hintLevel: data.hintLevel ?? 1,
            };

            setHints(prev => [...prev, newHint]);
            setHintsRemaining(data.hintsRemaining);
            setCurrentHintLevel(data.hintLevel ?? 1);
            setHintsRemainingForStep(data.hintsRemainingForStep ?? null);

            if (data.hintsRemaining === 0) setLimitReached(true);

            setTimeout(() => {
                setHints(prev =>
                    prev.map(h => h.id === newHint.id ? { ...h, isNew: false } : h)
                );
            }, 2000);

        } catch (err) {
            if (err.limitReached) { setLimitReached(true); setHintsRemaining(0); }
            else setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, token, limitReached, hintsRemaining]);

    // ── Phase 5: Consume auto-triggered hint ─────────────────────────────
    /**
     * Called by useTerminal when a command response contains an auto_hint.
     * Injects the hint into the panel with isAuto=true.
     *
     * @param {Object} autoHintData  - { hint: string, hintLevel: number }
     *                                 from terminalController execute response
     */
    const consumeAutoHint = useCallback((autoHintData) => {
        if (!autoHintData?.hint) return;

        const newHint = {
            id: Date.now(),
            text: autoHintData.hint,
            timestamp: new Date().toISOString(),
            isNew: true,
            isAuto: true,               // ← Auto-triggered, not manually requested
            hintLevel: autoHintData.hintLevel ?? 1,
        };

        setHints(prev => [...prev, newHint]);

        // Auto-hints consume a session hint slot — decrement remaining
        setHintsRemaining(prev => {
            const next = Math.max(0, prev - 1);
            if (next === 0) setLimitReached(true);
            return next;
        });

        setCurrentHintLevel(autoHintData.hintLevel ?? 1);
        setAutoHintCount(prev => prev + 1);

        // Clear isNew after animation
        setTimeout(() => {
            setHints(prev =>
                prev.map(h => h.id === newHint.id ? { ...h, isNew: false } : h)
            );
        }, 2000);
    }, []);

    const latestHint = hints.length > 0 ? hints[hints.length - 1] : null;

    return {
        // Original fields
        hints,
        latestHint,
        hintsRemaining,
        limitReached,
        isLoading,
        error,
        getHint,
        hasHints: hints.length > 0,

        // Phase 2 fields
        currentHintLevel,
        hintsRemainingForStep,
        stepProgress,

        // Phase 5 fields
        consumeAutoHint,    // ← Wire this into useTerminal
        autoHintCount,      // ← How many hints were auto-pushed this session
    };
};