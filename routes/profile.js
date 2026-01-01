const express = require("express");
const router = express.Router();

const {
  getSkillRackStats,
  getCodeChefStats,
  getGeeksForGeeksStats,
  getLeetCodeStats,
  generateResponse
} = require("../utils/analyze");

// Get skillrack student data
router.get("/skillrack", async (req, res) => {
  const profileurl = req.query.profileurl;
  const { status, data } = await generateResponse(
    profileurl,
    getSkillRackStats,
    "SkillRack"
  );
  res.status(status).json(data);
});

// Get codechef student data
router.get("/codechef/:username", async (req, res) => {
  const username = req.params.username;
  const { status, data } = await generateResponse(
    username,
    getCodeChefStats,
    "Codechef"
  );
  res.status(status).json(data);
});

// Get geeksforgeeks student data
router.get("/geeksforgeeks/:username", async (req, res) => {
  const username = req.params.username;
  const { status, data } = await generateResponse(
    username,
    getGeeksForGeeksStats,
    "Geeksforgeeks"
  );
  res.status(status).json(data);
});

// Get leetcode student data
router.get("/leetcode/:username", async (req, res) => {
  const username = req.params.username;
  const { status, data } = await generateResponse(
    username,
    getLeetCodeStats,
    "Leetcode"
  );
  res.status(status).json(data);
});


module.exports = router;
