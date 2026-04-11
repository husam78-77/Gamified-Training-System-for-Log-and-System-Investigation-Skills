/**
 * useHint.js
 * Manages the AI hint system during an active session.
 *
 * Responsibilities:
 * - Request a new hint from the AI
 * - Track hint log (all hints this session)
 * - Track hints remaining count
 * - Handle limit-reached state gracefully
 * - Restore hint log on page refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { requestHint, fetchHintLog } from '../services/hintService';

const MAX_HINTS = 5;

/**
 * @param {number} sessionId  - Active session ID
 * @param {string} token      - JWT from useAuth()
 */
export const useHint = (sessionId, token) => {
    const [hints, setHints] = useState([]);    // All hints this session
    const [hintsRemaining, setHintsRemaining] = useState(MAX_HINTS);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [limitReached, setLimitReached] = useState(false);

    // ── Restore hint log on mount (page refresh recovery) ────────────────
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
                    })));
                    setHintsRemaining(data.hintsRemaining);
                    if (data.hintsRemaining === 0) setLimitReached(true);
                }
            } catch (_) {
                // Silently ignore — fresh hint panel is fine
            }
        };

        restore();
    }, [sessionId, token]);

    // ── Request a new hint ────────────────────────────────────────────────
    const getHint = useCallback(async () => {
        if (!sessionId || !token) return;
        if (limitReached || hintsRemaining <= 0) {
            setLimitReached(true);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await requestHint(sessionId, token);

            const newHint = {
                id: Date.now(), // Temp ID until page refresh restores from DB
                text: data.hint,
                timestamp: new Date().toISOString(),
                isNew: true,   // Flag for animation in HintPanel
            };

            setHints(prev => [...prev, newHint]);
            setHintsRemaining(data.hintsRemaining);

            if (data.hintsRemaining === 0) setLimitReached(true);

            // Clear isNew flag after animation
            setTimeout(() => {
                setHints(prev =>
                    prev.map(h => h.id === newHint.id ? { ...h, isNew: false } : h)
                );
            }, 2000);

        } catch (err) {
            if (err.limitReached) {
                setLimitReached(true);
                setHintsRemaining(0);
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, token, limitReached, hintsRemaining]);

    // ── Latest hint (most recent) for quick display ───────────────────────
    const latestHint = hints.length > 0 ? hints[hints.length - 1] : null;

    return {
        hints,
        latestHint,
        hintsRemaining,
        limitReached,
        isLoading,
        error,
        getHint,
        hasHints: hints.length > 0,
    };
};