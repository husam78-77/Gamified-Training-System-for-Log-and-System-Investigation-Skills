-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    temp_password_hash TEXT DEFAULT NULL,
    temp_password_expires TIMESTAMP DEFAULT NULL,
	level INT DEFAULT 1,
	xp INT DEFAULT 0;
);


-- =========================
-- SCENARIOS
-- =========================
CREATE TABLE scenarios (
    scenario_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20),
    mission_brief TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- VIRTUAL FILES
-- =========================
CREATE TABLE virtual_files (
    virtual_file_id SERIAL PRIMARY KEY,
    scenario_id INT NOT NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(255) NOT NULL,
    content TEXT,
    file_type VARCHAR(50),

    CONSTRAINT fk_virtual_files_scenario
        FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_file_per_scenario
        UNIQUE (scenario_id, file_path)
);


-- =========================
-- EXPECTED STEPS
-- =========================
CREATE TABLE expected_steps (
    expected_step_id SERIAL PRIMARY KEY,
    scenario_id INT NOT NULL,
    step_order INT NOT NULL,
    command_expected VARCHAR(255),
    target_path VARCHAR(255),
    weight_percent INT,
    description TEXT,

    CONSTRAINT fk_expected_steps_scenario
        FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_step_per_scenario
        UNIQUE (scenario_id, step_order)
);


-- =========================
-- SESSIONS
-- =========================
CREATE TABLE sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    scenario_id INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    final_score INT,
    status VARCHAR(20) DEFAULT 'in_progress',

    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sessions_scenario
        FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_scenario
ON sessions(user_id, scenario_id);


-- =========================
-- COMMAND HISTORY
-- =========================
CREATE TABLE command_history (
    command_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    command_entered TEXT,
    match_expected BOOLEAN,
    match_step_order INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_command_history_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_command_history_session
ON command_history(session_id);


-- =========================
-- EVALUATION RESULTS
-- =========================
CREATE TABLE evaluation_results (
    evaluation_id SERIAL PRIMARY KEY,
    session_id INT UNIQUE NOT NULL,
    command_usage_score INT,
    path_score INT,
    conclusion_score INT,
    total_weighted_score INT,
    partial_credit BOOLEAN,

    CONSTRAINT fk_evaluation_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE
);


-- =========================
-- USER PROGRESS
-- =========================
CREATE TABLE user_progress (
    progress_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    scenario_id INT NOT NULL,
    highest_score INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_progress_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_progress_scenario
        FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_user_scenario_progress
        UNIQUE (user_id, scenario_id)
);


-- =========================
-- AI HINT LOG
-- =========================
CREATE TABLE ai_hint_log (
    hint_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    trigger_commands TEXT,
    prompt_sent TEXT,
    hint_returned TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ai_hint_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE
);


-- =========================
-- BADGES
-- =========================
CREATE TABLE badges (
    badge_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    scenario_id INT,
    badge_name VARCHAR(100),
    badge_type VARCHAR(50),
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_badges_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_badges_scenario
        FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_user_badge
        UNIQUE (user_id, scenario_id, badge_name)
);



-- sessions table needs a mode column
ALTER TABLE sessions ADD COLUMN mode VARCHAR(20) DEFAULT 'free';

-- virtual_files table needs hidden/reveal columns
ALTER TABLE virtual_files ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE virtual_files ADD COLUMN reveal_at_step INT DEFAULT NULL;

-- objectives table (doesn't exist yet, needs to be created)
CREATE TABLE objectives (
    objective_id SERIAL PRIMARY KEY,
    scenario_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_secret BOOLEAN DEFAULT FALSE,
    trigger_step INT DEFAULT NULL,
    xp_reward INT DEFAULT 0,
    objective_order INT NOT NULL,
    CONSTRAINT fk_objectives_scenario
        FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
        ON DELETE CASCADE,
    CONSTRAINT unique_objective_per_scenario
        UNIQUE (scenario_id, objective_order)
);



---------------
-- =============================================================================
-- TEST LEVEL: "The Front Door"
-- Type:       bruteforce
-- Difficulty: easy
-- Scenario ID will be auto-assigned (SERIAL) — check after insert
--
-- Run this file in order. Each section depends on the one above.
-- After running, note the scenario_id from the SELECT at the bottom.
-- =============================================================================


-- =============================================================================
-- STEP 1: INSERT SCENARIO
-- =============================================================================

INSERT INTO scenarios (title, type, difficulty, mission_brief, is_active)
VALUES (
    'The Front Door',
    'bruteforce',
    'easy',
    'A poorly secured admin portal has been flagged by automated threat detection. The system shows signs of a brute force attempt originating from an unknown node. Your mission: access the server logs, locate the attack signature, identify the source IP, and confirm the breach point. The attacker left traces — find them before the logs are rotated.',
    TRUE
);

-- Capture the new scenario_id for use in subsequent inserts
-- If you are running this manually, replace :scenario_id below with the actual number
-- You can find it with: SELECT scenario_id FROM scenarios WHERE title = 'The Front Door';


-- =============================================================================
-- STEP 2: INSERT VIRTUAL FILES
-- =============================================================================
-- File structure:
--   /
--   ├── logs/
--   │   ├── auth.log          ← visible from start (contains attack entries)
--   │   └── system.log        ← visible from start (normal system noise)
--   ├── etc/
--   │   └── passwd            ← visible from start (user accounts)
--   └── var/
--       └── report.txt        ← HIDDEN, revealed after step 3 (cat auth.log)
-- =============================================================================

WITH s AS (SELECT scenario_id FROM scenarios WHERE title = 'The Front Door' ORDER BY created_at DESC LIMIT 1)

INSERT INTO virtual_files (scenario_id, file_name, file_path, content, file_type, is_hidden, reveal_at_step)
VALUES

-- /logs/auth.log — main evidence file, visible from start
(
    (SELECT scenario_id FROM s),
    'auth.log',
    '/logs/auth.log',
    'Jan 15 02:11:04 server sshd[1337]: Failed password for root from 192.168.1.105 port 43210
Jan 15 02:11:06 server sshd[1337]: Failed password for root from 192.168.1.105 port 43211
Jan 15 02:11:08 server sshd[1337]: Failed password for root from 192.168.1.105 port 43212
Jan 15 02:11:10 server sshd[1337]: Failed password for root from 192.168.1.105 port 43213
Jan 15 02:11:12 server sshd[1337]: Failed password for root from 192.168.1.105 port 43214
Jan 15 02:11:14 server sshd[1337]: Failed password for admin from 192.168.1.105 port 43215
Jan 15 02:11:16 server sshd[1337]: Failed password for admin from 192.168.1.105 port 43216
Jan 15 02:11:18 server sshd[1337]: Accepted password for admin from 192.168.1.105 port 43217
Jan 15 02:11:19 server sshd[1337]: pam_unix(sshd:session): session opened for user admin
Jan 15 02:14:33 server sshd[1337]: Disconnected from user admin 192.168.1.105 port 43217',
    'log',
    FALSE,
    NULL
),

-- /logs/system.log — noise file, visible from start
(
    (SELECT scenario_id FROM s),
    'system.log',
    '/logs/system.log',
    'Jan 15 00:00:01 server systemd[1]: Starting Daily apt upgrade and clean activities...
Jan 15 00:05:22 server kernel: [UFW BLOCK] IN=eth0 OUT= MAC=... SRC=10.0.0.1 DST=10.0.0.5
Jan 15 01:00:00 server CRON[9823]: (root) CMD (test -x /usr/sbin/anacron || ...)
Jan 15 02:10:55 server kernel: [UFW ALLOW] IN=eth0 SRC=192.168.1.105 DST=10.0.0.5 PROTO=TCP
Jan 15 02:11:04 server sshd[1337]: Server listening on 0.0.0.0 port 22
Jan 15 06:00:00 server systemd[1]: Starting Daily Cleanup of Temporary Directories...',
    'log',
    FALSE,
    NULL
),

-- /etc/passwd — user list, visible from start
(
    (SELECT scenario_id FROM s),
    'passwd',
    '/etc/passwd',
    'root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
admin:x:1000:1000:System Administrator:/home/admin:/bin/bash
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin',
    'text',
    FALSE,
    NULL
),

-- /var/report.txt — HIDDEN, revealed after step 3 (cat /logs/auth.log)
(
    (SELECT scenario_id FROM s),
    'report.txt',
    '/var/report.txt',
    'AUTOMATED THREAT REPORT — GENERATED 02:15:00
======================================
INCIDENT TYPE   : Brute Force / Credential Stuffing
SOURCE IP       : 192.168.1.105
TARGET USER     : admin
ATTEMPTS        : 7
RESULT          : BREACH CONFIRMED
SESSION OPENED  : Jan 15 02:11:18
RECOMMENDATION  : Isolate node 192.168.1.105. Reset admin credentials immediately.
TICKET          : INC-20240115-007
======================================',
    'text',
    TRUE,
    3   -- revealed after step 3 (cat /logs/auth.log)
),

-- /var/ directory placeholder so `ls /var` works
(
    (SELECT scenario_id FROM s),
    'var',
    '/var',
    NULL,
    'directory',
    FALSE,
    NULL
),

-- /logs/ directory placeholder
(
    (SELECT scenario_id FROM s),
    'logs',
    '/logs',
    NULL,
    'directory',
    FALSE,
    NULL
),

-- /etc/ directory placeholder
(
    (SELECT scenario_id FROM s),
    'etc',
    '/etc',
    NULL,
    'directory',
    FALSE,
    NULL
);


-- =============================================================================
-- STEP 3: INSERT EXPECTED STEPS
-- =============================================================================
-- The exact investigation path the player should follow.
-- Each step has a weight_percent — they must sum to 100.
--
-- CORRECT PATH:
--   1. ls /logs                        → find log files
--   2. cat /etc/passwd                 → identify system users
--   3. cat /logs/auth.log              → read the attack log (reveals /var/report.txt)
--   4. grep 192.168.1.105 /logs/auth.log → isolate the attacker IP
--   5. cat /var/report.txt             → read the final incident report
-- =============================================================================

WITH s AS (SELECT scenario_id FROM scenarios WHERE title = 'The Front Door' ORDER BY created_at DESC LIMIT 1)

INSERT INTO expected_steps (scenario_id, step_order, command_expected, target_path, weight_percent, description)
VALUES
(
    (SELECT scenario_id FROM s),
    1,
    'ls',
    '/logs',
    15,
    'Listed the logs directory — identified available log files'
),
(
    (SELECT scenario_id FROM s),
    2,
    'cat',
    '/etc/passwd',
    15,
    'Read the passwd file — identified system users including admin account'
),
(
    (SELECT scenario_id FROM s),
    3,
    'cat',
    '/logs/auth.log',
    25,
    'Read the auth log — discovered brute force attempt and successful breach'
),
(
    (SELECT scenario_id FROM s),
    4,
    'grep',
    '/logs/auth.log',
    25,
    'Searched auth log for attacker IP — isolated the source of the attack'
),
(
    (SELECT scenario_id FROM s),
    5,
    'cat',
    '/var/report.txt',
    20,
    'Read the incident report — confirmed breach details and attacker identity'
);


-- =============================================================================
-- STEP 4: INSERT OBJECTIVES
-- =============================================================================

WITH s AS (SELECT scenario_id FROM scenarios WHERE title = 'The Front Door' ORDER BY created_at DESC LIMIT 1)

INSERT INTO objectives (scenario_id, title, description, is_secret, trigger_step, xp_reward, objective_order)
VALUES

-- Objective 1: Access the logs (triggered at step 1)
(
    (SELECT scenario_id FROM s),
    'ACCESS_LOG_DIRECTORY',
    'Navigate to the logs directory and identify available evidence files.',
    FALSE,
    1,
    0,
    1
),

-- Objective 2: Identify system users (triggered at step 2)
(
    (SELECT scenario_id FROM s),
    'IDENTIFY_SYSTEM_USERS',
    'Read the system user database to map potential attack targets.',
    FALSE,
    2,
    0,
    2
),

-- Objective 3: Locate the breach (triggered at step 3)
(
    (SELECT scenario_id FROM s),
    'LOCATE_BREACH_ENTRY',
    'Analyze the authentication log to find the point of unauthorized access.',
    FALSE,
    3,
    0,
    3
),

-- Objective 4: Trace the attacker (triggered at step 4)
(
    (SELECT scenario_id FROM s),
    'TRACE_ATTACKER_IP',
    'Isolate the attacker source IP from the log data.',
    FALSE,
    4,
    0,
    4
),

-- Objective 5 (SECRET): Read the full report (triggered at step 5)
-- Hidden until player discovers /var/report.txt
(
    (SELECT scenario_id FROM s),
    'RETRIEVE_INCIDENT_REPORT',
    'Locate and read the automated incident report. [CLASSIFIED]',
    TRUE,
    5,
    150,
    5
);


-- =============================================================================
-- VERIFICATION QUERIES
-- Run these after the inserts to confirm everything is correct
-- =============================================================================

-- Check scenario was created
SELECT scenario_id, title, type, difficulty, is_active
FROM scenarios
WHERE title = 'The Front Door';

-- Check all 7 files were created (3 dirs + 4 files)
SELECT virtual_file_id, file_name, file_path, file_type, is_hidden, reveal_at_step
FROM virtual_files
WHERE scenario_id = (SELECT scenario_id FROM scenarios WHERE title = 'The Front Door' ORDER BY created_at DESC LIMIT 1)
ORDER BY file_path;

-- Check 5 expected steps, weights sum to 100
SELECT step_order, command_expected, target_path, weight_percent, description
FROM expected_steps
WHERE scenario_id = (SELECT scenario_id FROM scenarios WHERE title = 'The Front Door' ORDER BY created_at DESC LIMIT 1)
ORDER BY step_order;

-- Check 5 objectives (4 visible, 1 secret)
SELECT objective_id, title, is_secret, trigger_step, xp_reward, objective_order
FROM objectives
WHERE scenario_id = (SELECT scenario_id FROM scenarios WHERE title = 'The Front Door' ORDER BY created_at DESC LIMIT 1)
ORDER BY objective_order;

-- Confirm weights sum to 100
SELECT SUM(weight_percent) AS total_weight
FROM expected_steps
WHERE scenario_id = (SELECT scenario_id FROM scenarios WHERE title = 'The Front Door' ORDER BY created_at DESC LIMIT 1);

























----------------------------------
-- =============================================================================
-- MIGRATION: Add scenario_order for deterministic progression
-- Run this ONCE against your database before deploying the new backend files.
-- =============================================================================

-- Step 1: Add the ordering column
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS scenario_order INT;

-- Step 2: Back-fill existing rows using created_at rank
-- This assigns order 1, 2, 3... based on insertion order
UPDATE scenarios
SET scenario_order = sub.rn
FROM (
    SELECT scenario_id,
           ROW_NUMBER() OVER (ORDER BY created_at ASC, scenario_id ASC) AS rn
    FROM scenarios
) sub
WHERE scenarios.scenario_id = sub.scenario_id;

-- Step 3: Make it NOT NULL and UNIQUE going forward
ALTER TABLE scenarios
ALTER COLUMN scenario_order SET NOT NULL;

ALTER TABLE scenarios
ADD CONSTRAINT unique_scenario_order UNIQUE (scenario_order);

-- Step 4: Add index for fast ordering queries
CREATE INDEX IF NOT EXISTS idx_scenarios_order
ON scenarios(scenario_order ASC)
WHERE is_active = TRUE;

-- Step 5: Add unique constraint to sessions to prevent duplicate active sessions
-- This is the database-level race condition fix
-- Only one in_progress session per user+scenario allowed at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_one_active_per_user_scenario
ON sessions(user_id, scenario_id)
WHERE status = 'in_progress';

-- Verify
SELECT scenario_id, title, scenario_order, created_at
FROM scenarios
ORDER BY scenario_order ASC;