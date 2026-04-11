const pool = require('../config/db');

const createUser = async ({ username, email, passwordHash, role = 'student' }) => {
    const query = `
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, username, email, role, created_at
    `;
    const result = await pool.query(query, [username, email, passwordHash, role]);
    return result.rows[0];
};

const findByUsernameOrEmail = async (username, email) => {
    const query = `
        SELECT user_id FROM users
        WHERE username = $1 OR email = $2
        LIMIT 1
    `;
    const result = await pool.query(query, [username, email]);
    return result.rows[0] || null;
};

const findByEmail = async (email) => {
    const query = `
        SELECT user_id, username, email, password_hash,
               temp_password_hash, temp_password_expires, role, created_at
        FROM users
        WHERE email = $1
        LIMIT 1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
};

// 👇 Save temp password with 1 hour expiry
const saveTempPassword = async (email, tempPasswordHash) => {
    const query = `
        UPDATE users
        SET temp_password_hash = $1,
            temp_password_expires = NOW() + INTERVAL '1 hour'
        WHERE email = $2
        RETURNING user_id
    `;
    const result = await pool.query(query, [tempPasswordHash, email]);
    return result.rows[0] || null;
};

// 👇 Clear temp password after real password is changed
const clearTempPassword = async (userId) => {
    const query = `
        UPDATE users
        SET temp_password_hash = NULL,
            temp_password_expires = NULL
        WHERE user_id = $1
    `;
    await pool.query(query, [userId]);
};
const getUserProfileData = async (userId) => {
    const query = `
        SELECT 
            u.username, 
            u.email, 
            u.role, 
            u.level, 
            u.created_at,
            (SELECT COUNT(*) FROM badges WHERE user_id = $1) AS badge_count,
            (SELECT COALESCE(SUM(highest_score), 0) FROM user_progress WHERE user_id = $1) AS total_score
        FROM users u
        WHERE u.user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
};

const findById = async (userId) => {
    const query = `
        SELECT user_id, username, email, password_hash,
               temp_password_hash, temp_password_expires, role, created_at
        FROM users
        WHERE user_id = $1
        LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
};

const updatePassword = async (userId, newPasswordHash) => {
    const query = `
        UPDATE users
        SET password_hash = $1,
            temp_password_hash = NULL,
            temp_password_expires = NULL
        WHERE user_id = $2
    `;
    await pool.query(query, [newPasswordHash, userId]);
};

module.exports = {
    createUser,
    findByUsernameOrEmail,
    findByEmail,
    saveTempPassword,
    clearTempPassword,
    getUserProfileData,
    findById,
    updatePassword,
};