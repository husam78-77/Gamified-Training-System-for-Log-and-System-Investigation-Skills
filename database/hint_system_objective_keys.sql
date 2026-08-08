-- =============================================================================
-- MIGRATION: hint_system_objective_keys.sql
--
-- Purpose:
--   The hint system (ai_hint_log, user_hint_progress, hint_cache) tracked
--   progress by integer expected_steps.step_order. The content-driven
--   engines (Phase 2/3) key progress by objective id — a string defined in
--   an incident's objectives.json (e.g. "identify_source") — since
--   objectives no longer come from a DB-owned expected_steps table.
--
--   This converts the step_order columns to VARCHAR so they can hold
--   either representation. No data is lost — existing integer values are
--   cast to text in place. The column name is kept as step_order to avoid
--   a wide rename across the hint system; it now holds an objective id.
-- =============================================================================

ALTER TABLE ai_hint_log
    ALTER COLUMN step_order TYPE VARCHAR(100) USING step_order::text;

ALTER TABLE user_hint_progress
    ALTER COLUMN step_order TYPE VARCHAR(100) USING step_order::text;

ALTER TABLE hint_cache
    ALTER COLUMN step_order TYPE VARCHAR(100) USING step_order::text;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('ai_hint_log', 'user_hint_progress', 'hint_cache')
  AND column_name = 'step_order';
