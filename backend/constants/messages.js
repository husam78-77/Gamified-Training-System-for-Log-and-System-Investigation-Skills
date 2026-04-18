module.exports = {
    // ── Auth ──────────────────────────────────────────────
    USER_CREATED: 'User registered successfully',
    USER_EXISTS: 'Username or email already exists',
    INVALID_INPUT: 'Invalid input data',
    SERVER_ERROR: 'Internal server error',
    LOGIN_SUCCESS: 'Login successful',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_NOT_FOUND: 'Email not found',

    // ── Scenarios ─────────────────────────────────────────
    SCENARIOS_FETCHED: 'Scenarios retrieved successfully',
    SCENARIO_FETCHED: 'Scenario retrieved successfully',
    SCENARIO_NOT_FOUND: 'Scenario not found or inactive',

    // ── Sessions ──────────────────────────────────────────
    SESSION_STARTED: 'Session initialized',
    SESSION_RESUMED: 'Active session resumed',
    SESSION_FETCHED: 'Session retrieved successfully',
    SESSION_COMPLETED: 'Mission complete. Evaluation saved.',
    SESSION_ABANDONED: 'Session abandoned. No progress saved.',
    SESSION_NOT_FOUND: 'Session not found',
    SESSION_ALREADY_CLOSED: 'Session is no longer active',
    INVALID_MODE: "Mode must be 'timed' or 'free'",
    ALL_SCENARIOS_COMPLETE: 'All scenarios completed',

    // ── Terminal ──────────────────────────────────────────
    COMMAND_PROCESSED: 'Command processed',
    HISTORY_FETCHED: 'Command history retrieved',

    // ── Hints ─────────────────────────────────────────────
    HINT_GENERATED: 'Hint generated',
    HINT_LOG_FETCHED: 'Hint log retrieved',
    HINT_LIMIT_REACHED: 'Hint limit reached for this session',
};