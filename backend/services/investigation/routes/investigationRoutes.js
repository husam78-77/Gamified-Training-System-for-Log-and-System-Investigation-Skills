const express = require('express');
const router = express.Router();
const investigationController = require('../controllers/investigationController');
const verifyToken = require('../../../middleware/authMiddleware');

// All investigation routes are protected — the current investigation is resolved from req.user
router.use(verifyToken);

// GET /api/investigation/current — the player's active session, scenario, and incident
router.get('/current', investigationController.getCurrent);

// GET /api/investigation/report — fetch the player's Investigation Report
router.get('/report', investigationController.getReport);

// PUT /api/investigation/report — save the player's Investigation Report
router.put('/report', investigationController.saveReport);

// POST /api/investigation/submit — submit the report + terminal history, freeze session, run AI review
router.post('/submit', investigationController.submit);

// GET /api/investigation/review/:sessionId — fetch a previously generated AI review
router.get('/review/:sessionId', investigationController.getReview);

// POST /api/investigation/event — generic Investigation Event logging for any application
router.post('/event', investigationController.logEvent);

module.exports = router;
