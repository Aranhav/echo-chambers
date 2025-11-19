const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Leaderboard data file path
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// Initialize leaderboard file if it doesn't exist
function initLeaderboard() {
    if (!fs.existsSync(LEADERBOARD_FILE)) {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify({ scores: [] }));
    }
}

// Read leaderboard data
function readLeaderboard() {
    try {
        initLeaderboard();
        const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading leaderboard:', error);
        return { scores: [] };
    }
}

// Write leaderboard data
function writeLeaderboard(data) {
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing leaderboard:', error);
        return false;
    }
}

// API: Get top scores
app.get('/api/scores', (req, res) => {
    const data = readLeaderboard();
    // Return top 10 scores sorted by score descending
    const topScores = data.scores
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    res.json(topScores);
});

// API: Submit a score
app.post('/api/scores', (req, res) => {
    const { name, score, playerId } = req.body;

    if (!name || typeof score !== 'number' || !playerId) {
        return res.status(400).json({ error: 'Invalid data' });
    }

    // Sanitize name
    const sanitizedName = name.trim().substring(0, 15).replace(/[<>]/g, '');

    if (sanitizedName.length === 0) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const data = readLeaderboard();

    // Add new score
    const newEntry = {
        name: sanitizedName,
        score: Math.floor(score),
        playerId: playerId,
        date: new Date().toISOString()
    };

    data.scores.push(newEntry);

    // Keep only top 100 scores to prevent file from growing too large
    data.scores = data.scores
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);

    if (writeLeaderboard(data)) {
        // Find rank of submitted score
        const rank = data.scores.findIndex(s =>
            s.playerId === playerId &&
            s.score === newEntry.score &&
            s.date === newEntry.date
        ) + 1;

        res.json({
            success: true,
            rank: rank,
            entry: newEntry
        });
    } else {
        res.status(500).json({ error: 'Failed to save score' });
    }
});

// API: Get player's best score
app.get('/api/scores/player/:playerId', (req, res) => {
    const { playerId } = req.params;
    const data = readLeaderboard();

    const playerScores = data.scores
        .filter(s => s.playerId === playerId)
        .sort((a, b) => b.score - a.score);

    if (playerScores.length > 0) {
        res.json(playerScores[0]);
    } else {
        res.json(null);
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize leaderboard on startup
initLeaderboard();

app.listen(PORT, () => {
    console.log(`Echo Chambers running on port ${PORT}`);
});
