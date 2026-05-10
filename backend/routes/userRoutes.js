const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

// GET /api/users/profile
router.get('/profile', verifyToken, userController.getProfile);
// GET /api/users/progression — full investigator progression data for the Progress page
router.get('/progression', verifyToken, userController.getProgression);
// POST /api/users/change-password
router.post('/change-password', verifyToken, userController.changePassword);
module.exports = router;