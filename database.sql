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