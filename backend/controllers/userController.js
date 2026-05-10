const userModel = require('../models/userModel');
const progressionModel = require('../models/progressionModel');
const response = require('../utils/responseHelper');
const authService = require('../services/authService');

const getProfile = async (req, res) => {
    try {
        // req.user.user_id comes from the authMiddleware
        const userId = req.user.user_id;

        const profileData = await userModel.getUserProfileData(userId);

        if (!profileData) {
            return response.error(res, 404, 'OPERATIVE_NOT_FOUND');
        }

        // Calculate Account Age (Login_Streak / Active Duty Days)
        const createdAt = new Date(profileData.created_at);
        const now = new Date();
        const diffTime = Math.abs(now - createdAt);
        const accountAgeDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Format the data for the frontend
        const formattedProfile = {
            username: profileData.username,
            email: profileData.email,
            role: profileData.role,
            level: profileData.level,
            badgeCount: parseInt(profileData.badge_count, 10),
            totalScore: parseInt(profileData.total_score, 10),
            accountAgeDays: accountAgeDays === 0 ? 1 : accountAgeDays // Minimum 1 day
        };

        return response.success(res, 200, 'Profile data retrieved successfully', formattedProfile);
    } catch (err) {
        console.error('Get profile error:', err);
        return response.error(res, 500, 'SERVER_ERROR: Failed to fetch profile.');
    }
};

const changePassword = async (req, res) => {
    try {
        const userId = req.user.user_id; // From verifyToken middleware
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return response.error(res, 400, 'ALL_FIELDS_REQUIRED');
        }

        if (newPassword !== confirmPassword) {
            return response.error(res, 400, 'PAYLOAD_MISMATCH: Passwords do not match.');
        }

        const result = await authService.changePassword({ userId, currentPassword, newPassword });

        if (result.notFound) return response.error(res, 404, 'OPERATIVE_NOT_FOUND');
        if (result.unauthorized) return response.error(res, 401, 'ACCESS_DENIED: Invalid current key or expired temp key.');

        return response.success(res, 200, 'SECURITY_OVERRIDE_SUCCESS: Credentials updated.');
    } catch (err) {
        console.error('Change password error:', err);
        return response.error(res, 500, 'SYSTEM_ERROR: Override failed.');
    }
};

const getProgression = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const data = await progressionModel.getUserProgressionData(userId);
        if (!data) {
            return response.error(res, 404, 'OPERATIVE_NOT_FOUND');
        }
        return response.success(res, 200, 'Progression data retrieved', data);
    } catch (err) {
        console.error('getProgression error:', err);
        return response.error(res, 500, 'SERVER_ERROR: Failed to fetch progression.');
    }
};

module.exports = {
    getProfile,
    changePassword,
    getProgression,
};