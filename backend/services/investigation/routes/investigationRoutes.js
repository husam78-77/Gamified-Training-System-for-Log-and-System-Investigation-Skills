const express = require('express');
const router = express.Router();
const investigationController = require('../controllers/investigationController');
const verifyToken = require('../../../middleware/authMiddleware');

// All investigation routes are protected — the current investigation is resolved from req.user
router.use(verifyToken);

// GET /api/investigation/current — the player's active session, scenario, and incident
router.get('/current', investigationController.getCurrent);

module.exports = router;
