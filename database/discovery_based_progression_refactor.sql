-- =============================================================================
-- MIGRATION: discovery_based_progression_refactor.sql
--
-- Purpose:
--   Replace the rigid command-matching investigation model with a flexible
--   discovery-based system. Players now earn progress by finding evidence
--   through ANY valid investigative technique, not by typing an exact command.
--
-- Changes:
--   1. CREATE scenario_discoveries   — what each discovery key represents
--   2. CREATE discovery_triggers     — which commands/paths unlock each discovery
--   3. CREATE session_discoveries    — per-session discovery tracking
--   4. ALTER  virtual_files          — add evidence_tags, reveal_at_discovery_key, metadata
--   5. ALTER  command_history        — add match_type column
--   6. Indexes for performance
-- =============================================================================


-- =============================================================================
-- 1. SCENARIO DISCOVERIES
--
-- One row per discoverable piece of evidence in a scenario.
-- Each discovery has a weight and maps back to a step_order so the
-- existing hint system continues to work unchanged.
-- =============================================================================

CREATE TABLE IF NOT EXISTS scenario_discoveries (
    discovery_id        SERIAL PRIMARY KEY,
    scenario_id         INT    NOT NULL,
    discovery_key       VARCHAR(100) NOT NULL,  -- e.g. 'CRON_SCHEDULER_ACCESSED'
    title               VARCHAR(255) NOT NULL,  -- human-readable label
    description         TEXT,                  -- what this discovery represents forensically
    evidence_tags       TEXT[]  DEFAULT '{}',   -- e.g. ARRAY['persistence','cron','scheduler']
    weight_percent      INT     NOT NULL DEFAULT 0, -- contribution to path score (critical ones sum to 100)
    discovery_order     INT     NOT NULL,       -- display/progress ordering
    is_critical         BOOLEAN NOT NULL DEFAULT TRUE, -- must find to complete mission
    maps_to_step_order  INT     DEFAULT NULL,   -- credits this expected_step when unlocked
    reveal_hint         TEXT    DEFAULT NULL,   -- context text surfaced to ARIA when discovered

    CONSTRAINT fk_discoveries_scenario
        FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_discovery_per_scenario
        UNIQUE (scenario_id, discovery_key)
);

COMMENT ON TABLE scenario_discoveries IS
    'Defines what the player can discover in a scenario and how it maps to the legacy step system.';

COMMENT ON COLUMN scenario_discoveries.maps_to_step_order IS
    'When this discovery fires, a command_history record is saved crediting this step_order. '
    'Keeps the hint level system fully functional without changes.';

COMMENT ON COLUMN scenario_discoveries.is_critical IS
    'Critical discoveries count toward the path score and mission completion. '
    'Non-critical discoveries (bonus, secret) do not block completion.';


-- =============================================================================
-- 2. DISCOVERY TRIGGERS
--
-- Each discovery can be unlocked by ANY number of different commands.
-- The engine checks every trigger for a given discovery and fires if ANY match.
-- Multiple discoveries can share the same trigger row pattern (different discovery_ids).
-- =============================================================================

CREATE TABLE IF NOT EXISTS discovery_triggers (
    trigger_id          SERIAL PRIMARY KEY,
    discovery_id        INT    NOT NULL,
    trigger_command     VARCHAR(50) NOT NULL,   -- 'ls', 'cat', 'find', 'locate', 'grep', 'ps', 'strings'
    target_pattern      VARCHAR(255) DEFAULT NULL, -- path or keyword to match resolved target against
    match_type          VARCHAR(20)  NOT NULL DEFAULT 'exact',
        -- 'exact'    : normalized target must equal pattern exactly
        -- 'prefix'   : normalized target must start with pattern
        -- 'contains' : normalized target must contain pattern
        -- 'wildcard' : pattern with * wildcard
    name_filter_pattern VARCHAR(100) DEFAULT NULL,
        -- For `find` commands: if present, matches against the -name argument value
        -- e.g. name_filter_pattern='cron' matches `find / -name "*cron*"`

    CONSTRAINT fk_triggers_discovery
        FOREIGN KEY (discovery_id) REFERENCES scenario_discoveries(discovery_id)
        ON DELETE CASCADE
);

COMMENT ON TABLE discovery_triggers IS
    'Each row is one valid way a player can unlock a discovery. '
    'A discovery fires when ANY of its triggers matches the parsed command.';

COMMENT ON COLUMN discovery_triggers.target_pattern IS
    'For locate: matched against the search keyword. '
    'For all others: matched against the fully resolved target path.';

COMMENT ON COLUMN discovery_triggers.name_filter_pattern IS
    'Exclusive to find commands. Matches the value after -name flag (case-insensitive substring). '
    'When set, target_pattern is ignored for this trigger.';


-- =============================================================================
-- 3. SESSION DISCOVERIES
--
-- One row per discovery unlocked per session. Prevents double-counting.
-- =============================================================================

CREATE TABLE IF NOT EXISTS session_discoveries (
    session_discovery_id    SERIAL PRIMARY KEY,
    session_id              INT    NOT NULL,
    discovery_id            INT    NOT NULL,
    discovery_key           VARCHAR(100) NOT NULL,  -- denormalized for fast reads
    triggered_by_command    TEXT   NOT NULL,        -- the raw command that fired the trigger
    discovered_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_session_discoveries_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_session_discoveries_discovery
        FOREIGN KEY (discovery_id) REFERENCES scenario_discoveries(discovery_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_session_discovery
        UNIQUE (session_id, discovery_id)
);

COMMENT ON TABLE session_discoveries IS
    'Tracks which discoveries a session has unlocked and via which command.';


-- =============================================================================
-- 4. VIRTUAL FILES — new columns
--
-- evidence_tags          : forensic categories attached to a file
-- reveal_at_discovery_key: alternative to reveal_at_step — file becomes visible
--                          when a named discovery is unlocked
-- metadata               : flexible JSON for future extensions (timestamps, permissions, etc.)
-- =============================================================================

ALTER TABLE virtual_files
    ADD COLUMN IF NOT EXISTS evidence_tags          TEXT[]  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS reveal_at_discovery_key VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS metadata               JSONB   DEFAULT NULL;

COMMENT ON COLUMN virtual_files.evidence_tags IS
    'Forensic categories, e.g. ARRAY[''persistence'',''cron'',''exfiltration'']. '
    'Used by the discovery engine and ARIA hint system for context.';

COMMENT ON COLUMN virtual_files.reveal_at_discovery_key IS
    'When this discovery key is unlocked in the session, the file becomes visible. '
    'Parallel to reveal_at_step — either can be used, or both.';

COMMENT ON COLUMN virtual_files.metadata IS
    'Optional JSON with realistic file attributes: '
    '{"owner":"root","permissions":"-rwxr--r--","size_bytes":1024,"modified":"2024-04-19T03:14:00Z"}';


-- =============================================================================
-- 5. COMMAND HISTORY — add match_type
--
-- 'direct'   : matched via the existing command+target expected_step logic
-- 'discovery': matched because a discovery fired and credited this step_order
-- NULL       : unmatched command (no progress)
-- =============================================================================

ALTER TABLE command_history
    ADD COLUMN IF NOT EXISTS match_type VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN command_history.match_type IS
    'How this command earned its step credit: '
    '''direct'' = exact/relative/bare step match; '
    '''discovery'' = a discovery trigger fired and credited the mapped step_order.';


-- =============================================================================
-- 6. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_discoveries_scenario
    ON scenario_discoveries(scenario_id, discovery_order ASC);

CREATE INDEX IF NOT EXISTS idx_triggers_discovery
    ON discovery_triggers(discovery_id);

CREATE INDEX IF NOT EXISTS idx_session_discoveries_session
    ON session_discoveries(session_id, discovered_at ASC);

CREATE INDEX IF NOT EXISTS idx_session_discoveries_key
    ON session_discoveries(session_id, discovery_key);

CREATE INDEX IF NOT EXISTS idx_virtual_files_discovery_key
    ON virtual_files(reveal_at_discovery_key)
    WHERE reveal_at_discovery_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_command_history_match_type
    ON command_history(session_id, match_type)
    WHERE match_type IS NOT NULL;


-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('scenario_discoveries', 'discovery_triggers', 'session_discoveries')
ORDER BY table_name, ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'virtual_files'
  AND column_name IN ('evidence_tags', 'reveal_at_discovery_key', 'metadata');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'command_history'
  AND column_name = 'match_type';