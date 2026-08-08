/**
 * hintCacheModel.js
 * Phase 3 — All database operations for the hint_cache table.
 *
 * This model owns the hint_cache table exclusively.
 * No other model touches hint_cache.
 *
 * CACHE KEY: (scenario_id, step_order, hint_level)
 * One row per unique key. First user generates it, all future users reuse it.
 *
 * CONCURRENCY SAFETY:
 *   getCachedHint()  → simple SELECT, no lock needed
 *   storeCachedHint() → uses INSERT ... ON CONFLICT DO UPDATE
 *     If two users generate a hint for the same key simultaneously
 *     (race condition on first generation), one INSERT wins and the
 *     other hits the conflict clause and updates generated_count.
 *     Both users get valid hints. No duplicate rows. No crash.
 *
 * Path: backend/models/hintCacheModel.js
 */

const pool = require('../config/db');

// =============================================================================
// READ
// =============================================================================

/**
 * Look up a cached hint by the cache key.
 * Returns null if no cache entry exists for this key.
 * This is called on EVERY hint request — must be fast (covered by unique index).
 *
 * @param {Object} params
 * @param {number} params.scenarioId
 * @param {number} params.objectiveId
 * @param {number} params.hintLevel
 *
 * @returns {Promise<{ cache_id, hint_text, generated_count, is_approved } | null>}
 */
const getCachedHint = async ({ scenarioId, objectiveId, hintLevel }) => {
    const result = await pool.query(
        `SELECT
            cache_id,
            hint_text,
            generated_count,
            is_approved,
            first_generated_at
         FROM hint_cache
         WHERE scenario_id = $1
           AND step_order   = $2
           AND hint_level   = $3`,
        [scenarioId, objectiveId, hintLevel]
    );
    return result.rows[0] || null;
};

/**
 * Get all cached hints for a scenario (all steps, all levels).
 * Used by instructor dashboards and cache management tools.
 *
 * @param {number} scenarioId
 * @returns {Promise<Array>}
 */
const getCacheByScenario = async (scenarioId) => {
    const result = await pool.query(
        `SELECT
            cache_id,
            step_order,
            hint_level,
            hint_text,
            generated_count,
            first_generated_at,
            last_served_at,
            is_approved
         FROM hint_cache
         WHERE scenario_id = $1
         ORDER BY step_order ASC, hint_level ASC`,
        [scenarioId]
    );
    return result.rows;
};

// =============================================================================
// WRITE
// =============================================================================

/**
 * Store a newly generated hint in the cache.
 *
 * Uses INSERT ... ON CONFLICT to handle the race condition where two users
 * simultaneously generate a hint for the same key. The first writer wins.
 * The second writer hits DO NOTHING (hint_text stays as the first version).
 * generated_count is NOT incremented here — only on cache hits via
 * incrementCacheHitCount(). The initial count starts at 1 (set in INSERT).
 *
 * Returns the stored row (either freshly inserted or existing on conflict).
 *
 * @param {Object} params
 * @param {number} params.scenarioId
 * @param {number} params.objectiveId
 * @param {number} params.hintLevel
 * @param {string} params.hintText    - The generated hint to cache
 * @param {string} params.promptUsed  - The prompt that generated it (for debugging)
 *
 * @returns {Promise<Object>} - The hint_cache row
 */
const storeCachedHint = async ({ scenarioId, objectiveId, hintLevel, hintText, promptUsed }) => {
    const result = await pool.query(
        `INSERT INTO hint_cache (
            scenario_id,
            step_order,
            hint_level,
            hint_text,
            prompt_used,
            generated_count,
            first_generated_at,
            last_served_at
        ) VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (scenario_id, step_order, hint_level)
        DO NOTHING
        RETURNING *`,
        [scenarioId, objectiveId, hintLevel, hintText, promptUsed || null]
    );

    // If DO NOTHING fired (race condition), fetch the existing row
    if (result.rows.length === 0) {
        return await getCachedHint({ scenarioId, objectiveId, hintLevel });
    }

    return result.rows[0];
};

/**
 * Increment the generated_count and update last_served_at for a cache entry.
 * Called every time a cache hit occurs (i.e. hint is served without AI call).
 *
 * This is a fire-and-forget operation — we don't await it in the hot path.
 * If it fails, it's a metrics miss, not a user-facing error.
 *
 * @param {number} cacheId - The hint_cache.cache_id to increment
 */
const incrementCacheHitCount = async (cacheId) => {
    await pool.query(
        `UPDATE hint_cache
         SET generated_count = generated_count + 1,
             last_served_at  = CURRENT_TIMESTAMP
         WHERE cache_id = $1`,
        [cacheId]
    );
};

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Invalidate (delete) a cached hint by cache key.
 * Used when an instructor flags a hint as bad and wants it regenerated.
 * The next user to request this step+level will trigger fresh AI generation.
 *
 * @param {Object} params
 * @param {number} params.scenarioId
 * @param {number} params.objectiveId
 * @param {number} params.hintLevel
 *
 * @returns {Promise<boolean>} - true if a row was deleted, false if key not found
 */
const invalidateCachedHint = async ({ scenarioId, objectiveId, hintLevel }) => {
    const result = await pool.query(
        `DELETE FROM hint_cache
         WHERE scenario_id = $1
           AND step_order   = $2
           AND hint_level   = $3
         RETURNING cache_id`,
        [scenarioId, objectiveId, hintLevel]
    );
    return result.rows.length > 0;
};

/**
 * Invalidate ALL cached hints for a scenario.
 * Used when a scenario's steps are updated and all cached hints are stale.
 *
 * @param {number} scenarioId
 * @returns {Promise<number>} - Number of rows deleted
 */
const invalidateCacheForScenario = async (scenarioId) => {
    const result = await pool.query(
        `DELETE FROM hint_cache
         WHERE scenario_id = $1
         RETURNING cache_id`,
        [scenarioId]
    );
    return result.rows.length;
};

/**
 * Set the approval status of a cached hint.
 * is_approved = true  → approved by instructor
 * is_approved = false → flagged for regeneration
 * is_approved = null  → reset to unreviewed
 *
 * @param {number}       cacheId
 * @param {boolean|null} approved
 */
const setCacheApproval = async (cacheId, approved) => {
    const result = await pool.query(
        `UPDATE hint_cache
         SET is_approved = $2
         WHERE cache_id = $1
         RETURNING *`,
        [cacheId, approved]
    );
    return result.rows[0] || null;
};

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * Get cache usage statistics for a scenario.
 * Returns per-step, per-level hit counts and coverage.
 *
 * @param {number} scenarioId
 * @returns {Promise<{
 *   totalCachedHints: number,
 *   totalHitsServed: number,
 *   coverage: Array  - per step+level: { step_order, hint_level, generated_count }
 * }>}
 */
const getCacheStats = async (scenarioId) => {
    const result = await pool.query(
        `SELECT
            step_order,
            hint_level,
            generated_count,
            first_generated_at,
            last_served_at,
            is_approved
         FROM hint_cache
         WHERE scenario_id = $1
         ORDER BY step_order ASC, hint_level ASC`,
        [scenarioId]
    );

    const rows = result.rows;
    const totalCached = rows.length;
    const totalHits = rows.reduce((sum, r) => sum + (r.generated_count - 1), 0); // -1 = exclude initial generation

    return {
        totalCachedHints: totalCached,
        totalHitsServed: totalHits,
        coverage: rows,
    };
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    // Core cache operations
    getCachedHint,
    storeCachedHint,
    incrementCacheHitCount,

    // Cache management
    invalidateCachedHint,
    invalidateCacheForScenario,
    setCacheApproval,
    getCacheByScenario,

    // Analytics
    getCacheStats,
};