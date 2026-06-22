-- ============================================================================
-- Fix: Ghost Key (ssh_forensics, scenario_id 8) — Fully Idempotent Version
-- ============================================================================

-- ── Bug 1 fix ────────────────────────────────────────────────────────────
UPDATE discovery_triggers
SET target_pattern = 'ssh'
WHERE trigger_id = 162
  AND trigger_command = 'locate';


-- ── Bug 2 fix ────────────────────────────────────────────────────────────

-- 1. Upsert Expected Steps (Handle existing row)
INSERT INTO expected_steps (scenario_id, step_order, command_expected, target_path, weight_percent, description)
VALUES (
    8, 6, 'cat', '/home/developer/.ssh/authorized_keys.backup', 0,
    'Compared the authorized_keys backup against the current file, confirming exactly which key was injected'
)
ON CONFLICT ON CONSTRAINT unique_step_per_scenario
DO UPDATE SET 
    command_expected = EXCLUDED.command_expected,
    target_path = EXCLUDED.target_path,
    weight_percent = EXCLUDED.weight_percent,
    description = EXCLUDED.description;

-- 2. Upsert Scenario Discoveries (Handle existing row)
INSERT INTO scenario_discoveries
    (scenario_id, discovery_key, title, description, evidence_tags, weight_percent, discovery_order, is_critical, maps_to_step_order, reveal_hint, severity_level)
VALUES (
    8, 'BACKUP_COMPARISON_CONFIRMED', 'Backup Comparison Confirmed',
    'Cross-referenced the current authorized_keys file against the pre-incident backup, confirming exactly which key was injected and when the legitimate baseline was established.',
    ARRAY['ssh', 'backup', 'forensic_artifact'], 0, 8, false, 6,
    'The backup predates the intrusion — any key present in the current file but absent from the backup is the planted backdoor.',
    'conclusion'
)
ON CONFLICT ON CONSTRAINT unique_discovery_per_scenario
DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    evidence_tags = EXCLUDED.evidence_tags,
    weight_percent = EXCLUDED.weight_percent,
    discovery_order = EXCLUDED.discovery_order,
    is_critical = EXCLUDED.is_critical,
    maps_to_step_order = EXCLUDED.maps_to_step_order,
    reveal_hint = EXCLUDED.reveal_hint,
    severity_level = EXCLUDED.severity_level;

-- 3. Clear existing triggers for this discovery to prevent duplicates on re-runs
DELETE FROM discovery_triggers 
WHERE discovery_id = (
    SELECT discovery_id FROM scenario_discoveries 
    WHERE scenario_id = 8 AND discovery_key = 'BACKUP_COMPARISON_CONFIRMED'
);

-- 4. Insert new triggers, dynamically pulling the ID we just upserted
INSERT INTO discovery_triggers (discovery_id, trigger_command, target_pattern, match_type, name_filter_pattern)
SELECT discovery_id, 'cat', '/home/developer/.ssh/authorized_keys.backup', 'exact', NULL
FROM scenario_discoveries WHERE scenario_id = 8 AND discovery_key = 'BACKUP_COMPARISON_CONFIRMED'
UNION ALL
SELECT discovery_id, 'strings', '/home/developer/.ssh/authorized_keys.backup', 'exact', NULL
FROM scenario_discoveries WHERE scenario_id = 8 AND discovery_key = 'BACKUP_COMPARISON_CONFIRMED'
UNION ALL
SELECT discovery_id, 'grep', '/home/developer/.ssh/authorized_keys.backup', 'exact', NULL
FROM scenario_discoveries WHERE scenario_id = 8 AND discovery_key = 'BACKUP_COMPARISON_CONFIRMED';

-- 5. Update the Objective
UPDATE objectives
SET trigger_step = 6
WHERE objective_id = 35
  AND scenario_id = 8;