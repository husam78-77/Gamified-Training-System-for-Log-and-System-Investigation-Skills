-- =============================================================================
-- PHASE 2 MIGRATION: Multi-Level Hint System (Per Objective)
-- File: migrations/phase2_hint_levels.sql
--
-- PURPOSE:
--   Supports progressive hint levels per user per step (objective).
--   Each step can have up to MAX_HINT_LEVEL hints (default: 3).
--   Tracks exactly how many hints a user has consumed per step,
--   not just per session total.
--
-- DEPENDS ON: phase1_player_state.sql must be run first.
--   Phase 1 already added scenario_id, step_order, hint_level to ai_hint_log.
--   This migration adds the per-user per-step tracking table.
--
-- SAFE TO RUN: All statements use IF NOT EXISTS. Safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. USER HINT PROGRESS TABLE
--    Tracks how many hints a specific user has consumed for a specific step
--    within a specific session. This is the Phase 2 control table.
--
--    Why session-scoped (not just user+step)?
--    A user can replay a scenario. Each replay is a new session and should
--    get a fresh hint progression. Tying to session_id gives correct isolation.
--
--    One row per (session_id, step_order).
--    hint_count increments each time the user requests a hint for that step.
--    Capped at MAX_HINT_LEVEL (3) in the backend — not enforced at DB level
--    to keep the constraint logic in one place (hintController).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_hint_progress (
    progress_id     SERIAL PRIMARY KEY,
    session_id      INT     NOT NULL,
    scenario_id     INT     NOT NULL,
    step_order      INT     NOT NULL,

    -- How many hints this user has consumed for this step in this session
    -- hint_count = 1 → they have received level-1 hint
    -- hint_count = 2 → they have received level-1 and level-2 hints
    -- hint_count = 3 → all levels exhausted for this step
    hint_count      INT     NOT NULL DEFAULT 0,

    -- The highest hint level that has been delivered to this user for this step
    -- Matches hint_count in normal flow. Stored explicitly for fast reads.
    current_level   INT     NOT NULL DEFAULT 0,

    -- Timestamps
    first_hint_at   TIMESTAMP DEFAULT NULL,
    last_hint_at    TIMESTAMP DEFAULT NULL,

    CONSTRAINT fk_uhp_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_uhp_scenario
        FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
        ON DELETE CASCADE,

    -- One row per session+step. Enforced at DB level.
    CONSTRAINT unique_session_step_progress
        UNIQUE (session_id, step_order)
);

-- Fast lookup: "what level is this user at for step X in session Y?"
-- This is the most frequent read in Phase 2 — called on every hint request.
CREATE INDEX IF NOT EXISTS idx_uhp_session_step
    ON user_hint_progress(session_id, step_order);

-- Analytics: "which steps require the most hint levels across all users?"
CREATE INDEX IF NOT EXISTS idx_uhp_scenario_step
    ON user_hint_progress(scenario_id, step_order);


-- -----------------------------------------------------------------------------
-- 2. ADD hint_level RANGE CONSTRAINT TO ai_hint_log
--    Hint level must be 1, 2, or 3. Belt-and-suspenders enforcement.
--    Backend enforces this too in hintController.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_hint_level_range'
          AND table_name = 'ai_hint_log'
    ) THEN
        ALTER TABLE ai_hint_log
            ADD CONSTRAINT chk_hint_level_range
            CHECK (hint_level BETWEEN 1 AND 3);
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 3. VERIFY
-- -----------------------------------------------------------------------------

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_hint_progress'
ORDER BY ordinal_position;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_hint_progress';

SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'chk_hint_level_range';
