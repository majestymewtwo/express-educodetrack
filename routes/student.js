const express = require("express");
const router = express.Router();

const Student = require("../models/student");
const {
  getLLMInsights,
  getNormalizedScore,
  getSkillRackStats,
  getCodeChefStats,
  getGeeksForGeeksStats,
  getLeetCodeStats,
  generateResponse,
} = require("../utils/analyze");

// Get Profile
router.get("/profile", async (req, res) => {
  try {
    const student = await Student.findOne({
      email_id: req.user.email_id,
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    res.status(200).json({
      student_id: student.student_id,
      first_name: student.first_name,
      last_name: student.last_name,
      status: student.status,
      profile_pic: student.profile_pic,
      phone_no: student.phone_no,
      email_id: student.email_id,
      passout_year: student.passout_year,
      department_name: student.department_name,
      college_name: student.college_name,
      last_login_at: student.last_login_at,
      is_placed: student.is_placed,
      platform_details: student.platform_details,
      placed_details: student.placed_details,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "An error occured",
    });
  }
});

// Get AI insights and suggestions in a FRIENDLY manner
router.get("/analyze-myself", async (req, res) => {
  const { platform, payload } = req.query;
  if (!platform || !payload) {
    res.status(400).json({
      message: "Please provide all required parameters",
    });
  }
  const { status, data } = await getLLMInsights(payload, platform, false);
  res.status(status).json(data);
});

// Update details like platform_details, about, profile pic, status, placed details
router.put("/update-details", async (req, res) => {
  const { status, profile_pic, is_placed, platform_details, placed_details } =
    req.body;

  if (
    is_placed &&
    (!placed_details ||
      !placed_details.company_name ||
      !placed_details.role_name ||
      !placed_details.company_type ||
      !placed_details.annual_compensation)
  ) {
    return res.status(400).json({
      message: "Provide all required placement details",
    });
  }

  try {
    const student = await Student.findOne({
      email: req.user.email,
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (platform_details) {
      student.platform_details = platform_details;
    }

    if (is_placed) {
      student.placed_details = placed_details;
    }

    if (status) {
      student.status = status;
    }

    if (profile_pic) {
      student.profile_pic = profile_pic;
    }

    await student.save();

    res.status(200).json({
      message: "Updated details",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "An error occured",
    });
  }
});

// Leaderboard score
router.get("/leaderboard", async (req, res) => {
  try {
    // 1. Extract the email from the authenticated user
    const email_id = req.user.email_id;

    if (!email_id) {
      return res.status(400).json({
        message: "Email ID is missing from the authentication token.",
      });
    }

    // 2. Fetch the current student to get their passout year
    const currentStudent = await Student.findOne({ email_id }).lean();

    if (!currentStudent || !currentStudent.passout_year) {
      return res.status(404).json({
        message: "Student profile or passout year not found.",
      });
    }

    const passout_year = currentStudent.passout_year;

    // 3. Fetch all students belonging to the same passout year
    const students = await Student.find({ passout_year }).lean();

    // 4. Map over the students to fetch platform data and calculate scores concurrently
    const leaderboardPromises = students.map(async (student) => {
      let totalScore = 0;
      let platformsActive = 0;

      const details = student.platform_details;

      // If the student hasn't linked any platforms, return them with a 0 score
      if (!details) {
        return {
          _id: student._id,
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          department_name: student.department_name,
          platforms_active: 0,
          total_score: 0,
          // Flag if this is the currently logged-in student
          is_current_user: student.email_id === email_id,
        };
      }

      const fetchPromises = [];

      if (details.leetcode) {
        fetchPromises.push(
          generateResponse(details.leetcode, getLeetCodeStats, "Leetcode").then(
            (res) => ({ platform: "leetcode", response: res }),
          ),
        );
      }

      if (details.codechef) {
        fetchPromises.push(
          generateResponse(details.codechef, getCodeChefStats, "Codechef").then(
            (res) => ({ platform: "codechef", response: res }),
          ),
        );
      }

      if (details.geeksforgeeks) {
        fetchPromises.push(
          generateResponse(
            details.geeksforgeeks,
            getGeeksForGeeksStats,
            "GeeksForGeeks",
          ).then((res) => ({ platform: "geeksforgeeks", response: res })),
        );
      }

      if (details.skillrack) {
        fetchPromises.push(
          generateResponse(
            details.skillrack,
            getSkillRackStats,
            "SkillRack",
          ).then((res) => ({ platform: "skillrack", response: res })),
        );
      }

      // Wait for all active platform fetches to finish for this specific student
      const fetchResults = await Promise.allSettled(fetchPromises);

      // Calculate the score
      fetchResults.forEach((promiseResult) => {
        if (promiseResult.status === "fulfilled") {
          const { platform, response } = promiseResult.value;

          if (response.status === 200 && response.data) {
            try {
              const score = getNormalizedScore(platform, response.data);
              totalScore += score;
              platformsActive++;
            } catch (err) {
              console.error(
                `Failed to calculate score for ${student.student_id} on ${platform}:`,
                err.message,
              );
            }
          }
        }
      });

      return {
        _id: student._id,
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        department_name: student.department_name,
        platforms_active: platformsActive,
        total_score: Number(totalScore.toFixed(2)),
        // Flag if this is the currently logged-in student
        is_current_user: student.email_id === email_id,
      };
    });

    // Wait for all students to be processed
    const leaderboard = await Promise.all(leaderboardPromises);

    // Sort the array in descending order based on total_score
    leaderboard.sort((a, b) => b.total_score - a.total_score);

    res.json(leaderboard);
  } catch (err) {
    console.error("Student Leaderboard Error:", err);
    res.status(500).json({
      message: "An error occurred while generating the leaderboard",
    });
  }
});

module.exports = router;
