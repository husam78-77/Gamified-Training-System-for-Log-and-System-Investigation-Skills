const express = require('express');
const router = express.Router();
const hintController = require('../controllers/hintController');
const verifyToken = require('../middleware/authMiddleware');

// All hint routes are protected
router.use(verifyToken);

// POST /api/hints/request — request an AI hint
router.post('/request', hintController.requestHint);

// GET /api/hints/:sessionId — get all hints for a session
router.get('/:sessionId', hintController.getHintLog);

module.exports = router;