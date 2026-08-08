/**
 * submissionEngine.js
 * Submission workflow (Phase 8).
 *
 * The player submits their Investigation Report and Terminal History.
 * Submission freezes the session (dev rule), computes the mechanical
 * completion score (evidence found, command efficiency, objectives,
 * hints), awards XP/badges through the existing progression system, and
 * immediately runs the AI Review (Phase 9) against review.json.
 */

const sessionModel = require('../../models/sessionModel');
const scenarioModel = require('../../models/scenarioModel');
const terminalModel = require('../../models/terminalModel');
const hintModel = require('../../models/hintModel');
const progressionModel = require('../../models/progressionModel');
const investigationDiscoveryModel = require('../../models/investigationDiscoveryModel');
const evaluationService = require('../evaluationService');
const discoveryEngine = require('./discoveryEngine');
const objectiveEngine = require('./objectiveEngine');
const reportEngine = require('./reportEngine');
const reviewEngine = require('./reviewEngine');
const analyticsEngine = require('./analyticsEngine');
const eventEngine = require('./eventEngine');
const { resolveIncidentId } = require('../environment/incidentResolver');

class SubmissionError extends Error {
    constructor(code, message) {
        super(message || code);
        this.name = 'SubmissionError';
        this.code = code;
    }
}

const MIN_REPORT_LENGTH = 50;
const isReportSubstantive = (content) => (content || '').trim().length >= MIN_REPORT_LENGTH;

/**
 * Submit an investigation for grading.
 *
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {number} params.userId
 * @returns {Promise<{ session, evaluation, xpAwarded, updatedUser, analytics, review }>}
 */
const submitInvestigation = async ({ sessionId, userId }) => {
    const session = await sessionModel.getSessionById(sessionId, userId);
    if (!session) throw new SubmissionError('SESSION_NOT_FOUND');
    if (session.status !== 'in_progress') throw new SubmissionError('SESSION_ALREADY_CLOSED');

    const scenario = await scenarioModel.getScenarioById(session.scenario_id);
    const incidentId = resolveIncidentId(scenario.type);

    const [reviewConfig, report, commandHistory, discoveries, objectives] = await Promise.all([
        reviewEngine.getReviewConfig(incidentId),
        reportEngine.getReport(sessionId, incidentId),
        terminalModel.getCommandHistory(sessionId),
        discoveryEngine.getDiscoveries(incidentId),
        objectiveEngine.getObjectives(incidentId),
    ]);

    // ── Validate submission requirements (dev-defined per incident) ────────
    const submissionRules = reviewConfig.submission || {};
    if (submissionRules.requiresReport && !isReportSubstantive(report.content)) {
        throw new SubmissionError('REPORT_INCOMPLETE');
    }
    if (submissionRules.requiresTerminalHistory && commandHistory.length === 0) {
        throw new SubmissionError('TERMINAL_HISTORY_EMPTY');
    }

    await eventEngine.logEvent(sessionId, eventEngine.EVENT_TYPES.REPORT_SUBMITTED, {});

    // ── Mechanical completion score ─────────────────────────────────────────
    const unlockedKeys = await investigationDiscoveryModel.getUnlockedKeys(sessionId);
    const completedObjectiveIds = objectiveEngine.resolveCompletedObjectives(objectives, unlockedKeys);
    const hintsUsed = await hintModel.countHintsUsed(sessionId);

    const scoreResult = evaluationService.calculateContentScore({
        discoveries,
        unlockedKeys,
        objectives,
        completedObjectiveIds,
        totalCommandsCount: commandHistory.length,
        hintsUsed,
    });

    // ── Freeze the session ───────────────────────────────────────────────────
    const closedSession = await sessionModel.submitSession({
        sessionId,
        finalScore: scoreResult.totalWeightedScore,
    });

    // ── Progression: single authority is progressionModel ──────────────────
    await progressionModel.upsertUserProgress({
        userId,
        scenarioId: session.scenario_id,
        score: scoreResult.totalWeightedScore,
        completed: objectives.length > 0 && completedObjectiveIds.length === objectives.length,
    });

    const xpAwarded = evaluationService.calculateXp(scoreResult.totalWeightedScore, scenario.difficulty, hintsUsed);
    const updatedUser = await progressionModel.addXpToUser(userId, xpAwarded);

    if (scoreResult.totalWeightedScore >= 60) {
        await progressionModel.awardBadge({
            userId,
            scenarioId: session.scenario_id,
            badgeName: `${scenario.title}_COMPLETE`,
            badgeType: 'completion',
        });
    }

    await eventEngine.logEvent(sessionId, eventEngine.EVENT_TYPES.SESSION_FINISHED, {});

    // ── Analytics + AI Review ────────────────────────────────────────────────
    const analytics = await analyticsEngine.buildAnalytics({
        sessionId, session: closedSession, discoveries, objectives,
    });

    const review = await reviewEngine.reviewSubmission({
        sessionId,
        incidentId,
        scenarioTitle: scenario.title,
        missionBrief: scenario.mission_brief,
        reportContent: report.content,
        terminalCommands: commandHistory.map(c => c.command_entered),
        analytics,
    });

    const nextScenario = await progressionModel.getNextScenarioForUser(userId);

    return {
        session: closedSession,
        evaluation: scoreResult,
        xpAwarded,
        updatedUser,
        analytics,
        review,
        nextScenario,
    };
};

module.exports = {
    submitInvestigation,
    SubmissionError,
};
