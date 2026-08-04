const express = require('express');
const router = express.Router();
const browserController = require('../controllers/browserController');

// GET /api/browser — fetch the incident's Knowledge Browser content
router.get('/', browserController.getBrowser);

module.exports = router;
