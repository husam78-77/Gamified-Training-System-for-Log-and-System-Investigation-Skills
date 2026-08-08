/**
 * hintController.js
 * ARIA's hint endpoint (Phase 7).
 *
 * Hints are resolved from Discoveries, Objectives and command_history
 * (Investigation Events' raw material) — never from a hardcoded
 * expected-command answer key (development_rules.md #14).
 *
 * Routes served:
 *   POST /api/hints/request        → requestHint
 *   GET  /api/hints/:sessionId     → getHintLog
 */

const hintModel = require('../models/hintModel');
const sessionModel = require('../models/sessionModel');
const scenarioModel = require('../models/scenarioModel');
const terminalModel = require('../models/terminalModel');
const investigationDiscoveryModel = require('../models/investigationDiscoveryModel');
const discoveryEngine = require('../services/investigation/discoveryEngine');
const objectiveEngine = require('../services/investigation/objectiveEngine');
const hintLevelService = require('../services/hintLevelService');
const hintCacheService = require('../services/hintCacheService');
const { resolveIncidentId } = require('../services/environment/incidentResolver');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

const MAX_HINTS_PER_SESSION = 5;

// =============================================================================
// POST /api/hints/request
// =============================================================================

const requestHint = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { session_id } = req.body;

        if (!session_id) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const sessionId = parseInt(session_id, 10);

        // ── Validate session ─────────────────────────────────────────────
        const session = await sessionModel.getSessionById(sessionId, userId);
        if (!session) {
            return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
        }
        if (session.status !== 'in_progress') {
            return response.error(res, 400, MESSAGES.SESSION_ALREADY_CLOSED);
        }

        // ── Session-level hint cap ────────────────────────────────────────
        const hintsUsed = await hintModel.countHintsUsed(sessionId);
        if (hintsUsed >= MAX_HINTS_PER_SESSION) {
            return response.error(res, 429, MESSAGES.HINT_LIMIT_REACHED);
        }

        // ── Load content + progress ───────────────────────────────────────
        const scenario = await scenarioModel.getScenarioById(session.scenario_id);
        const incidentId = resolveIncidentId(scenario.type);

        const [discoveries, objectives, unlockedKeys, commandHistory, previousHintRows] = await Promise.all([
            discoveryEngine.getDiscoveries(incidentId),
            objectiveEngine.getObjectives(incidentId),
            investigationDiscoveryModel.getUnlockedKeys(sessionId),
            terminalModel.getCommandHistory(sessionId),
            hintModel.getHintsBySession(sessionId),
        ]);

        const previousHints = previousHintRows.map(h => h.hint_returned);
        const completedObjectiveIds = objectiveEngine.resolveCompletedObjectives(objectives, unlockedKeys);
        const nextObjective = objectives.find(o => !completedObjectiveIds.includes(o.id));

        if (!nextObjective) {
            return response.error(res, 400, 'All objectives are already completed.');
        }

        const candidateCommands = discoveryEngine.getCandidateCommands(discoveries, nextObjective, unlockedKeys);

        // ── Resolve hint level for this objective ─────────────────────────
        const { hintLevel, hintCount } = await hintLevelService.resolveNextHintLevel({
            sessionId,
            scenarioId: session.scenario_id,
            objectiveId: nextObjective.id,
        });

        // ── Cache-first hint resolution ───────────────────────────────────
        const { hint, prompt, triggerCommands, playerState, cacheHit, cacheId } =
            await hintCacheService.resolveHint({
                scenarioId: session.scenario_id,
                objectiveId: nextObjective.id,
                hintLevel,
                commandHistory,
                candidateCommands,
                nextObjective,
                completedCount: completedObjectiveIds.length,
                totalCount: objectives.length,
                previousHints,
                scenarioTitle: scenario.title,
                missionBrief: scenario.mission_brief,
                sessionStartTime: session.start_time,
            });

        // ── Save hint log ──────────────────────────────────────────────────
        await hintModel.saveHint({
            sessionId,
            triggerCommands,
            promptSent: prompt,
            hintReturned: hint,
            scenarioId: session.scenario_id,
            stepOrder: nextObjective.id,
            hintLevel,
            playerState,
            cacheHit,
        });

        // ── Update session player state summary ────────────────────────────
        await hintModel.upsertSessionPlayerState({
            sessionId,
            scenarioId: session.scenario_id,
            playerState,
            hintsUsed: hintsUsed + 1,
        });

        console.log('[HintEngine] Phase7:', {
            sessionId,
            objectiveId: nextObjective.id,
            hintLevel,
            cacheHit,
            cacheId: cacheId || 'n/a',
            stuckScore: playerState.stuckScore,
            behaviorType: playerState.behaviorType,
        });

        // ── Response ──────────────────────────────────────────────────────
        const hintsRemainingForStep = Math.max(0, hintLevelService.MAX_HINT_LEVEL - hintCount);

        return response.success(res, 200, MESSAGES.HINT_GENERATED, {
            hint,
            hintsRemaining: MAX_HINTS_PER_SESSION - (hintsUsed + 1),
            hintLevel,
            hintsRemainingForStep,
            cacheHit,
        });

    } catch (err) {
        console.error('requestHint error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

// =============================================================================
// GET /api/hints/:sessionId
// =============================================================================

const getHintLog = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const sessionId = parseInt(req.params.sessionId, 10);

        if (isNaN(sessionId)) {
            return response.error(res, 400, MESSAGES.INVALID_INPUT);
        }

        const session = await sessionModel.getSessionById(sessionId, userId);
        if (!session) {
            return response.error(res, 404, MESSAGES.SESSION_NOT_FOUND);
        }

        const hints = await hintModel.getHintsBySession(sessionId);
        const hintsUsed = hints.length;
        const stepProgress = await hintLevelService.getAllStepProgress(sessionId);

        return response.success(res, 200, MESSAGES.HINT_LOG_FETCHED, {
            hints,
            hintsRemaining: Math.max(0, MAX_HINTS_PER_SESSION - hintsUsed),
            stepProgress,
        });

    } catch (err) {
        console.error('getHintLog error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = {
    requestHint,
    getHintLog,
};
