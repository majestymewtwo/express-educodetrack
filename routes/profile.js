const express = require("express");
const router = express.Router();

const {
  getSkillRackStats,
  getCodeChefStats,
  getGeeksForGeeksStats,
  getLeetCodeStats,
} = require("../analyze");

const Profile = require('../models/profile');
const CACHE_PERIOD = 24 * 60 * 60 * 1000; // 24 hours
// const CACHE_PERIOD = 60 * 1000; // for testing and development

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

// Common function to fetch cached or new data
const generateResponse = async (payload, fnc, platform) => {
  try {
    const cachedData = await Profile.findOne({
      platformName: platform,
      userPayload: payload,
    });

    if (
      !cachedData ||
      Date.now() - cachedData.fetchedAt.getTime() > CACHE_PERIOD
    ) {
      const freshData = await fnc(payload);

      await Profile.findOneAndUpdate(
        {
          platformName: platform,
          userPayload: payload,
        },
        {
          platformName: platform,
          userPayload: payload,
          fetchedAt: new Date(),
          data: freshData,
        },
        { upsert: true, new: true }
      );
      
      console.log(`Cache created for ${platform}/${payload}`);

      return {
        status: 200,
        data: freshData,
      };
    }

    console.log(`Cached data found for ${platform}/${payload}`);

    return {
      status: 200,
      data: cachedData.data,
    };
  } catch (err) {
    console.error(err);

    return {
      status: 500,
      data: {
        message: `An error occurred while fetching ${platform} data`,
      },
    };
  }
};

module.exports = router;
