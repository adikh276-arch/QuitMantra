require('dotenv').config();
const { pool, initDb } = require('../server/db');

async function validation() {
    try {
        console.log('Testing Database Operations...');
        await initDb();

        // 1. Insert test user
        const testUserId = Date.now();
        await pool.query('INSERT INTO users (id) VALUES ($1)', [testUserId]);
        console.log('✔ User insertion worked');

        // 2. Insert test assessment
        const res = await pool.query(
            'INSERT INTO assessments (user_id, substance_slug, substance_name, score, result_level) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [testUserId, 'test_sub', 'Test Substance', 5, 'Moderate']
        );
        const assessmentId = res.rows[0].id;
        console.log('✔ Assessment insertion worked');

        // 3. Insert test response
        await pool.query(
            'INSERT INTO responses (assessment_id, question_id, answer_index, answer_text, score_contribution) VALUES ($1, $2, $3, $4, $5)',
            [assessmentId, 1, 3, 'Sometimes', 1]
        );
        console.log('✔ Response insertion worked');

        // 4. Read back
        const history = await pool.query('SELECT * FROM assessments WHERE user_id = $1', [testUserId]);
        if (history.rows.length > 0) {
            console.log('✔ History retrieval worked');
        }

        // 5. Delete test record
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        console.log('✔ Cleanup (delete) worked');

        console.log('--- ALL VALIDATIONS PASSED ---');
        process.exit(0);
    } catch (err) {
        console.error('✘ Validation failed:', err);
        process.exit(1);
    }
}

validation();
