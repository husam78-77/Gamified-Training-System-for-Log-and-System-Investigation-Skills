/**
 * reviewEngine.js
 * AI Review (Phase 9).
 *
 * Grades a submitted investigation using review.json's criteria against
 * the player's report, terminal history, and analytics. The AI evaluates;
 * it never controls gameplay, unlocks objectives, or unlocks discoveries
 * (dev rule #17) — this runs only after a session has been submitted.
 *
 * Criteria, weights, and required flags come entirely from the incident's
 * review.json — nothing here is scenario-specific (dev rule #18).
 */

const { loadIncidentContent } = require('../environment/environmentEngine');
const { buildReviewPrompt } = require('../../constants/promptConstants');
const aiAdapter = require('../aiAdapter');
const investigationReviewModel = require('../../models/investigationReviewModel');

/**
 * @param {string} incidentId
 * @returns {Promise<Object>} review.json contents
 */
const getReviewConfig = async (incidentId) => loadIncidentContent(incidentId, 'review.json');

/**
 * Ask the AI to grade the submission, compute the weighted total score
 * server-side (never trust the model's own arithmetic), and persist it.
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {string} params.incidentId
 * @param {string} params.scenarioTitle
 * @param {string} params.missionBrief
 * @param {string} params.reportContent
 * @param {string[]} params.terminalCommands
 * @param {Object} params.analytics
 * @returns {Promise<Object>} the persisted review row
 */
const reviewSubmission = async ({
    sessionId,
    incidentId,
    scenarioTitle,
    missionBrief,
    reportContent,
    terminalCommands,
    analytics,
}) => {
    const reviewConfig = await getReviewConfig(incidentId);
    const criteria = reviewConfig.criteria || [];
    const maxScore = reviewConfig.grading?.maxScore ?? 100;

    const prompt = buildReviewPrompt({
        scenarioTitle,
        missionBrief,
        criteria,
        reportContent,
        terminalCommands,
        analytics,
    });

    const raw = await aiAdapter.generate(prompt, { maxTokens: 900, temperature: 0.3 });
    const parsed = parseReviewResponse(raw, criteria);

    const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0) || 100;
    const weightedScore = parsed.criteria.reduce((sum, entry) => {
        const criterion = criteria.find(c => c.id === entry.id);
        if (!criterion) return sum;
        return sum + (entry.score / 100) * criterion.weight;
    }, 0);
    const score = Math.round((weightedScore / totalWeight) * maxScore);

    const saved = await investigationReviewModel.saveReview({
        sessionId,
        score: Math.max(0, Math.min(maxScore, score)),
        criteriaScores: parsed.criteria,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        feedback: parsed.feedback,
    });

    return saved;
};

/**
 * Parse the AI's JSON response defensively. Strips markdown code fences if
 * present, and falls back to a neutral zero-scored review with a warning
 * if the response isn't valid JSON — a malformed AI response must never
 * crash a submission.
 */
const parseReviewResponse = (raw, criteria) => {
    try {
        const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
            criteria: Array.isArray(parsed.criteria) ? parsed.criteria : [],
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
            feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
        };
    } catch (err) {
        console.error('[reviewEngine] Failed to parse AI review response:', err.message, '\nRaw:', raw);
        return {
            criteria: criteria.map(c => ({ id: c.id, score: 0, comment: 'Unable to evaluate — AI response was malformed.' })),
            strengths: [],
            weaknesses: ['The AI review could not be generated. Please contact your instructor.'],
            feedback: 'This submission could not be automatically reviewed. Please contact your instructor.',
        };
    }
};

/**
 * @param {number} sessionId
 * @returns {Promise<Object|null>}
 */
const getReview = async (sessionId) => investigationReviewModel.getReview(sessionId);

module.exports = {
    getReviewConfig,
    reviewSubmission,
    getReview,
};
