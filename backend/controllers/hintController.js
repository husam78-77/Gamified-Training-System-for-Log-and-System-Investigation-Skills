/**
 * hintController.js
 * Phase 3 — Uses cache-first hint resolution
 *
 * CHANGES FROM PHASE 2:
 *   1. Replaces direct hintService.generateHint() call
 *      with hintCacheService.resolveHint()
 *   2. Passes cacheHit flag into hintModel.saveHint()
 *      so ai_hint_log.cache_hit is correctly recorded
 *   3. Response now includes cacheHit (optional, useful for dev/admin)
 *   4. Everything else is identical to Phase 2
 *
 * FLOW:
 *   Request → validate → resolve level → resolveHint() →
 *     ├── cache hit  → return cached text, log cache_hit=true
 *     └── cache miss → AI generates → store in cache → log cache_hit=false
 *
 * API CONTRACT:
 *   Request:  POST /api/hints/request { session_id }   ← UNCHANGED
 *   Response: {
 *     hint: string,
 *     hintsRemaining: number,
 *     hintLevel: number,
 *     hintsRemainingForStep: number,
 *     cacheHit: boolean          ← NEW (Phase 3, useful for admin/debug)
 *   }
 *
 * Path: backend/controllers/hintController.js
 */

const hintModel = require('../models/hintModel');
const sessionModel = require('../models/sessionModel');
const scenarioModel = require('../models/scenarioModel');
const terminalModel = require('../models/terminalModel');
const hintLevelService = require('../services/hintLevelService');
const hintCacheService = require('../services/hintCacheService');  // Phase 3
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

        // ── Load data ─────────────────────────────────────────────────────
        const [commandHistory, expectedSteps, previousHintRows, scenario] = await Promise.all([
            terminalModel.getCommandHistory(sessionId),
            scenarioModel.getExpectedStepsByScenario(session.scenario_id),
            hintModel.getHintsBySession(sessionId),
            scenarioModel.getScenarioById(session.scenario_id),
        ]);

        const matchedHistory = await terminalModel.getMatchedCommands(sessionId);
        const completedStepOrders = matchedHistory.map(c => c.match_step_order);
        const previousHints = previousHintRows.map(h => h.hint_returned);

        // ── Derive next step (backend source of truth) ───────────────────
        const nextStep = expectedSteps.find(
            s => !completedStepOrders.includes(s.step_order)
        );
        if (!nextStep) {
            return response.error(res, 400, 'All steps are already completed.');
        }

        // ── Resolve hint level for this step (Phase 2) ───────────────────
        const { hintLevel, hintCount, stepLevelCapped } =
            await hintLevelService.resolveNextHintLevel({
                sessionId,
                scenarioId: session.scenario_id,
                stepOrder: nextStep.step_order,
            });

        // ── Phase 3: Cache-first hint resolution ─────────────────────────
        // Replaces direct hintService.generateHint() call from Phase 2.
        // hintCacheService checks cache first, only calls AI on miss.
        const { hint, prompt, triggerCommands, playerState, cacheHit, cacheId } =
            await hintCacheService.resolveHint({
                scenarioId: session.scenario_id,
                stepOrder: nextStep.step_order,
                hintLevel,
                commandHistory,
                expectedSteps,
                completedStepOrders,
                previousHints,
                scenarioTitle: scenario.title,
                missionBrief: scenario.mission_brief,
                sessionStartTime: session.start_time,
            });

        // ── Save hint log with cache_hit flag ────────────────────────────
        await hintModel.saveHint({
            sessionId,
            triggerCommands,
            promptSent: prompt,
            hintReturned: hint,
            scenarioId: session.scenario_id,
            stepOrder: nextStep.step_order,
            hintLevel,
            playerState,
            cacheHit,       // Phase 3: recorded in ai_hint_log.cache_hit
        });

        // ── Update session player state summary ──────────────────────────
        await hintModel.upsertSessionPlayerState({
            sessionId,
            scenarioId: session.scenario_id,
            playerState,
            hintsUsed: hintsUsed + 1,
        });

        // ── Observability ─────────────────────────────────────────────────
        console.log('[HintEngine] Phase3:', {
            sessionId,
            stepOrder: nextStep.step_order,
            hintLevel,
            cacheHit,
            cacheId: cacheId || 'n/a',
            stuckScore: playerState.stuckScore,
            behaviorType: playerState.behaviorType,
        });

        // ── Response ──────────────────────────────────────────────────────
        const hintsRemainingForStep = Math.max(
            0,
            hintLevelService.MAX_HINT_LEVEL - hintCount
        );

        return response.success(res, 200, MESSAGES.HINT_GENERATED, {
            hint,
            hintsRemaining: MAX_HINTS_PER_SESSION - (hintsUsed + 1),
            hintLevel,
            hintsRemainingForStep,
            cacheHit,               // Phase 3 addition
        });

    } catch (err) {
        console.error('requestHint error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

// =============================================================================
// GET /api/hints/:sessionId — Unchanged from Phase 2
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