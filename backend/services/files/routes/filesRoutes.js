const express = require('express');
const router = express.Router();
const filesController = require('../controllers/filesController');

// GET /api/files — fetch the incident's virtual filesystem
router.get('/', filesController.getFiles);

module.exports = router;
