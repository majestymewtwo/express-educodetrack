const express = require("express");
const router = express.Router();
const Faculty = require("../models/faculty");
const Student = require("../models/student");

const { clean, isValidLength, isValidEmail } = require("../utils/helper");

const { getLLMInsights } = require("../utils/analyze");

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
router.get("/student-leaderboard/:passout_year", async (req, res) => {});

// Add a student to watchlist
router.put("/add-watchlist", async (req, res) => {});
// Edit student details
router.put("/update-student", async (req, res) => {});

module.exports = router;
