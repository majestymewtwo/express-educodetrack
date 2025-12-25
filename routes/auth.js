const express = require('express');
const router = express.Router();

router.post('/register-faculty', async (req, res) => {});
router.post('/login-faculty', async (req, res) => {});

// Authentication must be OTP for email or phone
router.post('/login-student', async (req, res) => {});

module.exports = router;