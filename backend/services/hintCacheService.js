/**
 * hintCacheService.js
 * Phase 7 — cache key is now (scenario_id, objective_id, hint_level)
 * instead of (scenario_id, step_order, hint_level). Cache-first strategy
 * and behavior are otherwise unchanged from the original design.
 */

const hintService = require('./hintService');
const hintCacheModel = require('../models/hintCacheModel');
const { analyzePlayerState } = require('./playerStateAnalyzer');

/**
 * Resolve a hint using cache-first strategy.
 *
 * @param {Object}   params
 * @param {number}   params.scenarioId
 * @param {string}   params.objectiveId
 * @param {number}   params.hintLevel
 * @param {Array}    params.commandHistory
 * @param {string[]} params.candidateCommands
 * @param {Object}   params.nextObjective
 * @param {number}   params.completedCount
 * @param {number}   params.totalCount
 * @param {Array}    params.previousHints
 * @param {string}   params.scenarioTitle
 * @param {string}   params.missionBrief
 * @param {Date}     params.sessionStartTime
 * @param {boolean}  [params.isAutoTriggered=false]
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
    objectiveId,
    hintLevel,
    commandHistory,
    candidateCommands,
    nextObjective,
    completedCount,
    totalCount,
    previousHints,
    scenarioTitle,
    missionBrief,
    sessionStartTime,
    isAutoTriggered = false,
}) => {
    // ── Step 1: Cache check ───────────────────────────────────────────────
    const cached = await hintCacheModel.getCachedHint({ scenarioId, objectiveId, hintLevel });

    if (cached) {
        hintCacheModel.incrementCacheHitCount(cached.cache_id).catch(err => {
            console.error('[HintCache] Failed to increment hit count:', err.message);
        });

        const playerState = analyzePlayerState({
            commandHistory,
            candidateCommands,
            completedCount,
            totalCount,
            sessionStartTime,
        });

        const recentCommands = commandHistory.slice(-5).map(c => c.command_entered).join(', ');

        console.log('[HintCache] CACHE HIT:', {
            scenarioId, objectiveId, hintLevel,
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
    console.log('[HintCache] CACHE MISS — calling AI:', { scenarioId, objectiveId, hintLevel, isAutoTriggered });

    const { prompt, hint, triggerCommands, playerState } = await hintService.generateHint({
        commandHistory,
        candidateCommands,
        nextObjective,
        completedCount,
        totalCount,
        previousHints,
        scenarioTitle,
        missionBrief,
        sessionStartTime,
        hintLevel,
        isAutoTriggered,
    });

    // ── Step 3: Store in cache (fire and forget) ─────────────────────────
    hintCacheModel.storeCachedHint({
        scenarioId, objectiveId, hintLevel,
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
