const pool = require('../config/db');

const createUser = async ({ username, email, passwordHash, role = 'student' }) => {
    const query = `
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, username, email, role, created_at
    `;
    const values = [username, email, passwordHash, role];
    const result = await pool.query(query, values);
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
        SELECT user_id, username, email, password_hash, role, created_at
        FROM users
        WHERE email = $1
        LIMIT 1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
};

module.exports = { createUser, findByUsernameOrEmail, findByEmail };