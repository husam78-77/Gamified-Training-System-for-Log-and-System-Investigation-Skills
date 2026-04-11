const express = require('express');
const router = express.Router();
const terminalController = require('../controllers/terminalController');
const verifyToken = require('../middleware/authMiddleware');

// All terminal routes are protected
router.use(verifyToken);

// POST /api/terminal/execute — process a terminal command
router.post('/execute', terminalController.executeCommand);

// GET /api/terminal/history/:sessionId — get command history for a session
router.get('/history/:sessionId', terminalController.getHistory);

module.exports = router;