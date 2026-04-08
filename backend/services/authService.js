const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { sendWelcomeEmail } = require('../utils/emailSender');

const SALT_ROUNDS = 12;

const registerUser = async ({ username, email, password, role }) => {
    const existingUser = await userModel.findByUsernameOrEmail(username, email);
    if (existingUser) return { conflict: true };

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await userModel.createUser({ username, email, passwordHash, role });

    await sendWelcomeEmail(email, username);

    return { conflict: false, user: newUser };
};

// 👇 Add this
const loginUser = async ({ email, password }) => {
    // 1. Find user by email
    const user = await userModel.findByEmail(email);
    if (!user) return { notFound: true };

    // 2. Compare password with hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return { notFound: true }; // same response to prevent email enumeration

    // 3. Generate JWT
    const token = jwt.sign(
        {
            user_id: user.user_id,
            email: user.email,
            role: user.role,
        },
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

module.exports = { registerUser, loginUser };