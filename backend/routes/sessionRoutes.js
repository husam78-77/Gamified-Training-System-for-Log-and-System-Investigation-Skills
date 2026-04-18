const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const verifyToken = require('../middleware/authMiddleware');

// All session routes are protected
router.use(verifyToken);

// GET  /api/sessions/next-scenario  — what scenario comes next (read-only)
// IMPORTANT: this must be defined BEFORE /:sessionId to avoid route collision
router.get('/next-scenario', sessionController.getNextScenario);

// POST /api/sessions/start          — start or resume session (mode only, no scenario_id)
router.post('/start', sessionController.startSession);

// GET  /api/sessions/:sessionId     — get session data
router.get('/:sessionId', sessionController.getSession);

// POST /api/sessions/:sessionId/abandon   — discard session (timed mode exit)
router.post('/:sessionId/abandon', sessionController.abandonSession);

// POST /api/sessions/:sessionId/complete  — finalize, score, award XP
router.post('/:sessionId/complete', sessionController.completeSession);

module.exports = router;