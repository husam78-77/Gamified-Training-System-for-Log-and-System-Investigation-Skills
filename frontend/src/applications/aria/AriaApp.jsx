import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInvestigation } from '../../context/InvestigationContext';
import { requestHint, fetchHintLog } from '../../services/hintService';
import './styles/aria-app.css';

/**
 * AriaApp.jsx
 * Phase 7 — ARIA's hint interface. Hints are resolved server-side from
 * Discoveries/Objectives/command history (see hintController.js); this
 * component only requests one and renders the log — it holds no gameplay
 * logic of its own.
 */
const AriaApp = () => {
    const { token } = useAuth();
    const { investigation } = useInvestigation();
    const sessionId = investigation?.sessionId;

    const [hints, setHints] = useState([]);
    const [hintsRemaining, setHintsRemaining] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [error, setError] = useState(null);
    const logRef = useRef(null);

    useEffect(() => {
        if (!sessionId || !token) return;
        let cancelled = false;

        fetchHintLog(sessionId, token)
            .then((data) => {
                if (cancelled) return;
                setHints(data.hints || []);
                setHintsRemaining(data.hintsRemaining);
            })
            .catch(() => { })
            .finally(() => !cancelled && setLoading(false));

        return () => { cancelled = true; };
    }, [sessionId, token]);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [hints]);

    const handleRequestHint = useCallback(async () => {
        if (!sessionId) return;
        setRequesting(true);
        setError(null);
        try {
            const data = await requestHint(sessionId, token);
            setHints((prev) => [...prev, {
                hint_returned: data.hint,
                hint_level: data.hintLevel,
                timestamp: new Date().toISOString(),
            }]);
            setHintsRemaining(data.hintsRemaining);
        } catch (err) {
            if (err.limitReached) {
                setHintsRemaining(0);
                setError('You have used all available hints for this investigation.');
            } else {
                setError(err.message);
            }
        } finally {
            setRequesting(false);
        }
    }, [sessionId, token]);

    if (loading) return <div className="aria-app__status">Establishing uplink…</div>;

    const disabled = requesting || hintsRemaining === 0 || !sessionId;

    return (
        <div className="aria-app">
            <div className="aria-app__header">
                <span className="aria-app__id">ARIA — Adaptive Response Intelligence Assistant</span>
                {hintsRemaining !== null && (
                    <span className="aria-app__remaining">{hintsRemaining} hint{hintsRemaining === 1 ? '' : 's'} remaining</span>
                )}
            </div>

            <div className="aria-app__log" ref={logRef}>
                {hints.length === 0 && (
                    <div className="aria-app__empty">No transmissions yet. Request guidance when you're stuck — ARIA responds to your discoveries so far, never with direct answers.</div>
                )}
                {hints.map((h, i) => (
                    <div className="aria-app__message" key={i}>
                        <div className="aria-app__message-meta">LEVEL {h.hint_level || 1}</div>
                        <div className="aria-app__message-text">{h.hint_returned}</div>
                    </div>
                ))}
            </div>

            {error && <div className="aria-app__error">{error}</div>}

            <div className="aria-app__footer">
                <button
                    type="button"
                    className="aria-app__btn"
                    onClick={handleRequestHint}
                    disabled={disabled}
                >
                    {requesting ? 'Analyzing…' : 'Request Guidance'}
                </button>
            </div>
        </div>
    );
};

export default AriaApp;
