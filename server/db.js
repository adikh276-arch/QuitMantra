require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDb() {
    try {
        const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('✔ Database schema initialized');
    } catch (err) {
        console.error('✘ Failed to initialize database schema:', err);
    }
}

module.exports = {
    pool,
    initDb
};
