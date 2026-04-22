-- =============================================================================
-- PHASE 1 MIGRATION: Player State Intelligence Layer
-- File: migrations/phase1_player_state.sql
--
-- PURPOSE:
--   Adds columns to ai_hint_log to store the player state analysis snapshot
--   that was computed when the hint was generated. This enables:
--     - Post-session analytics (why did players get stuck here?)
--     - Phase 2 prerequisite: step_order per hint row
--     - Phase 3 prerequisite: scenario_id per hint row (for shared cache lookup)
--     - Instructor dashboards showing where students struggled most
--
-- SAFE TO RUN:
--   All changes use ADD COLUMN IF NOT EXISTS — safe to re-run.
--   No existing data is modified or deleted.
--   No existing columns are altered.
--
-- RUN ORDER: Run this before deploying Phase 1 backend files.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ADD STEP CONTEXT COLUMNS TO ai_hint_log
--    These link each hint to the specific step the player was stuck on.
--    Required for Phase 2 (per-objective hint levels) and
--    Phase 3 (shared hint cache lookup key).
-- -----------------------------------------------------------------------------

ALTER TABLE ai_hint_log
    ADD COLUMN IF NOT EXISTS scenario_id   INT     DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS step_order    INT     DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS hint_level    INT     DEFAULT 1;

-- Foreign key for scenario_id (add only if not exists via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ai_hint_log_scenario'
          AND table_name = 'ai_hint_log'
    ) THEN
        ALTER TABLE ai_hint_log
            ADD CONSTRAINT fk_ai_hint_log_scenario
            FOREIGN KEY (scenario_id)
            REFERENCES scenarios(scenario_id)
            ON DELETE SET NULL;
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 2. ADD PLAYER STATE SNAPSHOT COLUMNS TO ai_hint_log
--    Stores the analyzer output at hint-generation time for analytics.
--    These are all nullable — older rows without state data are still valid.
-- -----------------------------------------------------------------------------

ALTER TABLE ai_hint_log
    ADD COLUMN IF NOT EXISTS stuck_score      INT     DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS behavior_type    VARCHAR(20) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS wrong_cmd_count  INT     DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_repeating     BOOLEAN DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_close         BOOLEAN DEFAULT NULL;

-- -----------------------------------------------------------------------------
-- 3. ADD INDEXES FOR ANALYTICS AND PHASE 2/3 LOOKUP PERFORMANCE
-- -----------------------------------------------------------------------------

-- Lookup: "how many hints has this session used for step X?" (Phase 2)
CREATE INDEX IF NOT EXISTS idx_hint_log_session_step
    ON ai_hint_log(session_id, step_order);

-- Lookup: "what hints exist for scenario X, step Y, level Z?" (Phase 3)
CREATE INDEX IF NOT EXISTS idx_hint_log_scenario_step_level
    ON ai_hint_log(scenario_id, step_order, hint_level);

-- Analytics: "which steps caused the most hints across all users?"
CREATE INDEX IF NOT EXISTS idx_hint_log_scenario_step
    ON ai_hint_log(scenario_id, step_order);

-- Analytics: "what behavior types triggered hint requests?"
CREATE INDEX IF NOT EXISTS idx_hint_log_behavior
    ON ai_hint_log(behavior_type);


-- -----------------------------------------------------------------------------
-- 4. ADD SESSION PLAYER STATE SUMMARY TABLE (new table)
--    One row per session. Updated each time a hint is requested.
--    Provides a quick summary of how a player performed for scoring
--    and instructor dashboards without scanning all hint rows.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS session_player_state (
    state_id            SERIAL PRIMARY KEY,
    session_id          INT NOT NULL UNIQUE,
    scenario_id         INT NOT NULL,

    -- Running totals updated on each hint request
    total_hints_used    INT     DEFAULT 0,
    total_wrong_cmds    INT     DEFAULT 0,
    max_stuck_score     INT     DEFAULT 0,   -- Peak stuck score seen this session
    dominant_behavior   VARCHAR(20) DEFAULT NULL,  -- Most common behavior type

    -- Timestamps
    first_hint_at       TIMESTAMP DEFAULT NULL,
    last_hint_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sps_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sps_scenario
        FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sps_scenario
    ON session_player_state(scenario_id);

CREATE INDEX IF NOT EXISTS idx_sps_max_stuck
    ON session_player_state(scenario_id, max_stuck_score DESC);


-- -----------------------------------------------------------------------------
-- 5. VERIFY — run these after migration to confirm structure
-- -----------------------------------------------------------------------------

-- Confirm new columns on ai_hint_log
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ai_hint_log'
ORDER BY ordinal_position;

-- Confirm session_player_state table was created
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'session_player_state'
ORDER BY ordinal_position;

-- Confirm indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('ai_hint_log', 'session_player_state')
ORDER BY tablename, indexname;
