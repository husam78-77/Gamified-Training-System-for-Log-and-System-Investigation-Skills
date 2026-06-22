const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const { register, login, forgotPassword, createOAuthExchangeCode, exchangeOAuthCode } = require('../controllers/authController');
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
            const userData = {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role,
            };
            // The JWT never goes in the URL — only a short-lived, single-use
            // exchange code does. The frontend trades it for the token via
            // POST /api/auth/google/exchange.
            const code = createOAuthExchangeCode({ token, user: userData });
            res.redirect(`${process.env.FRONTEND_URL}/auth/callback?code=${code}`);
        } else {
            res.redirect(`${process.env.FRONTEND_URL}/register?email=${encodeURIComponent(email)}`);
        }
    }
);

// POST /api/auth/google/exchange — trade a one-time OAuth code for the JWT
router.post('/google/exchange', exchangeOAuthCode);

module.exports = router;