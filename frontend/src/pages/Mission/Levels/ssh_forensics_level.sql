/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCENARIO: Ghost Key                                                         ║
║  Type: ssh_forensics                                                         ║
║  Difficulty: easy                                                            ║
║                                                                              ║
║  STORY                                                                       ║
║  ─────                                                                       ║
║  A developer reported their SSH key stopped working. Upon review, a new     ║
║  key was added to authorized_keys yesterday at 2 AM. No one admits adding   ║
║  it. Your mission: find the unauthorized key, identify when it was added,   ║
║  and trace how the attacker got in.                                         ║
║                                                                              ║
║  INVESTIGATION PHILOSOPHY (discovery-based)                                 ║
║  ──────────────────────────────────────────                                 ║
║  This scenario does NOT require a fixed command sequence.                   ║
║  Players may approach the investigation in any order using any supported   ║
║  technique. Evidence is evaluated by WHAT you discovered, not HOW.         ║
║                                                                              ║
║  DISCOVERIES (5 critical, 2 bonus)                                          ║
║  ───────────────────────────────────                                        ║
║    Critical (weights sum to 100):                                           ║
║      1. SSH_DIR_ACCESSED              10 pts  → maps to step 1              ║
║      2. AUTHORIZED_KEYS_READ          20 pts  → maps to step 2              ║
║      3. MALICIOUS_KEY_IDENTIFIED      25 pts  → maps to step 3              ║
║      4. AUTH_LOG_IP_TRACED            25 pts  → maps to step 4              ║
║      5. ATTACKER_ENTRY_CONFIRMED      20 pts  → maps to step 5              ║
║                                                                              ║
║    Bonus (non-critical, no weight):                                         ║
║      6. SSH_CONFIG_EXAMINED           [BONUS]  → no step mapping            ║
║      7. ACTIVE_SESSION_FOUND           [BONUS]  → no step mapping           ║
║                                                                              ║
║  VIRTUAL FILESYSTEM                                                         ║
║  ──────────────────                                                         ║
║    /home/developer/.ssh/authorized_keys    3 keys (1 malicious)            ║
║    /home/developer/.ssh/id_rsa.pub         developer's public key          ║
║    /home/developer/.bash_history           command history                 ║
║    /var/log/auth.log                       SSH logins & key additions      ║
║    /var/log/auth.log.1                     HIDDEN → rotated log (older)    ║
║    /etc/ssh/sshd_config                    SSH configuration               ║
║    /home/developer/.ssh/authorized_keys.backup  HIDDEN → clean backup      ║
║    /tmp/attacker_ip.txt                    HIDDEN → attacker note          ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

-- =============================================================================
-- CLEANUP — Remove any existing "Ghost Key" data before re-inserting.
-- =============================================================================

DO $$
DECLARE
    v_scenario_id INT;
BEGIN
    SELECT scenario_id INTO v_scenario_id
    FROM scenarios
    WHERE title = 'Ghost Key'
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

        RAISE NOTICE 'Removed existing Ghost Key scenario (id=%)', v_scenario_id;
    ELSE
        RAISE NOTICE 'No existing Ghost Key scenario found — clean insert.';
    END IF;
END;
$$;

-- =============================================================================
-- SECTION 1: SCENARIO
-- =============================================================================

INSERT INTO scenarios (title, type, difficulty, mission_brief, is_active, scenario_order)
VALUES (
    'Ghost Key',
    'ssh_forensics',
    'easy',
    E'A developer reported their SSH key stopped working. Upon review, a new key was added to authorized_keys yesterday at 2 AM. No one admits adding it. Your mission: find the unauthorized key, identify when it was added, and trace how the attacker got in. Investigate freely — evidence responds to any valid forensic technique.',
    TRUE,
    (SELECT COALESCE(MAX(scenario_order), 0) + 1 FROM scenarios)
);

-- =============================================================================
-- SECTION 2: VIRTUAL FILES
-- =============================================================================
-- Filesystem layout:
--   /home/developer/.ssh/authorized_keys      3 keys (1 malicious)
--   /home/developer/.ssh/id_rsa.pub           developer's public key
--   /home/developer/.bash_history             command history
--   /var/log/auth.log                         SSH logins & key additions
--   /var/log/auth.log.1                       HIDDEN → rotated older log
--   /etc/ssh/sshd_config                      SSH configuration
--   /home/developer/.ssh/authorized_keys.backup  HIDDEN → clean backup
--   /tmp/attacker_ip.txt                      HIDDEN → attacker note
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Ghost Key'
    ORDER BY created_at DESC LIMIT 1
)

INSERT INTO virtual_files
    (scenario_id, file_name, file_path, content, file_type,
     is_hidden, reveal_at_step, reveal_at_discovery_key, evidence_tags, metadata)
VALUES

-- ── /home directory ─────────────────────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    'home', '/home', NULL, 'directory',
    FALSE, NULL, NULL, NULL, NULL
),

(
    (SELECT scenario_id FROM s),
    'developer', '/home/developer', NULL, 'directory',
    FALSE, NULL, NULL,
    ARRAY['user_account'],
    '{"owner": "developer", "permissions": "drwxr-xr-x"}'::jsonb
),

-- ── /home/developer/.ssh directory ─────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    '.ssh', '/home/developer/.ssh', NULL, 'directory',
    FALSE, NULL, NULL,
    ARRAY['ssh', 'authentication'],
    '{"owner": "developer", "permissions": "drwx------"}'::jsonb
),

-- ── /home/developer/.ssh/authorized_keys ────────────────────────────────────
-- Primary evidence: contains malicious key
(
    (SELECT scenario_id FROM s),
    'authorized_keys',
    '/home/developer/.ssh/authorized_keys',
    'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDM+3jKp7Q8xL9mN2vR4tY6uI8oP0zQ1wE2rT3yU4iO5pA6sD7fG8hJ9kL0zX1cV2bN3mM4qW5eR6tY7uI8oP9zQ0wE1rT2y developer@workstation
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7xL8mN2vR4tY6uI8oP0zQ1wE2rT3yU4iO5pA6sD7fG8hJ9kL0zX1cV2bN3mM4qW5eR6tY7uI8oP9zQ0wE1rT2y admin@backup-server
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQExK9jL0zX1cV2bN3mM4qW5eR6tY7uI8oP0zQ1wE2rT3yU4iO5pA6sD7fG8hJ9kL0zX1cV2bN3mM4qW5eR6tY7uI8oP9z admin-backup@unknown',
    'text',
    FALSE, NULL, NULL,
    ARRAY['ssh', 'authorization', 'forensic_artifact'],
    '{"permissions": "-rw-------", "owner": "developer", "modified": "2025-04-18T02:15:45Z", "size_bytes": 512}'::jsonb
),

-- ── /home/developer/.ssh/id_rsa.pub ─────────────────────────────────────────
-- Developer's legitimate public key
(
    (SELECT scenario_id FROM s),
    'id_rsa.pub',
    '/home/developer/.ssh/id_rsa.pub',
    'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDM+3jKp7Q8xL9mN2vR4tY6uI8oP0zQ1wE2rT3yU4iO5pA6sD7fG8hJ9kL0zX1cV2bN3mM4qW5eR6tY7uI8oP9zQ0wE1rT2y developer@workstation',
    'text',
    FALSE, NULL, NULL,
    ARRAY['ssh', 'public_key'],
    '{"permissions": "-rw-r--r--", "owner": "developer"}'::jsonb
),

-- ── /home/developer/.bash_history ───────────────────────────────────────────
-- Shows developer's normal SSH setup activities
(
    (SELECT scenario_id FROM s),
    '.bash_history',
    '/home/developer/.bash_history',
    'ssh-keygen -t rsa
cat .ssh/id_rsa.pub
ssh-copy-id developer@prod-server
ls .ssh/
exit',
    'text',
    FALSE, NULL, NULL,
    ARRAY['user_activity', 'command_history'],
    '{"permissions": "-rw-------", "owner": "developer", "modified": "2025-04-17T15:30:00Z"}'::jsonb
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

-- ── /var/log/auth.log ───────────────────────────────────────────────────────
-- Contains SSH login records and the key addition event
(
    (SELECT scenario_id FROM s),
    'auth.log',
    '/var/log/auth.log',
    'Apr 17 09:13:22 prod-server sshd[4021]: Accepted publickey for developer from 192.168.1.100 port 52841
Apr 17 09:13:22 prod-server sshd[4021]: pam_unix(sshd:session): session opened for user developer
Apr 17 09:13:55 prod-server sshd[4021]: Received disconnect from 192.168.1.100 port 52841
Apr 17 14:30:12 prod-server sshd[3102]: Accepted publickey for developer from 192.168.1.100 port 49123
Apr 17 14:30:12 prod-server sshd[3102]: pam_unix(sshd:session): session opened for user developer
Apr 17 14:31:00 prod-server sshd[3102]: Received disconnect from 192.168.1.100 port 49123
Apr 18 02:15:30 prod-server sshd[4105]: Accepted publickey for developer from 10.0.0.5 port 33412
Apr 18 02:15:31 prod-server sshd[4105]: pam_unix(sshd:session): session opened for user developer
Apr 18 02:15:35 prod-server sshd[4105]: Received disconnect from 10.0.0.5 port 33412
Apr 18 02:15:40 prod-server sshd[4112]: error: key_read: uudecode AAAAB3NzaC1yc2EAAAADAQABAAABAQExK9jL0zX1cV2bN3mM4qW5eR6tY7uI8oP0zQ1wE2rT3yU4iO5pA6sD7fG8hJ9kL0zX1cV2bN3mM4qW5eR6tY7uI8oP9z
Apr 18 02:15:45 prod-server sshd[4112]: Finished adding key for developer to authorized_keys',
    'log',
    FALSE, NULL, NULL,
    ARRAY['authentication', 'ssh', 'log_analysis'],
    '{"permissions": "-rw-r-----", "owner": "root", "group": "adm"}'::jsonb
),

-- ── /var/log/auth.log.1 ─────────────────────────────────────────────────────
-- HIDDEN — revealed after MALICIOUS_KEY_IDENTIFIED
-- Rotated log showing clean state before intrusion
(
    (SELECT scenario_id FROM s),
    'auth.log.1',
    '/var/log/auth.log.1',
    'Apr 16 08:00:00 prod-server sshd[1122]: Accepted publickey for developer from 192.168.1.100 port 22341
Apr 16 08:00:01 prod-server sshd[1122]: pam_unix(sshd:session): session opened for user developer
Apr 16 08:05:30 prod-server sshd[1122]: Received disconnect from 192.168.1.100 port 22341
Apr 16 13:20:44 prod-server sshd[2891]: Accepted publickey for developer from 192.168.1.100 port 37892
Apr 16 13:20:44 prod-server sshd[2891]: pam_unix(sshd:session): session opened for user developer
Apr 16 13:21:10 prod-server sshd[2891]: Received disconnect from 192.168.1.100 port 37892',
    'log',
    TRUE, NULL, 'MALICIOUS_KEY_IDENTIFIED',
    ARRAY['authentication', 'ssh', 'log_analysis', 'rotated_log'],
    '{"permissions": "-rw-r-----", "owner": "root", "group": "adm"}'::jsonb
),

-- ── /etc directory ──────────────────────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    'etc', '/etc', NULL, 'directory',
    FALSE, NULL, NULL, NULL, NULL
),

-- ── /etc/ssh directory ──────────────────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    'ssh', '/etc/ssh', NULL, 'directory',
    FALSE, NULL, NULL,
    ARRAY['configuration'],
    '{"permissions": "drwxr-xr-x", "owner": "root"}'::jsonb
),

-- ── /etc/ssh/sshd_config ────────────────────────────────────────────────────
-- Shows SSH hardening status (bonus discovery)
(
    (SELECT scenario_id FROM s),
    'sshd_config',
    '/etc/ssh/sshd_config',
    '# SSH daemon configuration
Port 22
Protocol 2
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
ChallengeResponseAuthentication no
AllowUsers developer admin
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2',
    'text',
    FALSE, NULL, NULL,
    ARRAY['configuration', 'ssh_hardening'],
    '{"permissions": "-rw-r--r--", "owner": "root", "modified": "2025-01-10T12:00:00Z"}'::jsonb
),

-- ── /home/developer/.ssh/authorized_keys.backup ─────────────────────────────
-- HIDDEN — revealed after SSH_CONFIG_EXAMINED
-- Clean backup from 2 weeks ago — proves the third key is malicious
(
    (SELECT scenario_id FROM s),
    'authorized_keys.backup',
    '/home/developer/.ssh/authorized_keys.backup',
    'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDM+3jKp7Q8xL9mN2vR4tY6uI8oP0zQ1wE2rT3yU4iO5pA6sD7fG8hJ9kL0zX1cV2bN3mM4qW5eR6tY7uI8oP9zQ0wE1rT2y developer@workstation
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7xL8mN2vR4tY6uI8oP0zQ1wE2rT3yU4iO5pA6sD7fG8hJ9kL0zX1cV2bN3mM4qW5eR6tY7uI8oP9zQ0wE1rT2y admin@backup-server',
    'text',
    TRUE, NULL, 'SSH_CONFIG_EXAMINED',
    ARRAY['ssh', 'backup', 'forensic_artifact'],
    '{"permissions": "-rw-------", "owner": "developer", "modified": "2025-04-05T10:00:00Z"}'::jsonb
),

-- ── /tmp directory ─────────────────────────────────────────────────────────
(
    (SELECT scenario_id FROM s),
    'tmp', '/tmp', NULL, 'directory',
    FALSE, NULL, NULL, NULL, NULL
),

-- ── /tmp/attacker_ip.txt ────────────────────────────────────────────────────
-- HIDDEN — revealed after AUTH_LOG_IP_TRACED
-- Attacker's note left on system
(
    (SELECT scenario_id FROM s),
    'attacker_ip.txt',
    '/tmp/attacker_ip.txt',
    '=== BACKDOOR DEPLOYMENT ===
Attacker C2: 10.0.0.5
Compromise timestamp: 2025-04-18 02:15:30
Method: SSH key injection via exposed .git credentials
Backdoor key added to /home/developer/.ssh/authorized_keys
Key comment: "admin-backup@unknown"
Maintain access until: 2025-05-01
=== DO NOT REMOVE ===',
    'text',
    TRUE, NULL, 'AUTH_LOG_IP_TRACED',
    ARRAY['forensic_artifact', 'attacker_evidence'],
    '{"permissions": "-rw-r--r--", "owner": "root", "modified": "2025-04-18T02:16:00Z"}'::jsonb
);

-- =============================================================================
-- SECTION 3: EXPECTED STEPS
-- =============================================================================
-- These steps serve dual purpose:
--   1. Keep the hint level system (playerStateAnalyzer) fully functional
--   2. Provide the "primary path" for direct-match players
--
-- Weights: 10 + 20 + 25 + 25 + 20 = 100
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Ghost Key'
    ORDER BY created_at DESC LIMIT 1
)

INSERT INTO expected_steps (scenario_id, step_order, command_expected, target_path, weight_percent, description)
VALUES
(
    (SELECT scenario_id FROM s),
    1, 'ls', '/home/developer/.ssh', 10,
    'Located the SSH configuration directory containing authorized_keys'
),
(
    (SELECT scenario_id FROM s),
    2, 'cat', '/home/developer/.ssh/authorized_keys', 20,
    'Read the authorized_keys file containing all approved public keys'
),
(
    (SELECT scenario_id FROM s),
    3, 'grep', '/home/developer/.ssh/authorized_keys', 25,
    'Identified the suspicious key by its unusual comment "admin-backup@unknown"'
),
(
    (SELECT scenario_id FROM s),
    4, 'cat', '/var/log/auth.log', 25,
    'Analyzed authentication logs to trace the intrusion timeline'
),
(
    (SELECT scenario_id FROM s),
    5, 'grep', '/var/log/auth.log', 20,
    'Traced the attacker IP (10.0.0.5) and confirmed the key addition method'
);

-- =============================================================================
-- SECTION 4: SCENARIO DISCOVERIES
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Ghost Key'
    ORDER BY created_at DESC LIMIT 1
)

INSERT INTO scenario_discoveries
    (scenario_id, discovery_key, title, description, evidence_tags,
     weight_percent, discovery_order, is_critical, maps_to_step_order, reveal_hint, severity_level)
VALUES

-- ── Discovery 1: SSH_DIR_ACCESSED (awareness, 10 pts) ──────────────────────
-- Fires when player navigates to or finds the .ssh directory
(
    (SELECT scenario_id FROM s),
    'SSH_DIR_ACCESSED',
    'SSH Directory Located',
    'The player accessed the .ssh directory, revealing where SSH keys are stored.',
    ARRAY['ssh', 'directory_access'],
    10, 1, TRUE, 1,
    'SSH configuration directory found. Look for authorized_keys — that file controls who can log in.',
    'awareness'
),

-- ── Discovery 2: AUTHORIZED_KEYS_READ (confirmation, 20 pts) ──────────────
-- Fires when player reads the authorized_keys file
(
    (SELECT scenario_id FROM s),
    'AUTHORIZED_KEYS_READ',
    'Authorized Keys Examined',
    'The player read the authorized_keys file containing all approved public keys.',
    ARRAY['ssh', 'authorization', 'key_analysis'],
    20, 2, TRUE, 2,
    'Three keys are present. One of them has an unusual comment — investigate which one doesn''t belong.',
    'confirmation'
),

-- ── Discovery 3: MALICIOUS_KEY_IDENTIFIED (critical, 25 pts) ──────────────
-- Fires when player identifies the suspicious key
-- Reveals auth.log.1 (rotated log for comparison)
(
    (SELECT scenario_id FROM s),
    'MALICIOUS_KEY_IDENTIFIED',
    'Unauthorized Key Identified',
    'The player identified the key with comment "admin-backup@unknown" — this key does not belong.',
    ARRAY['ssh', 'malicious_key', 'backdoor'],
    25, 3, TRUE, 3,
    'The third key with "@unknown" is suspicious. Check authentication logs to see who added it and when.',
    'critical'
),

-- ── Discovery 4: AUTH_LOG_IP_TRACED (analysis, 25 pts) ────────────────────
-- Fires when player reads auth.log
-- Reveals attacker_ip.txt
(
    (SELECT scenario_id FROM s),
    'AUTH_LOG_IP_TRACED',
    'Authentication Log Analyzed',
    'The player reviewed authentication logs and identified the attacker IP 10.0.0.5.',
    ARRAY['log_analysis', 'authentication', 'ip_tracing'],
    25, 4, TRUE, 4,
    'Auth log shows a login from 10.0.0.5 at 02:15 AM — an IP outside normal working hours. Look for key addition events.',
    'analysis'
),

-- ── Discovery 5: ATTACKER_ENTRY_CONFIRMED (conclusion, 20 pts) ─────────────
-- Fires when player traces the key addition to the attacker IP
(
    (SELECT scenario_id FROM s),
    'ATTACKER_ENTRY_CONFIRMED',
    'Attacker Entry Point Confirmed',
    'The player confirmed that the unauthorized key was added from IP 10.0.0.5 at 02:15:45.',
    ARRAY['forensic_confirmation', 'incident_timeline'],
    20, 5, TRUE, 5,
    'Key addition event traced to 10.0.0.5. The attacker injected their key after authenticating with stolen credentials.',
    'conclusion'
),

-- ── Discovery 6: SSH_CONFIG_EXAMINED (bonus) ───────────────────────────────
-- Fires when player reads sshd_config
-- Reveals authorized_keys.backup (clean backup for comparison)
(
    (SELECT scenario_id FROM s),
    'SSH_CONFIG_EXAMINED',
    'SSH Hardening Configuration Reviewed',
    'The player examined the SSH daemon configuration to assess security posture.',
    ARRAY['configuration', 'hardening'],
    0, 6, FALSE, NULL,
    'The configuration shows PermitRootLogin no and password auth disabled — good security practices. Compare with backup to confirm intrusion.',
    'awareness'
),

-- ── Discovery 7: ACTIVE_SESSION_FOUND (bonus) ──────────────────────────────
-- Fires when player runs ps and sees an active SSH session
(
    (SELECT scenario_id FROM s),
    'ACTIVE_SESSION_FOUND',
    'Active SSH Session Detected',
    'The player checked running processes and found an active SSH session — the attacker may still be connected.',
    ARRAY['process_activity', 'live_response'],
    0, 7, FALSE, NULL,
    'Process list shows an active sshd session. The attacker might still have access.',
    'awareness'
);

-- =============================================================================
-- SECTION 5: DISCOVERY TRIGGERS
-- =============================================================================
-- Each discovery can be unlocked by ANY of its listed triggers.
-- trigger_command + target_pattern + match_type = the matching rule.
-- =============================================================================

WITH d AS (
    SELECT disc.discovery_id, disc.discovery_key
    FROM scenario_discoveries disc
    JOIN scenarios s ON s.scenario_id = disc.scenario_id
    WHERE s.title = 'Ghost Key'
    ORDER BY s.created_at DESC
)

INSERT INTO discovery_triggers
    (discovery_id, trigger_command, target_pattern, match_type, name_filter_pattern)
VALUES

-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVERY 1: SSH_DIR_ACCESSED
-- ═══════════════════════════════════════════════════════════════════════════

-- Direct listing
((SELECT discovery_id FROM d WHERE discovery_key = 'SSH_DIR_ACCESSED'),
 'ls', '/home/developer/.ssh', 'exact', NULL),

-- Navigation into directory
((SELECT discovery_id FROM d WHERE discovery_key = 'SSH_DIR_ACCESSED'),
 'cd', '/home/developer/.ssh', 'exact', NULL),

-- Find .ssh anywhere
((SELECT discovery_id FROM d WHERE discovery_key = 'SSH_DIR_ACCESSED'),
 'find', '/home', 'prefix', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'SSH_DIR_ACCESSED'),
 'find', NULL, 'exact', '.ssh'),

-- Locate command
((SELECT discovery_id FROM d WHERE discovery_key = 'SSH_DIR_ACCESSED'),
 'locate', '.ssh', 'contains', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'SSH_DIR_ACCESSED'),
 'locate', 'authorized_keys', 'contains', NULL),


-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVERY 2: AUTHORIZED_KEYS_READ
-- ═══════════════════════════════════════════════════════════════════════════

((SELECT discovery_id FROM d WHERE discovery_key = 'AUTHORIZED_KEYS_READ'),
 'cat', '/home/developer/.ssh/authorized_keys', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'AUTHORIZED_KEYS_READ'),
 'strings', '/home/developer/.ssh/authorized_keys', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'AUTHORIZED_KEYS_READ'),
 'grep', '/home/developer/.ssh/authorized_keys', 'exact', NULL),


-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVERY 3: MALICIOUS_KEY_IDENTIFIED
-- ═══════════════════════════════════════════════════════════════════════════

-- Grep for the suspicious comment
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_KEY_IDENTIFIED'),
 'grep', '/home/developer/.ssh/authorized_keys', 'exact', NULL),

-- Cat then visual identification (also counts)
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_KEY_IDENTIFIED'),
 'cat', '/home/developer/.ssh/authorized_keys', 'exact', NULL),

-- Strings extraction
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_KEY_IDENTIFIED'),
 'strings', '/home/developer/.ssh/authorized_keys', 'exact', NULL),

-- Search for "unknown" pattern
((SELECT discovery_id FROM d WHERE discovery_key = 'MALICIOUS_KEY_IDENTIFIED'),
 'grep', '/home/developer/.ssh', 'prefix', NULL),


-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVERY 4: AUTH_LOG_IP_TRACED
-- ═══════════════════════════════════════════════════════════════════════════

((SELECT discovery_id FROM d WHERE discovery_key = 'AUTH_LOG_IP_TRACED'),
 'cat', '/var/log/auth.log', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'AUTH_LOG_IP_TRACED'),
 'strings', '/var/log/auth.log', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'AUTH_LOG_IP_TRACED'),
 'grep', '/var/log/auth.log', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'AUTH_LOG_IP_TRACED'),
 'locate', 'auth.log', 'contains', NULL),


-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVERY 5: ATTACKER_ENTRY_CONFIRMED
-- ═══════════════════════════════════════════════════════════════════════════

-- Grep for the specific attacker IP
((SELECT discovery_id FROM d WHERE discovery_key = 'ATTACKER_ENTRY_CONFIRMED'),
 'grep', '/var/log/auth.log', 'exact', NULL),

-- Reading the attacker's note file (if revealed)
((SELECT discovery_id FROM d WHERE discovery_key = 'ATTACKER_ENTRY_CONFIRMED'),
 'cat', '/tmp/attacker_ip.txt', 'exact', NULL),

-- Strings on auth.log
((SELECT discovery_id FROM d WHERE discovery_key = 'ATTACKER_ENTRY_CONFIRMED'),
 'strings', '/var/log/auth.log', 'exact', NULL),

-- Searching for key addition pattern
((SELECT discovery_id FROM d WHERE discovery_key = 'ATTACKER_ENTRY_CONFIRMED'),
 'grep', '/var/log', 'prefix', NULL),


-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVERY 6: SSH_CONFIG_EXAMINED (Bonus)
-- ═══════════════════════════════════════════════════════════════════════════

((SELECT discovery_id FROM d WHERE discovery_key = 'SSH_CONFIG_EXAMINED'),
 'cat', '/etc/ssh/sshd_config', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'SSH_CONFIG_EXAMINED'),
 'strings', '/etc/ssh/sshd_config', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'SSH_CONFIG_EXAMINED'),
 'grep', '/etc/ssh/sshd_config', 'exact', NULL),

((SELECT discovery_id FROM d WHERE discovery_key = 'SSH_CONFIG_EXAMINED'),
 'locate', 'sshd_config', 'contains', NULL),


-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVERY 7: ACTIVE_SESSION_FOUND (Bonus)
-- ═══════════════════════════════════════════════════════════════════════════

((SELECT discovery_id FROM d WHERE discovery_key = 'ACTIVE_SESSION_FOUND'),
 'ps', NULL, 'exact', NULL);

-- =============================================================================
-- SECTION 6: OBJECTIVES
-- =============================================================================
-- Objectives are triggered when their mapped step_order is credited
-- (directly or via discovery)
-- =============================================================================

WITH s AS (
    SELECT scenario_id FROM scenarios
    WHERE title = 'Ghost Key'
    ORDER BY created_at DESC LIMIT 1
)

INSERT INTO objectives (scenario_id, title, description, is_secret, trigger_step, xp_reward, objective_order)
VALUES

(
    (SELECT scenario_id FROM s),
    'LOCATE_SSH_DIR',
    'Find the .ssh directory for the developer account and examine its contents.',
    FALSE, 1, 0, 1
),
(
    (SELECT scenario_id FROM s),
    'EXAMINE_AUTHORIZED_KEYS',
    'Read the authorized_keys file to see all approved public keys.',
    FALSE, 2, 0, 2
),
(
    (SELECT scenario_id FROM s),
    'FIND_UNUSUAL_KEY',
    'Identify which key in authorized_keys does not belong to a legitimate user.',
    FALSE, 3, 0, 3
),
(
    (SELECT scenario_id FROM s),
    'CHECK_AUTH_LOG',
    'Review authentication logs to understand when and how the unauthorized key was added.',
    FALSE, 4, 0, 4
),
(
    (SELECT scenario_id FROM s),
    'CONFIRM_BREACH',
    'Trace the attacker IP address and confirm the key addition method.',
    FALSE, 5, 0, 5
),
(
    (SELECT scenario_id FROM s),
    'FIND_BACKUP_COMPARISON',
    'Locate the backup of authorized_keys and compare it with the current file to confirm exactly which key was added.',
    TRUE, NULL, 150, 6
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Scenario inserted
SELECT scenario_id, title, type, difficulty, is_active, scenario_order
FROM scenarios
WHERE title = 'Ghost Key';

-- All virtual files
SELECT virtual_file_id, file_name, file_path, file_type, is_hidden,
       reveal_at_step, reveal_at_discovery_key, evidence_tags
FROM virtual_files
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Ghost Key' ORDER BY created_at DESC LIMIT 1
)
ORDER BY file_path;

-- Expected steps with weights sum
SELECT step_order, command_expected, target_path, weight_percent
FROM expected_steps
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Ghost Key' ORDER BY created_at DESC LIMIT 1
)
ORDER BY step_order;

SELECT SUM(weight_percent) AS total_step_weight
FROM expected_steps
WHERE scenario_id = (
    SELECT scenario_id FROM scenarios WHERE title = 'Ghost Key' ORDER BY created_at DESC LIMIT 1);