const { body, validationResult } = require('express-validator');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

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

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number'),
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

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return response.error(res, 400, MESSAGES.INVALID_INPUT, errors.array());
    }
    next();
};

module.exports = { registerValidationRules, loginValidationRules, validate };