const express = require('express');
const router = express.Router();
const desktopController = require('../controllers/desktopController');
const verifyToken = require('../middleware/authMiddleware');

// All desktop routes are protected
// router.use(verifyToken);

// GET /api/desktop — fetch the full desktop workspace
router.get('/', desktopController.getDesktop);

module.exports = router;
