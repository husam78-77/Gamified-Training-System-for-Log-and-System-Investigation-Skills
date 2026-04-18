const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
    // ✅ Supabase / production
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });
    console.log('🌐 Using Supabase DB');
} else {
    // ✅ Local DB
    pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    console.log('💻 Using Local DB');
}

pool.connect()
    .then(() => console.log('✅ PostgreSQL connected'))
    .catch((err) => console.error('❌ DB connection error:', err));

module.exports = pool;