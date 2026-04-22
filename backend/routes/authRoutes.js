const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const { register, login, forgotPassword } = require('../controllers/authController');
const { registerValidationRules, loginValidationRules, validate } = require('../middleware/validateRequest');

router.post('/register', registerValidationRules, validate, register);
router.post('/login', loginValidationRules, validate, login);
router.post('/forgot-password', forgotPassword);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login`, session: false }),
    (req, res) => {
        const { exists, user, email } = req.user;
        if (exists) {
            const token = jwt.sign(
                { user_id: user.user_id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );
            const userData = encodeURIComponent(JSON.stringify({
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role,
            }));
            res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`);
        } else {
            res.redirect(`${process.env.FRONTEND_URL}/register?email=${encodeURIComponent(email)}`);
        }
    }
);

module.exports = router;