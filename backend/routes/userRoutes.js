const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

// GET /api/users/profile
// Protected route: Requires a valid JWT token
router.get('/profile', verifyToken, userController.getProfile);
// Post
router.post('/change-password', verifyToken, userController.changePassword);
module.exports = router;