/**
 * investigationReviewModel.js
 * Persistence for AI Review results (Phase 9). One row per session.
 */

const pool = require('../config/db');

/**
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {number} params.score
 * @param {Array}  params.criteriaScores
 * @param {Array}  params.strengths
 * @param {Array}  params.weaknesses
 * @param {string} params.feedback
 */
const saveReview = async ({ sessionId, score, criteriaScores, strengths, weaknesses, feedback }) => {
    const result = await pool.query(
        `INSERT INTO investigation_reviews
            (session_id, score, criteria_scores, strengths, weaknesses, feedback, reviewed_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (session_id) DO UPDATE SET
            score = EXCLUDED.score,
            criteria_scores = EXCLUDED.criteria_scores,
            strengths = EXCLUDED.strengths,
            weaknesses = EXCLUDED.weaknesses,
            feedback = EXCLUDED.feedback,
            reviewed_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
            sessionId,
            score,
            JSON.stringify(criteriaScores),
            JSON.stringify(strengths),
            JSON.stringify(weaknesses),
            feedback,
        ]
    );
    return result.rows[0];
};

/**
 * @param {number} sessionId
 * @returns {Promise<Object|null>}
 */
const getReview = async (sessionId) => {
    const result = await pool.query(
        `SELECT * FROM investigation_reviews WHERE session_id = $1`,
        [sessionId]
    );
    return result.rows[0] || null;
};

module.exports = {
    saveReview,
    getReview,
};
