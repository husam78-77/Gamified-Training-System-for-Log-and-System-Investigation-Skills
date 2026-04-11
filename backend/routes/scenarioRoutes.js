const express = require('express');
const router = express.Router();
const scenarioController = require('../controllers/scenarioController');
const verifyToken = require('../middleware/authMiddleware');

// GET /api/scenarios — all active scenarios (dashboard)
router.get('/', scenarioController.getAllScenarios);

// GET /api/scenarios/type/:type — levels by type (sequence page)
router.get('/type/:type', scenarioController.getScenariosByType);

// GET /api/scenarios/:scenarioId — single scenario meta + objectives (briefing)
router.get('/:scenarioId', scenarioController.getScenarioById);

// GET /api/scenarios/:scenarioId/full — full data to boot GamingEnvironment (protected)
router.get('/:scenarioId/full', verifyToken, scenarioController.getFullScenarioData);

module.exports = router;