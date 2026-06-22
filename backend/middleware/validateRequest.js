const { body, validationResult } = require('express-validator');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

// Shared password strength policy — used by registration AND password change
// so the rule set can never drift between the two. `field` lets the same
// rules attach to either body('password') or body('newPassword').
const passwordStrengthRules = (field) => [
    body(field)
        .notEmpty().withMessage(`${field} is required`)
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number'),
];

const registerValidationRules = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters')
        .isAlphanumeric().withMessage('Username must be alphanumeric'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    ...passwordStrengthRules('password'),
];

// 👇 This was missing entirely
const loginValidationRules = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),
];

// Applies the same strength policy as registration to the new password on
// the change-password endpoint. currentPassword/confirmPassword presence
// and match checks stay in userController — this only enforces strength.
const changePasswordValidationRules = passwordStrengthRules('newPassword');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return response.error(res, 400, MESSAGES.INVALID_INPUT, errors.array());
    }
    next();
};

module.exports = {
    registerValidationRules,
    loginValidationRules,
    changePasswordValidationRules,
    validate,
};