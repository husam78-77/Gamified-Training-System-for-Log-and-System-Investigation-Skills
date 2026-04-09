const authService = require('../services/authService');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

const register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const result = await authService.registerUser({ username, email, password, role });
        if (result.conflict) return response.error(res, 409, MESSAGES.USER_EXISTS);
        return response.success(res, 201, MESSAGES.USER_CREATED, { user: result.user });
    } catch (err) {
        console.error('Register error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.loginUser({ email, password });
        if (result.notFound) return response.error(res, 401, MESSAGES.INVALID_CREDENTIALS);
        return response.success(res, 200, MESSAGES.LOGIN_SUCCESS, {
            token: result.token,
            user: result.user,
        });
    } catch (err) {
        console.error('Login error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

// 👇 Add this
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);

        // Always return success to prevent email enumeration
        return response.success(res, 200, 'If this email exists, a temporary password has been sent.');
    } catch (err) {
        console.error('Forgot password error:', err);
        return response.error(res, 500, MESSAGES.SERVER_ERROR);
    }
};

module.exports = { register, login, forgotPassword };