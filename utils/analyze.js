const axios = require("axios");
const cheerio = require("cheerio");

const Profile = require("../models/profile");
const Insight = require("../models/insight");

const {
  analyzeCodingPlatformDataFaculty,
  analyzeCodingPlatformDataStudent,
} = require("./insight");

const getSkillRackStats = async (url) => {
  let data;
  try {
    data = (await axios.get(url)).data;
  } catch (err) {
    console.error("Failed to fetch skillrack details");
    console.error(err);
    return;
  }

  const $ = cheerio.load(data);
  const result = {};

  const stats = {};
  $("div.statistic").each((_, el) => {
    const value = $(el).find("div.value").text().trim();
    const label = $(el).find("div.label").text().trim();
    stats[label] = value;
  });
  result.stats = stats;

  const certificates = [];
  $("div.ui.brown.card .content").each((_, el) => {
    const title = $(el).find("b").text().trim();
    const date = $(el).find("i.clock.icon.green").next().text().trim();
    const link = $(el).find("a").attr("href");
    certificates.push({ title, date, link });
  });

  result.certificates = certificates;
  result.total_certificates_count = certificates.length;
  return result;
};

const getGeeksForGeeksStats = async (username) => {
  let problemData,
    submissionData = [];

  const url = `https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/`;

  const currentYear = new Date().getFullYear();
  const yearsToFetch = [currentYear, currentYear - 1];

  // Fetch submissions for both years
  for (const year of yearsToFetch) {
    const payload = {
      handle: username,
      requestType: "getYearwiseUserSubmissions",
      year: String(year),
      month: "",
    };

    try {
      const response = await axios.post(url, payload);
      submissionData.push({
        year,
        data: response.data,
      });
    } catch (err) {
      console.error(`Failed to fetch GFG submission data for year ${year}`);
      console.error(err);
    }
  }

  // Fetch problem stats (unchanged)
  try {
    const payload = {
      handle: username,
      requestType: "",
      year: "",
      month: "",
    };

    problemData = (await axios.post(url, payload)).data;
  } catch (err) {
    console.error("Failed to fetch geeksforgeeks problem details");
    console.error(err);
    return;
  }

  return {
    problems: problemData,
    submission: submissionData,
  };
};

const getCodeChefStats = async (username) => {
  const url = `https://www.codechef.com/users/${username}`;
  let data;
  try {
    data = (await axios.get(url)).data;
  } catch (err) {
    console.error("Failed to fetch codechef details");
    console.error(err);
    return;
  }
  const $ = cheerio.load(data);
  const stats = {};

  const header = $("div.user-details-container");
  if (header.length) {
    const name = header.find("h1.h2-style").text().trim() || null;
    const username = header.find("span.m-username--link").text().trim() || null;
    const country = header.find("span.user-country-name").text().trim() || null;
    const institutionLi = header
      .find("li")
      .filter((_, el) => $(el).text().includes("Institution"));
    const institution = institutionLi.find("span").text().trim() || null;

    Object.assign(stats, { name, username, country, institution });
  }

  const ratingHeader = $("div.widget-rating");
  if (ratingHeader.length) {
    const currentRating = ratingHeader.find("div.rating-number").text().trim();
    const highestRating = ratingHeader
      .find("small")
      .text()
      .replace("Highest Rating ", "")
      .trim();
    const stars = ratingHeader.find("div.rating-star").text().trim();

    stats.current_rating = currentRating || null;
    stats.highest_rating = highestRating || null;
    stats.stars = stars || null;

    const rankItems = ratingHeader.find("li");
    if (rankItems.length >= 2) {
      stats.global_rank = $(rankItems[0]).find("strong").text().trim();
      stats.country_rank = $(rankItems[1]).find("strong").text().trim();
    }
  }

  const contestCount = $("div.contest-participated-count");
  if (contestCount.length) {
    stats.contests_participated = contestCount.text().split(":").pop().trim();
  }

  const problemsSolved = $("h3").filter((_, el) =>
    $(el).text().includes("Total Problems Solved"),
  );
  if (problemsSolved.length) {
    stats.total_problems_solved = problemsSolved
      .text()
      .replace("Total Problems Solved:", "")
      .trim();
  }

  const badges = [];
  $("div.badge").each((_, el) => {
    const title = $(el).find("p.badge__title").text().trim() || null;
    const description =
      $(el).find("p.badge__description").text().trim() || null;
    badges.push({ title, description });
  });
  stats.badges = badges;

  return stats;
};

const getLeetCodeStats = async (username) => {
  const url = `https://leetcode-api-faisalshohag.vercel.app/${username}`;

  let res;
  try {
    res = await axios.get(url);
  } catch (err) {
    console.error("Failed to fetch skillrack details");
    console.error(err);
    return;
  }

  return res.data;
};

const getNormalizedScore = (platform, data) => {
  if (!data) return 0;

  let activity = 0;
  let difficulty = 0;
  let achievement = 0;

  // Safe parsing helper
  const safeInt = (val) => parseInt(val) || 0;

  switch (platform.toLowerCase()) {
    case "geeksforgeeks": {
      // Based on your provided GFG JSON
      const totalSolved = data.problems?.count || 0;
      
      const easy = Object.keys(data.problems?.result?.Easy || {}).length;
      const medium = Object.keys(data.problems?.result?.Medium || {}).length;
      const hard = Object.keys(data.problems?.result?.Hard || {}).length;
      const diffTotal = easy + medium + hard;

      // Activity: 500 problems is maxed out
      activity = totalSolved / 500;
      
      // Difficulty: Weighted average of problem complexities
      difficulty = diffTotal > 0 
        ? (easy * 0.3 + medium * 0.6 + hard * 1.0) / diffTotal 
        : 0;

      // Achievement: GFG data doesn't provide a competitive rating in this JSON, 
      // so we evaluate achievement based on long-term consistency (submissions/problems).
      achievement = totalSolved / 800;
      break;
    }

    case "codechef": {
      // Based on your provided CodeChef JSON
      const totalSolved = safeInt(data.total_problems_solved);
      const rating = safeInt(data.current_rating); // Parses "1249?i..." cleanly
      
      // Extract stars (e.g., "3★" -> 3, "★" -> 1)
      const starMatch = (data.stars || "").match(/(\d+)?★/);
      const stars = starMatch ? (safeInt(starMatch[1]) || 1) : 0;

      // Activity: 400 problems is maxed out
      activity = totalSolved / 400;
      
      // Difficulty: Base it on CodeChef stars (5 stars = 1.0)
      difficulty = stars / 5;
      
      // Achievement: Competitive rating (2500 is maxed out)
      achievement = rating / 2500;
      break;
    }

    case "skillrack": {
      // Based on your provided SkillRack JSON
      const totalSolved = safeInt(data.stats?.["PROGRAMS SOLVED"]);
      const gold = safeInt(data.stats?.GOLD);
      const silver = safeInt(data.stats?.SILVER);
      const bronze = safeInt(data.stats?.BRONZE);
      const totalMedals = gold + silver + bronze;
      const certs = safeInt(data.total_certificates_count);

      // Activity: 3000 problems maxed out (Skillrack inflates problem counts)
      activity = totalSolved / 3000;
      
      // Difficulty: Ratio of high-tier medals
      difficulty = totalMedals > 0 
        ? (bronze * 0.3 + silver * 0.6 + gold * 1.0) / totalMedals 
        : 0;
        
      // Achievement: Based on earned certificates
      achievement = certs / 30;
      break;
    }

    case "leetcode": {
      // Standard Leetcode API mapping assumption
      const totalSolved = safeInt(data.totalSolved);
      const easy = safeInt(data.easySolved);
      const medium = safeInt(data.mediumSolved);
      const hard = safeInt(data.hardSolved);
      
      activity = totalSolved / 500;
      
      difficulty = totalSolved > 0 
        ? (easy * 0.3 + medium * 0.6 + hard * 1.0) / totalSolved 
        : 0;

      // Prefer contest rating; fallback to inverse rank calculation
      achievement = data.contestRating
        ? safeInt(data.contestRating) / 2500
        : (data.ranking ? (1 / Math.log10(data.ranking || 10)) : 0);
      break;
    }

    default:
      console.warn(`Unsupported platform for scoring: ${platform}`);
      return 0;
  }

  // Clamp all values tightly between 0.0 and 1.0 so no single platform breaks the scale
  activity = Math.min(Math.max(activity, 0), 1);
  difficulty = Math.min(Math.max(difficulty, 0), 1);
  achievement = Math.min(Math.max(achievement, 0), 1);

  // Blend into a final score (e.g., 40% Volume, 40% Difficulty, 20% Competitive Rank)
  const finalScore = (0.4 * activity + 0.4 * difficulty + 0.2 * achievement) * 100;

  // Return safely formatted number, fallback to 0 if NaN
  return Number(finalScore.toFixed(2)) || 0;
};

// Common function to fetch cached or new data
const generateResponse = async (payload, fnc, platform) => {
  try {
    if (!payload) return { status: 400, message: "Payload is not valid" };
    
    const cachedData = await Profile.findOne({
      platformName: platform,
      userPayload: payload,
    });

    const today2AMIST = getToday2AMIST();

    if (!payload || !cachedData || cachedData.fetchedAt < today2AMIST) {
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
        { upsert: true, new: true },
      );

      console.log(`Cache refreshed for ${platform}/${payload}`);

      return {
        status: 200,
        data: freshData,
      };
    }

    console.log(`Cached data valid for ${platform}/${payload}`);

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

const getToday2AMIST = () => {
  const now = new Date();

  // IST offset
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  // Set to 2 AM IST today
  istNow.setHours(2, 0, 0, 0);

  // If current IST time is before 2 AM, go back one day
  if (new Date(now.getTime() + istOffset) < istNow) {
    istNow.setDate(istNow.getDate() - 1);
  }

  // Convert back to UTC
  return new Date(istNow.getTime() - istOffset);
};

const getLLMInsights = async (username, platform, isFaculty) => {
  try {
    const cachedData = await Insight.findOne({
      username,
      platform,
      isFaculty,
    });

    let data = null;

    if (platform === "leetcode") {
      data = await generateResponse(username, getLeetCodeStats, platform);
    } else if (platform === "codechef") {
      data = await generateResponse(username, getCodeChefStats, platform);
    } else if (platform === "skillrack") {
      data = await generateResponse(username, getSkillRackStats, platform);
    } else if (platform === "geeksforgeeks") {
      data = await generateResponse(username, getGeeksForGeeksStats, platform);
    } else {
      return {
        status: 400,
        data: {
          message: "Invalid platform",
        },
      };
    }

    if (data.status !== 200) {
      return data;
    }

    data = data.data;

    const today2AMIST = getToday2AMIST();

    if (!cachedData || cachedData.fetchedAt < today2AMIST) {
      let freshData = "";

      if (isFaculty) {
        freshData = await analyzeCodingPlatformDataFaculty(data);
      } else {
        freshData = await analyzeCodingPlatformDataStudent(data);
      }

      try {
        await Insight.findOneAndUpdate(
          { username, platform, isFaculty },
          { data: freshData, username, platform, isFaculty },
          { upsert: true, new: true },
        );
      } catch (err) {
        console.error(err);

        return {
          status: 500,
          data: { message: "An error occured while fetching insights" },
        };
      }

      console.log(`Cache updated for insight ${platform}/${username}`);

      return {
        status: 200,
        data: { insight: freshData },
      };
    }

    console.log(`Cache found for insight ${platform}/${username}`);

    return {
      status: 200,
      data: { insight: cachedData.data },
    };
  } catch (err) {
    console.error(err);
    return {
      status: 500,
      data: {
        message: "An error occured while fetching insights",
      },
    };
  }
};

module.exports = {
  getSkillRackStats,
  getGeeksForGeeksStats,
  getCodeChefStats,
  getLeetCodeStats,
  getNormalizedScore,
  generateResponse,
  getLLMInsights,
};
