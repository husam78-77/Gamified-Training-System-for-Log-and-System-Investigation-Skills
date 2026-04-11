const jwt = require('jsonwebtoken');
const response = require('../utils/responseHelper');
const MESSAGES = require('../constants/messages');

const verifyToken = (req, res, next) => {
    // Look for the token in the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

    if (!token) {
        return response.error(res, 401, 'ACCESS_DENIED: No security token provided.');
    }

    try {
        // Decrypt the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach the user payload (contains user_id) to the request
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        return response.error(res, 403, 'ACCESS_DENIED: Token invalid or expired.');
    }
};

module.exports = verifyToken;