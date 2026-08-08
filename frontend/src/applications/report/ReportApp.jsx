import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getReport, saveReport, submitInvestigation } from '../../services/investigationService';
import './styles/report-app.css';

/**
 * ReportApp.jsx
 * Phase 4/8/9 — the Investigation Report editor, and the entry point to
 * Submission + AI Review.
 *
 * The report is a normal virtual file under the hood (Terminal `cat`/File
 * Manager show the same saved content via the Environment Engine overlay
 * — see reportEngine.js) but this window is where the player actually
 * writes and submits it.
 */
const ReportApp = () => {
    const navigate = useNavigate();
    const { token } = useAuth();

    const [content, setContent] = useState('');
    const [path, setPath] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
    const [unlockedDiscovery, setUnlockedDiscovery] = useState(null);

    const [submitState, setSubmitState] = useState('idle'); // idle | confirming | submitting | error
    const [submitError, setSubmitError] = useState(null);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;

        getReport(token)
            .then((data) => {
                if (cancelled) return;
                setContent(data.content || '');
                setPath(data.path || '');
            })
            .catch((err) => !cancelled && setError(err.message))
            .finally(() => !cancelled && setLoading(false));

        return () => { cancelled = true; };
    }, [token]);

    const handleSave = useCallback(async () => {
        setSaveState('saving');
        try {
            const data = await saveReport(content, token);
            setSaveState('saved');
            if (data.unlockedDiscovery) setUnlockedDiscovery(data.unlockedDiscovery);
            setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2500);
        } catch (err) {
            setSaveState('error');
        }
    }, [content, token]);

    const handleSubmit = useCallback(async () => {
        setSubmitState('submitting');
        setSubmitError(null);
        try {
            const data = await submitInvestigation(token);
            setResult(data);
            setSubmitState('idle');
        } catch (err) {
            setSubmitError(err.message);
            setSubmitState('idle');
        }
    }, [token]);

    if (loading) return <div className="report-app__status">Loading report...</div>;
    if (error) return <div className="report-app__status report-app__status--error">Error: {error}</div>;

    // ── Post-submission: show the AI Review result ─────────────────────────
    if (result) {
        return <ReviewResult result={result} onReturnToDashboard={() => navigate('/mission')} />;
    }

    return (
        <div className="report-app">
            <div className="report-app__header">
                <span className="report-app__path">{path || '/home/investigator/investigation_report.txt'}</span>
                <span className={`report-app__save-state report-app__save-state--${saveState}`}>
                    {saveState === 'saving' && 'Saving…'}
                    {saveState === 'saved' && 'Saved ✓'}
                    {saveState === 'error' && 'Save failed'}
                </span>
            </div>

            {unlockedDiscovery && (
                <div className="report-app__banner">
                    [DISCOVERY] {unlockedDiscovery.title}
                </div>
            )}

            <textarea
                className="report-app__editor"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                placeholder="Write your investigation report here..."
            />

            <div className="report-app__footer">
                <button type="button" className="report-app__btn" onClick={handleSave} disabled={saveState === 'saving'}>
                    Save Report
                </button>
                <button
                    type="button"
                    className="report-app__btn report-app__btn--primary"
                    onClick={() => setSubmitState('confirming')}
                    disabled={submitState === 'submitting'}
                >
                    Submit Investigation
                </button>
            </div>

            {submitError && <div className="report-app__error">{submitError}</div>}

            {submitState === 'confirming' && (
                <div className="report-app__confirm">
                    <p>Submitting freezes this investigation — you won't be able to run more commands or edit the report afterward. Continue?</p>
                    <div className="report-app__confirm-actions">
                        <button type="button" className="report-app__btn" onClick={() => setSubmitState('idle')}>Cancel</button>
                        <button type="button" className="report-app__btn report-app__btn--primary" onClick={handleSubmit}>
                            Confirm Submission
                        </button>
                    </div>
                </div>
            )}

            {submitState === 'submitting' && <div className="report-app__status">Submitting for AI review…</div>}
        </div>
    );
};

/**
 * The AI Review result screen — score breakdown from review.json criteria,
 * strengths/weaknesses/feedback, XP awarded, and the mechanical evaluation.
 */
const ReviewResult = ({ result, onReturnToDashboard }) => {
    const { evaluation, xpAwarded, updatedUser, review } = result;

    return (
        <div className="report-app report-app--review">
            <h2 className="review__title">Investigation Submitted</h2>

            <div className="review__scores">
                <div className="review__score-card">
                    <span className="review__score-value">{review?.score ?? '—'}</span>
                    <span className="review__score-label">AI Review Score</span>
                </div>
                <div className="review__score-card">
                    <span className="review__score-value">{evaluation.totalWeightedScore}</span>
                    <span className="review__score-label">Investigation Score</span>
                </div>
                <div className="review__score-card">
                    <span className="review__score-value">+{xpAwarded}</span>
                    <span className="review__score-label">XP Awarded</span>
                </div>
            </div>

            {review?.criteria_scores?.length > 0 && (
                <div className="review__section">
                    <h3>Criteria Breakdown</h3>
                    <ul className="review__criteria">
                        {review.criteria_scores.map((c) => (
                            <li key={c.id}>
                                <span className="review__criteria-score">{c.score}</span>
                                <span className="review__criteria-comment">{c.comment}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {review?.strengths?.length > 0 && (
                <div className="review__section">
                    <h3>Strengths</h3>
                    <ul>{review.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
            )}

            {review?.weaknesses?.length > 0 && (
                <div className="review__section">
                    <h3>Weaknesses</h3>
                    <ul>{review.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
            )}

            {review?.feedback && (
                <div className="review__section review__feedback">
                    <h3>ARIA's Assessment</h3>
                    <p>{review.feedback}</p>
                </div>
            )}

            <div className="review__meta">
                Level {updatedUser?.level} · {updatedUser?.xp} XP total
            </div>

            <button type="button" className="report-app__btn report-app__btn--primary" onClick={onReturnToDashboard}>
                Return to Mission Dashboard
            </button>
        </div>
    );
};

export default ReportApp;
