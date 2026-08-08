-- =============================================================================
-- MIGRATION: investigation_content_layer.sql
--
-- Purpose:
--   Adds generic, incident-agnostic session-state tables for the new
--   content-driven investigation engines (Discovery, Objective, Events,
--   Report, Review). None of these tables reference scenario content —
--   scenario content (discoveries.json, objectives.json, review.json)
--   lives entirely under backend/content/incidents/<incidentId>/.
--
--   These tables only track per-SESSION runtime state, keyed by
--   discovery_key / event_type strings rather than FKs into scenario
--   content tables — so they work identically for every future incident
--   with zero schema changes.
--
-- Tables:
--   1. investigation_discoveries — which discovery_keys a session unlocked
--   2. investigation_events      — generic behavioural event log
--   3. investigation_reports     — the player's editable investigation report
--   4. investigation_reviews     — AI review results (Phase 9)
--   5. sessions.submitted_at     — marks when a session was submitted
-- =============================================================================

CREATE TABLE IF NOT EXISTS investigation_discoveries (
    id                    SERIAL PRIMARY KEY,
    session_id            INT NOT NULL,
    discovery_key         VARCHAR(100) NOT NULL,
    triggered_by_command  TEXT,
    discovered_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_investigation_discoveries_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_session_discovery_key
        UNIQUE (session_id, discovery_key)
);

CREATE INDEX IF NOT EXISTS idx_investigation_discoveries_session
    ON investigation_discoveries(session_id, discovered_at ASC);


CREATE TABLE IF NOT EXISTS investigation_events (
    id            SERIAL PRIMARY KEY,
    session_id    INT NOT NULL,
    event_type    VARCHAR(50) NOT NULL,
    event_data    JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_investigation_events_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_investigation_events_session
    ON investigation_events(session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_investigation_events_type
    ON investigation_events(session_id, event_type);


CREATE TABLE IF NOT EXISTS investigation_reports (
    session_id    INT PRIMARY KEY,
    content       TEXT NOT NULL DEFAULT '',
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_investigation_reports_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS investigation_reviews (
    session_id       INT PRIMARY KEY,
    score            INT,
    criteria_scores  JSONB NOT NULL DEFAULT '[]',
    strengths        JSONB NOT NULL DEFAULT '[]',
    weaknesses       JSONB NOT NULL DEFAULT '[]',
    feedback         TEXT,
    reviewed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_investigation_reviews_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE
);


ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT NULL;


-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT table_name
FROM information_schema.tables
WHERE table_name IN (
    'investigation_discoveries',
    'investigation_events',
    'investigation_reports',
    'investigation_reviews'
);

SELECT column_name FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'submitted_at';
