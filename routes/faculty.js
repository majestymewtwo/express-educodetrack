const express = require("express");
const router = express.Router();
const Faculty = require("../models/faculty");
const Student = require("../models/student");

const { clean, isValidLength, isValidEmail } = require("../utils/helper");

const {
  getLLMInsights,
  getNormalizedScore,
  getSkillRackStats,
  getCodeChefStats,
  getGeeksForGeeksStats,
  getLeetCodeStats,
  generateResponse,
} = require("../utils/analyze");

// Add student details and create account
router.post("/create-student", async (req, res) => {
  const {
    student_id,
    first_name,
    last_name,
    phone_no,
    email_id,
    passout_year,
    department_name,
    college_name,
  } = req.body;

  if (
    !student_id ||
    !first_name ||
    !last_name ||
    !phone_no ||
    !email_id ||
    !passout_year ||
    !department_name ||
    !college_name ||
    typeof student_id !== "string" ||
    typeof first_name !== "string" ||
    typeof last_name !== "string" ||
    typeof phone_no !== "string" ||
    typeof email_id !== "string" ||
    typeof department_name !== "string" ||
    typeof college_name !== "string" ||
    typeof passout_year !== "string"
  ) {
    return res.status(400).json({
      message: "Send valid details",
    });
  }

  if (
    !isValidLength(student_id, 3, 30) ||
    !isValidLength(first_name, 2, 50) ||
    !isValidLength(last_name, 1, 50) ||
    !isValidLength(department_name, 2, 100) ||
    !isValidLength(college_name, 2, 150)
  ) {
    return res.status(400).json({
      message: "Send valid details",
    });
  }

  if (!/^[6-9]\d{9}$/.test(phone_no)) {
    return res.status(400).json({
      message: "Send valid details",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_id)) {
    return res.status(400).json({
      message: "Send valid details",
    });
  }

  const year = new Date().getFullYear() + 1;
  const parsedYear = Number(passout_year);

  if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > year) {
    return res.status(400).json({
      message: "Send valid details",
    });
  }

  try {
    const faculty = await Faculty.findOne({
      email_id: req.user.email_id,
    });

    const newStudent = new Student({
      student_id: clean(student_id),
      first_name: clean(first_name),
      last_name: clean(last_name),
      phone_no: clean(phone_no),
      email_id: clean(email_id).toLowerCase(),
      passout_year: parsedYear,
      status: "",
      department_name: clean(department_name),
      college_name: clean(college_name),
      faculty_mentor_id: faculty._id,
    });

    await newStudent.save();

    return res.json({
      message: "Created student account for " + first_name + " " + last_name,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];

      return res.status(409).json({
        message: `${field} already exists`,
      });
    }

    console.error(err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Get passout_year-wise and department-wise student distribution
router.get("/college-stats/:passout_year", async (req, res) => {
  const passout_year = req.params.passout_year;
  try {
    const data = {};
    const students = await Student.find({
      passout_year,
    });
    students.forEach((studentData) => {
      if (!data[studentData.department_name]) {
        data[studentData.department_name] = [];
      }
      data[studentData.department_name].push(studentData);
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: "An error occured",
    });
  }
});

// Get last 2 batches of passed out students data (placed or not placed)
router.get("/passed-out-stats", async (req, res) => {});

// Get AI insights for student performance
router.get("/analyze-student", async (req, res) => {
  const { platform, payload } = req.query;
  if (!platform || !payload) {
    res.status(400).json({
      message: "Please provide all required parameters",
    });
  }
  const { status, data } = await getLLMInsights(payload, platform, true);
  res.status(status).json(data);
});

// Get leaderboard of students grouped by their passout_year through the normalization formula
router.get("/student-leaderboard/:passout_year", async (req, res) => {
  const passout_year = req.params.passout_year;

  try {
    const students = await Student.find({ passout_year }).lean();

    // Map over all students to create an array of promises
    const leaderboardPromises = students.map(async (student) => {
      let totalScore = 0;
      let platformsActive = 0;

      // Null check: If platform_details doesn't exist at all, return default 0 scores early
      const details = student.platform_details;
      if (!details) {
        return {
          _id: student._id,
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          department_name: student.department_name,
          is_placed: student.is_placed,
          platforms_active: 0,
          total_score: 0,
        };
      }

      // Array to hold the fetch promises for this specific student
      const fetchPromises = [];

      // 1. LeetCode (Username)
      if (details.leetcode) {
        fetchPromises.push(
          generateResponse(details.leetcode, getLeetCodeStats, "Leetcode")
            .then(res => ({ platform: "leetcode", response: res }))
        );
      }

      // 2. CodeChef (Username)
      if (details.codechef) {
        fetchPromises.push(
          generateResponse(details.codechef, getCodeChefStats, "Codechef")
            .then(res => ({ platform: "codechef", response: res }))
        );
      }

      // 3. GeeksforGeeks (Username)
      if (details.geeksforgeeks) {
        fetchPromises.push(
          // Replace "GeeksForGeeks" with whatever exact string you use in your DB
          generateResponse(details.geeksforgeeks, getGeeksForGeeksStats, "GeeksForGeeks") 
            .then(res => ({ platform: "geeksforgeeks", response: res }))
        );
      }

      // 4. SkillRack (URL)
      if (details.skillrack) {
        fetchPromises.push(
          generateResponse(details.skillrack, getSkillRackStats, "SkillRack")
            .then(res => ({ platform: "skillrack", response: res }))
        );
      }

      // Wait for all active platform fetches to finish for this student.
      // Using allSettled so if one platform fails, it doesn't break the rest.
      const fetchResults = await Promise.allSettled(fetchPromises);

      // Calculate the score
      fetchResults.forEach((promiseResult) => {
        if (promiseResult.status === "fulfilled") {
          const { platform, response } = promiseResult.value;
          
          // Only calculate if generateResponse returned status 200 and actual data
          if (response.status === 200 && response.data) {
            try {
              const score = getNormalizedScore(platform, response.data);
              totalScore += score;
              platformsActive++;
            } catch (err) {
              console.error(`Failed to calculate score for ${student.student_id} on ${platform}:`, err.message);
            }
          }
        }
      });

      // Format the returned student object
      return {
        ...student,
        _id: student._id,
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        department_name: student.department_name,
        is_placed: student.is_placed,
        platforms_active: platformsActive,
        total_score: Number(totalScore.toFixed(2)),
      };
    });

    // Wait for ALL students to finish fetching and calculating
    const leaderboard = await Promise.all(leaderboardPromises);

    // Sort the array in descending order based on total_score
    leaderboard.sort((a, b) => b.total_score - a.total_score);

    res.json(leaderboard);

  } catch (err) {
    console.error("Leaderboard Error:", err);
    res.status(500).json({
      message: "An error occurred while generating the leaderboard",
    });
  }
});

// Add a student to watchlist
router.put("/add-watchlist", async (req, res) => {});

// Edit student details
router.put("/update-student", async (req, res) => {
  try {
    const { student_id, is_placed } = req.body;

    // Basic validation to ensure we know who to update
    if (!student_id) {
      return res.status(400).json({ 
        message: "student_id is required" 
      });
    }

    if (typeof is_placed === 'undefined') {
      return res.status(400).json({ 
        message: "is_placed status is required" 
      });
    }

    // Find the student and update only the is_placed field
    const updatedStudent = await Student.findOneAndUpdate(
      { student_id: student_id },
      { $set: { is_placed: is_placed } },
      { new: true } // Returns the newly updated document
    );

    if (!updatedStudent) {
      return res.status(404).json({ 
        message: "Student not found" 
      });
    }

    return res.status(200).json({
      message: "Student placement status updated successfully",
      data: updatedStudent
    });

  } catch (err) {
    console.error("Update Student Error:", err);
    return res.status(500).json({
      message: "An error occurred while updating the student details"
    });
  }
});

module.exports = router;
