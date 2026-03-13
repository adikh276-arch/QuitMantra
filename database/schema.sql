CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    substance_slug TEXT NOT NULL,
    substance_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    result_level TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS responses (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    answer_index INTEGER NOT NULL,
    answer_text TEXT NOT NULL,
    score_contribution INTEGER NOT NULL
);
