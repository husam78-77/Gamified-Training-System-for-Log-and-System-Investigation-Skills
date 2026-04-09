const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userModel = require('../models/userModel');
const { sendWelcomeEmail, sendTempPasswordEmail } = require('../utils/emailSender');

const SALT_ROUNDS = 12;

const registerUser = async ({ username, email, password, role }) => {
    const existingUser = await userModel.findByUsernameOrEmail(username, email);
    if (existingUser) return { conflict: true };

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await userModel.createUser({ username, email, passwordHash, role });
    await sendWelcomeEmail(email, username);

    return { conflict: false, user: newUser };
};

const loginUser = async ({ email, password }) => {
    const user = await userModel.findByEmail(email);
    if (!user) return { notFound: true };

    // 1. Check real password first
    const isMatch = await bcrypt.compare(password, user.password_hash);

    // 2. If real password fails, check temp password
    if (!isMatch) {
        const hasTempPassword = user.temp_password_hash && user.temp_password_expires;
        const tempNotExpired = hasTempPassword && new Date() < new Date(user.temp_password_expires);

        if (!tempNotExpired) return { notFound: true };

        const isTempMatch = await bcrypt.compare(password, user.temp_password_hash);
        if (!isTempMatch) return { notFound: true };
    }

    const token = jwt.sign(
        { user_id: user.user_id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
        notFound: false,
        token,
        user: {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
        },
    };
};

// 👇 New forgot password service
const forgotPassword = async (email) => {
    const user = await userModel.findByEmail(email);
    if (!user) return { notFound: true };

    // Generate random 10-char temp password
    const tempPassword = crypto.randomBytes(5).toString('hex').toUpperCase();
    const tempPasswordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await userModel.saveTempPassword(email, tempPasswordHash);
    await sendTempPasswordEmail(email, user.username, tempPassword);

    return { notFound: false };
};

module.exports = { registerUser, loginUser, forgotPassword };