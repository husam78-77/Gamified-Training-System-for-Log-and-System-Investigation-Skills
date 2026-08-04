const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// GET /api/email — fetch the incident email list
router.get('/', emailController.getEmails);

module.exports = router;
