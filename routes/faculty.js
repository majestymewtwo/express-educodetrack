const express = require('express');
const router = express.Router();

const authFilter = require('../utils/middleware');

// Add student details and create account
router.post('/create-student', authFilter, async (req, res) => {
    res.send("This works");
});


// Get passout_year-wise and department-wise student distribution
router.get('/college-stats/:passout_year', async (req, res) => {});
// Get last 2 batches of passed out students data (placed or not placed)
router.get('/passed-out-stats', async (req, res) => {});
// Get AI insights for student performance (1. insights and 2. suggestions)
router.get('/analyze-student', async (req, res) => {});
// Get leaderboard of students grouped by their passout_year through the normalization formula
router.get('/student-leaderboard/:passout_year', async (req, res) => {});


// Add a student to watchlist
router.put('/add-watchlist', async (req, res) => {});
// Edit student details
router.put('/update-student', async (req, res) => {});


module.exports = router;