/**
 * useSession.js
 * Manages the full lifecycle of a gameplay session.
 *
 * Responsibilities:
 * - Start or resume a session on GamingEnvironment mount
 * - Track session state (id, mode, status, start time)
 * - Handle timed mode countdown
 * - Expose abandon() and complete() actions
 * - Return evaluation summary after completion
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { startSession, abandonSession, completeSession } from '../services/sessionService';

/**
 * @param {number} scenarioId  - From route state
 * @param {string} mode        - 'timed' | 'free'
 * @param {string} token       - JWT from useAuth()
 */
export const useSession = (scenarioId, mode, token) => {
    const [sessionId, setSessionId] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | loading | in_progress | completed | abandoned | error
    const [error, setError] = useState(null);
    const [evaluation, setEvaluation] = useState(null);  // Set after completeSession
    const [timeRemaining, setTimeRemaining] = useState(null); // Seconds, timed mode only

    // Timed mode: 15 minutes default, configurable via env
    const TIMED_DURATION_SECONDS = parseInt(import.meta.env.VITE_TIMED_DURATION || '900', 10);

    const timerRef = useRef(null);
    const sessionRef = useRef(null); // Keep sessionId accessible inside timer closure

    // ── Boot: start or resume session on mount ────────────────────────────
    useEffect(() => {
        if (!scenarioId || !mode || !token) return;

        const boot = async () => {
            setStatus('loading');
            setError(null);
            try {
                const data = await startSession(scenarioId, mode, token);
                const session = data.session;

                setSessionId(session.session_id);
                sessionRef.current = session.session_id;
                setStatus('in_progress');

                // Start timer if timed mode
                if (mode === 'timed') {
                    // If resuming, calculate remaining time from start_time
                    const elapsed = Math.floor(
                        (Date.now() - new Date(session.start_time).getTime()) / 1000
                    );
                    const remaining = Math.max(0, TIMED_DURATION_SECONDS - elapsed);
                    setTimeRemaining(remaining);
                }
            } catch (err) {
                setError(err.message);
                setStatus('error');
            }
        };

        boot();

        // Cleanup timer on unmount
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [scenarioId, mode, token]);

    // ── Timed mode countdown ──────────────────────────────────────────────
    useEffect(() => {
        if (mode !== 'timed' || timeRemaining === null || status !== 'in_progress') return;

        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    // Time's up — auto-complete session
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [mode, timeRemaining === null, status]); // Only restart if mode/null-state/status changes

    const handleTimeUp = useCallback(async () => {
        if (!sessionRef.current || !token) return;
        setStatus('loading');
        try {
            const data = await completeSession(sessionRef.current, token);
            setEvaluation(data);
            setStatus('completed');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    }, [token]);

    // ── abandon() — timed mode early exit ────────────────────────────────
    const abandon = useCallback(async () => {
        if (!sessionId || !token) return;
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus('loading');
        try {
            await abandonSession(sessionId, token);
            setStatus('abandoned');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    }, [sessionId, token]);

    // ── complete() — manual mission end ──────────────────────────────────
    const complete = useCallback(async () => {
        if (!sessionId || !token) return;
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus('loading');
        try {
            const data = await completeSession(sessionId, token);
            setEvaluation(data);
            setStatus('completed');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    }, [sessionId, token]);

    // ── Format time for TimerDisplay component ────────────────────────────
    const formattedTime = formatTime(timeRemaining);

    return {
        sessionId,
        status,
        error,
        evaluation,
        timeRemaining,
        formattedTime,
        isLoading: status === 'loading',
        isActive: status === 'in_progress',
        isCompleted: status === 'completed',
        isAbandoned: status === 'abandoned',
        abandon,
        complete,
    };
};

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Format seconds into MM:SS string for display.
 * Returns null if timeRemaining is null (free mode).
 */
const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return null;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};