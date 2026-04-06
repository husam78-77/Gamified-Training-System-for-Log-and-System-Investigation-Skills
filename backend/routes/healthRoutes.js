const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            server: 'online',
            database: 'connected',
            db_name: process.env.DB_NAME,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({
            server: 'online',
            database: 'disconnected',
            error: error.message,
        });
    }
});

module.exports = router;