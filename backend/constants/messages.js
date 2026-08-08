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
    RESUME_STATE_FETCHED: 'Session resume state retrieved',

    // ── Hints ─────────────────────────────────────────────
    HINT_GENERATED: 'Hint generated',
    HINT_LOG_FETCHED: 'Hint log retrieved',
    HINT_LIMIT_REACHED: 'Hint limit reached for this session',

    // ── Desktop ───────────────────────────────────────────
    DESKTOP_FETCHED: 'Desktop workspace retrieved',

    // ── Email ─────────────────────────────────────────────
    EMAILS_FETCHED: 'Emails retrieved successfully',

    // ── Files ─────────────────────────────────────────────
    FILES_FETCHED: 'Virtual filesystem retrieved successfully',

    // ── Browser ───────────────────────────────────────────
    BROWSER_FETCHED: 'Browser content retrieved successfully',

    // ── Investigation ─────────────────────────────────────
    INVESTIGATION_FETCHED: 'Current investigation retrieved successfully',
    INVESTIGATION_NOT_FOUND: 'No active investigation for this user',

    // ── Investigation Report ──────────────────────────────
    REPORT_FETCHED: 'Investigation report retrieved successfully',
    REPORT_SAVED: 'Investigation report saved',

    // ── Investigation Events ──────────────────────────────
    EVENT_LOGGED: 'Event logged',

    // ── Submission / AI Review ────────────────────────────
    SUBMISSION_INCOMPLETE: 'Submission requires a completed investigation report and terminal history',
    INVESTIGATION_SUBMITTED: 'Investigation submitted for review',
    REVIEW_FETCHED: 'AI review retrieved successfully',
    REVIEW_NOT_FOUND: 'No review exists for this session yet',
};