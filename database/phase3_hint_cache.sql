-- =============================================================================
-- PHASE 3 MIGRATION: Shared Hint Cache (Cross-User Optimization)
-- File: migrations/phase3_hint_cache.sql
--
-- PURPOSE:
--   Stores generated hints globally per (scenario_id, step_order, hint_level).
--   When ANY user generates a hint for a given step+level, it is stored here.
--   All future users requesting the same step+level receive the cached hint
--   with zero AI calls — no token cost, no latency.
--
-- CACHE KEY:
--   (scenario_id, step_order, hint_level) → unique hint text
--
-- DEPENDS ON:
--   phase1_player_state.sql  → ai_hint_log has scenario_id, step_order, hint_level
--   phase2_hint_levels.sql   → user_hint_progress exists
--
-- SAFE TO RUN: All statements use IF NOT EXISTS. Safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. HINT CACHE TABLE
--    One row per (scenario_id, step_order, hint_level).
--    This is the global shared store. No user_id, no session_id.
--    The hint text here belongs to everyone on that scenario step.
--
--    generated_count: how many times this cached hint has been served.
--    Useful for analytics ("this hint has been reused 47 times").
--
--    is_approved: optional manual review flag. Instructors can mark a
--    cached hint as reviewed/approved. NULL = not reviewed, TRUE = approved,
--    FALSE = flagged for regeneration.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hint_cache (
    cache_id        SERIAL PRIMARY KEY,

    -- Cache key — unique combination
    scenario_id     INT         NOT NULL,
    step_order      INT         NOT NULL,
    hint_level      INT         NOT NULL,

    -- The cached hint text
    hint_text       TEXT        NOT NULL,

    -- Prompt that generated this hint (for debugging / regeneration)
    prompt_used     TEXT        DEFAULT NULL,

    -- Usage tracking
    generated_count INT         NOT NULL DEFAULT 1,  -- Starts at 1 (first generation)
    first_generated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_served_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Optional instructor review
    is_approved     BOOLEAN     DEFAULT NULL,  -- NULL=unreviewed, TRUE=ok, FALSE=flagged

    -- Constraints
    CONSTRAINT fk_hint_cache_scenario
        FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_cache_hint_level
        CHECK (hint_level BETWEEN 1 AND 3),

    -- The cache key uniqueness constraint
    CONSTRAINT unique_cache_key
        UNIQUE (scenario_id, step_order, hint_level)
);

-- Primary lookup index — this runs on EVERY hint request
-- Must be as fast as possible
CREATE UNIQUE INDEX IF NOT EXISTS idx_hint_cache_key
    ON hint_cache(scenario_id, step_order, hint_level);

-- Analytics: all cached hints for a scenario
CREATE INDEX IF NOT EXISTS idx_hint_cache_scenario
    ON hint_cache(scenario_id);

-- Analytics: most-served hints across all scenarios
CREATE INDEX IF NOT EXISTS idx_hint_cache_generated_count
    ON hint_cache(generated_count DESC);

-- Instructor review queue: all unapproved/flagged hints
CREATE INDEX IF NOT EXISTS idx_hint_cache_approval
    ON hint_cache(is_approved)
    WHERE is_approved IS NULL OR is_approved = FALSE;


-- -----------------------------------------------------------------------------
-- 2. ADD cache_hit COLUMN TO ai_hint_log
--    Records whether each hint request was served from cache or freshly
--    generated. Enables token usage analytics:
--    "What % of hint requests were served from cache this month?"
-- -----------------------------------------------------------------------------

ALTER TABLE ai_hint_log
    ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for cache hit analytics
CREATE INDEX IF NOT EXISTS idx_hint_log_cache_hit
    ON ai_hint_log(cache_hit);


-- -----------------------------------------------------------------------------
-- 3. VERIFY
-- -----------------------------------------------------------------------------

-- Confirm hint_cache table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'hint_cache'
ORDER BY ordinal_position;

-- Confirm cache_hit column on ai_hint_log
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name  = 'ai_hint_log'
  AND column_name = 'cache_hit';

-- Confirm indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('hint_cache', 'ai_hint_log')
  AND indexname LIKE '%cache%'
ORDER BY tablename, indexname;
