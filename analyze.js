const axios = require("axios");
const cheerio = require("cheerio");

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
  let problemData, submissionData;
  
  const url = `https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/`;
  
  const payload = {
    handle: "majestymewtwo",
    requestType: "getYearwiseUserSubmissions",
    year: String(new Date().getFullYear()),
    month: "",
  };
  try {
    submissionData = (await axios.post(url, payload)).data;
  } catch (err) {
    console.error("Failed to fetch geeksforgeeks submission details");
    console.error(err);
    return;
  }

  payload.requestType = "";
  try {
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
    $(el).text().includes("Total Problems Solved")
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

module.exports = {
  getSkillRackStats,
  getGeeksForGeeksStats,
  getCodeChefStats,
  getLeetCodeStats,
};
