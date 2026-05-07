-- =============================================================================
-- MIGRATION: fix_discovery_triggers_reveals.sql
--
-- Purpose:
--   Fix three categories of regression in the discovery-based progression system:
--
--   1. TRIGGER OVER-FIRING
--      Broad triggers (ls /etc, find /etc, grep /etc prefix) were firing
--      discoveries from directory-browsing commands that require no real
--      forensic insight. All triggers are now scoped to the minimum command
--      that constitutes genuine evidence examination.
--
--   2. REVEAL CHAIN ACCURACY
--      /home/sysadmin/.bash_history was wired to reveal on CRON_SCHEDULER_ACCESSED
--      (triggered by bare ls /etc/cron.d). It now reveals on MALICIOUS_CRON_ENTRY_READ,
--      which requires actually reading the cron file content.
--
--   3. SEVERITY LEVELS
--      A new severity_level column on scenario_discoveries encodes the forensic
--      depth of each discovery: awareness → inspection → confirmation → analysis.
--      Low-severity (awareness) discoveries never unlock hidden evidence.
--      Only confirmation/analysis discoveries carry reveal_at_discovery_key files.
--
-- Safe to run on existing databases.
-- Run this after the discovery_based_progression_refactor.sql migration.
-- =============================================================================


-- =============================================================================
-- STEP 1: ADD severity_level COLUMN
-- =============================================================================

ALTER TABLE scenario_discoveries
    ADD COLUMN IF NOT EXISTS severity_level VARCHAR(20) NOT NULL DEFAULT 'confirmation';

COMMENT ON COLUMN scenario_discoveries.severity_level IS
    'Forensic depth of this discovery: '
    'awareness   = player noticed the area (ls /etc/cron.d); '
    'inspection  = player examined the structure (find /tmp); '
    'confirmation = player read key evidence (cat /etc/cron.d/updater); '
    'analysis     = player extracted and interpreted content (strings /tmp/.cache/sync.sh). '
    'Only confirmation/analysis discoveries should have hidden-file reveals attached.';


-- =============================================================================
-- STEP 2: SET SEVERITY LEVELS — Dead Drop scenario
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Dead Drop'
    ORDER BY created_at DESC LIMIT 1
)
UPDATE scenario_discoveries
SET severity_level = CASE discovery_key
    WHEN 'CRON_SCHEDULER_ACCESSED'      THEN 'awareness'
    WHEN 'MALICIOUS_CRON_ENTRY_READ'    THEN 'confirmation'
    WHEN 'EXECUTION_TRACED_IN_SYSLOG'   THEN 'confirmation'
    WHEN 'PAYLOAD_LOCATION_IDENTIFIED'  THEN 'inspection'
    WHEN 'SCRIPT_CONTENT_ANALYZED'      THEN 'analysis'
    WHEN 'EXFIL_CONFIRMED_VIA_NETLOG'   THEN 'analysis'
    WHEN 'PROCESS_ACTIVITY_EXAMINED'    THEN 'awareness'
    ELSE 'confirmation'
END
WHERE scenario_id = (SELECT scenario_id FROM s);


-- =============================================================================
-- STEP 3: FIX REVEAL CHAIN — .bash_history
--
-- Old: reveals on CRON_SCHEDULER_ACCESSED (triggered by bare ls /etc/cron.d)
-- New: reveals on MALICIOUS_CRON_ENTRY_READ (requires reading the file content)
--
-- Rationale: the bash_history shows the sysadmin READ the updater file and
-- noticed something suspicious. That context should only surface AFTER the
-- player has also read that file — not from a directory listing.
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Dead Drop'
    ORDER BY created_at DESC LIMIT 1
)
UPDATE virtual_files
SET reveal_at_discovery_key = 'MALICIOUS_CRON_ENTRY_READ'
WHERE file_path        = '/home/sysadmin/.bash_history'
  AND scenario_id      = (SELECT scenario_id FROM s)
  AND reveal_at_discovery_key = 'CRON_SCHEDULER_ACCESSED';


-- =============================================================================
-- STEP 4: DELETE ALL EXISTING TRIGGERS FOR DEAD DROP
--         (replaced wholesale with the corrected set below)
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Dead Drop'
    ORDER BY created_at DESC LIMIT 1
)
DELETE FROM discovery_triggers
WHERE discovery_id IN (
    SELECT discovery_id FROM scenario_discoveries
    WHERE scenario_id = (SELECT scenario_id FROM s)
);


-- =============================================================================
-- STEP 5: INSERT CORRECTED TRIGGERS — Dead Drop
--
-- Design rules applied:
--
--   AWARENESS (ls of the relevant directory, locate by name)
--     → fires CRON_SCHEDULER_ACCESSED / PROCESS_ACTIVITY_EXAMINED
--     → no file reveals attached to these discoveries
--
--   INSPECTION (find with scope, ls of hidden-content directory)
--     → fires PAYLOAD_LOCATION_IDENTIFIED
--     → reveals hidden payload after the player actively explored /tmp
--
--   CONFIRMATION (cat / strings / exact grep on the specific file)
--     → fires MALICIOUS_CRON_ENTRY_READ, EXECUTION_TRACED_IN_SYSLOG
--     → reveals linked hidden evidence
--
--   ANALYSIS (cat / strings / grep on the payload itself)
--     → fires SCRIPT_CONTENT_ANALYZED, EXFIL_CONFIRMED_VIA_NETLOG
--
-- Removed triggers:
--   - ls /etc          (too broad — player is just browsing)
--   - find /etc        (too broad — whole /etc scan ≠ cron awareness)
--   - grep /etc prefix (any grep under /etc, including /etc/passwd, was firing)
--   - ls /tmp          (just seeing sync.pid doesn't confirm payload found)
--   - ls /var/log      (directory listing ≠ syslog analysis)
--   - find /var/log    (enumerating log dir ≠ tracing script execution)
--   - grep /var/log prefix (any grep in log dir was firing syslog trace)
--   - locate updater in MALICIOUS_CRON_ENTRY_READ (kept only in awareness)
-- =============================================================================

WITH d AS (
    SELECT disc.discovery_id, disc.discovery_key
    FROM scenario_discoveries disc
    JOIN scenarios s ON s.scenario_id = disc.scenario_id
    WHERE s.title = 'Dead Drop'
    ORDER BY s.created_at DESC
)

INSERT INTO discovery_triggers
    (discovery_id, trigger_command, target_pattern, match_type, name_filter_pattern)
VALUES

-- ══════════════════════════════════════════════════════════════════════════════
-- AWARENESS: CRON_SCHEDULER_ACCESSED
-- The player landed on the scheduler directory or searched for it by name.
-- No file reveals are wired to this discovery.
-- ══════════════════════════════════════════════════════════════════════════════

-- ls /etc/cron.d  — direct listing of the scheduler directory
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'ls', '/etc/cron.d', 'exact', NULL),

-- find /etc -name "*.d"  — targeted search for .d directories
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'find', NULL, 'exact', '.d'),

-- find /etc -name "*cron*"  — explicitly searching for cron
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'find', NULL, 'exact', 'cron'),

-- locate cron  — keyword filesystem search
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'locate', 'cron', 'contains', NULL),

-- locate updater  — searching for the suspicious file by name (awareness only)
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'locate', 'updater', 'contains', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- CONFIRMATION: MALICIOUS_CRON_ENTRY_READ
-- The player read or searched the specific cron file content.
-- .bash_history reveals on this discovery (sysadmin also read the file).
-- ══════════════════════════════════════════════════════════════════════════════

-- cat /etc/cron.d/updater  — direct read
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_CRON_ENTRY_READ'),
 'cat', '/etc/cron.d/updater', 'exact', NULL),

-- strings /etc/cron.d/updater  — printable string extraction
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_CRON_ENTRY_READ'),
 'strings', '/etc/cron.d/updater', 'exact', NULL),

-- grep <pattern> /etc/cron.d/updater  — pattern search on the specific file
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_CRON_ENTRY_READ'),
 'grep', '/etc/cron.d/updater', 'exact', NULL),

-- grep -r <pattern> /etc/cron.d  — recursive search confined to cron.d
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_CRON_ENTRY_READ'),
 'grep', '/etc/cron.d', 'exact', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- CONFIRMATION: EXECUTION_TRACED_IN_SYSLOG
-- The player read or searched syslog.
-- /var/log/net.log reveals on this discovery.
-- ══════════════════════════════════════════════════════════════════════════════

-- cat /var/log/syslog  — direct read
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'cat', '/var/log/syslog', 'exact', NULL),

-- strings /var/log/syslog  — printable string extraction
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'strings', '/var/log/syslog', 'exact', NULL),

-- grep <pattern> /var/log/syslog  — pattern search on the specific file
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'grep', '/var/log/syslog', 'exact', NULL),

-- locate syslog  — keyword filesystem search
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'locate', 'syslog', 'contains', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- INSPECTION: PAYLOAD_LOCATION_IDENTIFIED
-- The player actively explored /tmp with a scoped find, or listed .cache directly.
-- sync.sh and .exfil_manifest reveal on this discovery.
-- Removed: ls /tmp (just browsing; seeing sync.pid ≠ locating the payload cache)
-- ══════════════════════════════════════════════════════════════════════════════

-- find /tmp  — recursive find reveals .cache directory and its contents
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'find', '/tmp', 'exact', NULL),

-- ls /tmp/.cache  — player directly listed the hidden cache directory
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'ls', '/tmp/.cache', 'exact', NULL),

-- find / -name "*.sh"  — name-based search across the filesystem
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'find', NULL, 'exact', '.sh'),

-- find / -name "sync*"
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'find', NULL, 'exact', 'sync'),

-- locate sync  — finds both sync.sh and sync.pid
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'locate', 'sync', 'contains', NULL),

-- locate .cache  — direct cache directory search
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'locate', '.cache', 'contains', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- ANALYSIS: SCRIPT_CONTENT_ANALYZED
-- The player read or extracted strings from the payload script.
-- ══════════════════════════════════════════════════════════════════════════════

-- cat /tmp/.cache/sync.sh
((SELECT discovery_id FROM d WHERE discovery_key = 'SCRIPT_CONTENT_ANALYZED'),
 'cat', '/tmp/.cache/sync.sh', 'exact', NULL),

-- strings /tmp/.cache/sync.sh  — extracts C2 URL and logic
((SELECT discovery_id FROM d WHERE discovery_key = 'SCRIPT_CONTENT_ANALYZED'),
 'strings', '/tmp/.cache/sync.sh', 'exact', NULL),

-- grep <pattern> /tmp/.cache/sync.sh
((SELECT discovery_id FROM d WHERE discovery_key = 'SCRIPT_CONTENT_ANALYZED'),
 'grep', '/tmp/.cache/sync.sh', 'exact', NULL),

-- grep -r <pattern> /tmp/.cache  — recursive search confined to cache dir
((SELECT discovery_id FROM d WHERE discovery_key = 'SCRIPT_CONTENT_ANALYZED'),
 'grep', '/tmp/.cache', 'exact', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- ANALYSIS: EXFIL_CONFIRMED_VIA_NETLOG  (bonus / secret)
-- The player found and read the network connection log.
-- ══════════════════════════════════════════════════════════════════════════════

((SELECT discovery_id FROM d WHERE discovery_key = 'EXFIL_CONFIRMED_VIA_NETLOG'),
 'cat', '/var/log/net.log', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'EXFIL_CONFIRMED_VIA_NETLOG'),
 'strings', '/var/log/net.log', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'EXFIL_CONFIRMED_VIA_NETLOG'),
 'grep', '/var/log/net.log', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'EXFIL_CONFIRMED_VIA_NETLOG'),
 'locate', 'net.log', 'contains', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- AWARENESS: PROCESS_ACTIVITY_EXAMINED  (bonus)
-- Any ps invocation — the process table shows a /tmp shell.
-- ══════════════════════════════════════════════════════════════════════════════

((SELECT discovery_id FROM d WHERE discovery_key = 'PROCESS_ACTIVITY_EXAMINED'),
 'ps', NULL, 'exact', NULL);


-- =============================================================================
-- STEP 6: VERIFY
-- =============================================================================

-- Discoveries with severity levels
SELECT discovery_key, severity_level, is_critical, maps_to_step_order, discovery_order
FROM scenario_discoveries
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
ORDER BY discovery_order;

-- Trigger counts per discovery (should be tighter than before)
SELECT disc.discovery_key, disc.severity_level, COUNT(dt.trigger_id) AS trigger_count
FROM scenario_discoveries disc
LEFT JOIN discovery_triggers dt ON dt.discovery_id = disc.discovery_id
WHERE disc.scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
GROUP BY disc.discovery_key, disc.severity_level, disc.discovery_order
ORDER BY disc.discovery_order;

-- Confirm .bash_history now reveals on MALICIOUS_CRON_ENTRY_READ
SELECT file_path, reveal_at_discovery_key
FROM virtual_files
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
  AND file_path = '/home/sysadmin/.bash_history';
