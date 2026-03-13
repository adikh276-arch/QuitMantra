require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testConnection() {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✔ Neon database reachable:', res.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error('✘ Connection failed:', err);
        process.exit(1);
    }
}

testConnection();
