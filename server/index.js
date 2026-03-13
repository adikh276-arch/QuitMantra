require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { pool, initDb } = require('./db');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the root directory
app.use('/quit_assessments', express.static(path.join(__dirname, '../')));

// Initialize Database
initDb();

const router = express.Router();

// Authentication Handshake
router.post('/auth/handshake', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    try {
        // Validate with MantraCare API
        const mcResponse = await axios.post('https://api.mantracare.com/user/user-info', { token });
        const { user_id } = mcResponse.data;

        if (!user_id) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Phase 9 - User Initialization
        const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
        if (userCheck.rows.length === 0) {
            await pool.query('INSERT INTO users (id) VALUES ($1)', [user_id]);
        }

        res.json({ user_id });
    } catch (err) {
        console.error('Auth check failed:', err.message);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Phase 5 - Save Assessment
router.post('/save-assessment', async (req, res) => {
    const { user_id, substance_slug, substance_name, score, result_level, responses } = req.body;

    if (!user_id || !substance_slug) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert assessment
        const assessmentRes = await client.query(
            'INSERT INTO assessments (user_id, substance_slug, substance_name, score, result_level) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [user_id, substance_slug, substance_name, score, result_level]
        );
        const assessmentId = assessmentRes.rows[0].id;

        // Insert responses
        for (const resp of responses) {
            await client.query(
                'INSERT INTO responses (assessment_id, question_id, answer_index, answer_text, score_contribution) VALUES ($1, $2, $3, $4, $5)',
                [assessmentId, resp.question_id, resp.answer_index, resp.answer_text, resp.score_contribution]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, assessment_id: assessmentId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Save failed:', err);
        res.status(500).json({ error: 'Failed to save assessment' });
    } finally {
        client.release();
    }
});

// Get Assessment History
router.get('/assessments/:user_id', async (req, res) => {
    const { user_id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM assessments WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.use('/quit_assessments/api', router);

// Root redirect
app.get('/quit_assessments', (req, res) => res.redirect('/quit_assessments/'));
app.get('/', (req, res) => res.redirect('/quit_assessments/'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
