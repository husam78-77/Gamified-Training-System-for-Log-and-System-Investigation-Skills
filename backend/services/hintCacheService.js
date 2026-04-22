/**
 * hintCacheService.js  ← backend/services/hintCacheService.js
 * Phase 5 — Passes isAutoTriggered flag through to hintService
 *
 * CHANGES FROM PHASE 3:
 *   1. resolveHint() accepts optional isAutoTriggered parameter
 *   2. Passes it into hintService.generateHint() on cache miss
 *   3. Cache hit path still skips AI — isAutoTriggered doesn't affect
 *      cache lookup, only prompt generation on miss
 *   4. Everything else identical to Phase 3
 *
 * NOTE ON CACHE BEHAVIOR WITH isAutoTriggered:
 *   Cache key is still (scenario_id, step_order, hint_level).
 *   Auto-triggered and manually-requested hints for the same key
 *   share the same cache entry. This is intentional — the hint text
 *   is identical regardless of how it was triggered. The auto-trigger
 *   intro phrase is generated at the prompt level, not stored in cache.
 *   If you want separate cache entries for auto vs manual, change the
 *   cache key to include a trigger_type column — but this is not recommended
 *   as it doubles cache population time.
 *
 * Path: backend/services/hintCacheService.js
 */

const hintService = require('./hintService');
const hintCacheModel = require('../models/hintCacheModel');

/**
 * Resolve a hint using cache-first strategy.
 *
 * @param {Object}  params
 * @param {number}  params.scenarioId
 * @param {number}  params.stepOrder
 * @param {number}  params.hintLevel
 * @param {Array}   params.commandHistory
 * @param {Array}   params.expectedSteps
 * @param {Array}   params.completedStepOrders
 * @param {Array}   params.previousHints
 * @param {string}  params.scenarioTitle
 * @param {string}  params.missionBrief
 * @param {Date}    params.sessionStartTime
 * @param {boolean} [params.isAutoTriggered=false]  ← Phase 5
 *
 * @returns {Promise<{
 *   hint: string,
 *   prompt: string,
 *   triggerCommands: string,
 *   playerState: Object,
 *   cacheHit: boolean,
 *   cacheId: number|null,
 * }>}
 */
const resolveHint = async ({
    scenarioId,
    stepOrder,
    hintLevel,
    commandHistory,
    expectedSteps,
    completedStepOrders,
    previousHints,
    scenarioTitle,
    missionBrief,
    sessionStartTime,
    isAutoTriggered = false,   // Phase 5
}) => {
    // ── Step 1: Cache check ───────────────────────────────────────────────
    const cached = await hintCacheModel.getCachedHint({ scenarioId, stepOrder, hintLevel });

    if (cached) {
        // Cache hit — still run analyzer for logging, skip AI
        hintCacheModel.incrementCacheHitCount(cached.cache_id).catch(err => {
            console.error('[HintCache] Failed to increment hit count:', err.message);
        });

        const { analyzePlayerState } = require('./playerStateAnalyzer');
        const nextStep = expectedSteps.find(s => !completedStepOrders.includes(s.step_order));
        const playerState = analyzePlayerState({
            commandHistory,
            nextStep,
            completedStepOrders,
            totalSteps: expectedSteps.length,
            sessionStartTime,
        });

        const recentCommands = commandHistory.slice(-5).map(c => c.command_entered).join(', ');

        console.log('[HintCache] CACHE HIT:', {
            scenarioId, stepOrder, hintLevel,
            cacheId: cached.cache_id,
            timesServed: cached.generated_count,
            isAutoTriggered,
        });

        return {
            hint: cached.hint_text,
            prompt: '[CACHE HIT — no prompt sent]',
            triggerCommands: recentCommands,
            playerState,
            cacheHit: true,
            cacheId: cached.cache_id,
        };
    }

    // ── Step 2: Cache miss — generate via AI ─────────────────────────────
    console.log('[HintCache] CACHE MISS — calling AI:', {
        scenarioId, stepOrder, hintLevel, isAutoTriggered,
    });

    const { prompt, hint, triggerCommands, playerState } = await hintService.generateHint({
        commandHistory,
        expectedSteps,
        completedStepOrders,
        previousHints,
        scenarioTitle,
        missionBrief,
        sessionStartTime,
        hintLevel,
        isAutoTriggered,   // Phase 5: passed to prompt builder
    });

    // ── Step 3: Store in cache (fire and forget) ─────────────────────────
    hintCacheModel.storeCachedHint({
        scenarioId, stepOrder, hintLevel,
        hintText: hint,
        promptUsed: prompt,
    }).catch(err => {
        console.error('[HintCache] Failed to store hint in cache:', err.message);
    });

    return {
        hint, prompt, triggerCommands, playerState,
        cacheHit: false,
        cacheId: null,
    };
};

module.exports = { resolveHint };