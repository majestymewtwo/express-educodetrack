const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const {
  clean,
  isValidLength,
  isValidEmail,
  generateCode,
} = require("../utils/helper");

const Faculty = require("../models/faculty");
const Student = require("../models/student");
const Otp = require("../models/otp");

const OTP_VALIDITY = 5 * 60 * 1000;

router.post("/register-faculty", async (req, res) => {
  const data = req.body;

  if (
    !data.faculty_id ||
    !data.first_name ||
    !data.last_name ||
    !data.phone_no ||
    !data.email_id ||
    !data.password ||
    !data.department_name ||
    !data.college_name
  ) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  if (
    !isValidLength(data.faculty_id, 3, 30) ||
    !isValidLength(data.first_name, 2, 50) ||
    !isValidLength(data.last_name, 1, 50) ||
    !isValidLength(data.department_name, 2, 100) ||
    !isValidLength(data.college_name, 2, 150) ||
    !isValidLength(data.password, 8, 72)
  ) {
    return res.status(400).json({
      message: "One or more fields have invalid length",
    });
  }

  if (!/^[6-9]\d{9}$/.test(data.phone_no)) {
    return res.status(400).json({
      message: "Invalid phone number",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newFaculty = new Faculty({
      faculty_id: clean(data.faculty_id),
      first_name: clean(data.first_name),
      last_name: clean(data.last_name),
      phone_no: clean(data.phone_no),
      email_id: clean(data.email_id).toLowerCase(),
      password: hashedPassword,
      department_name: clean(data.department_name),
      college_name: clean(data.college_name),
    });

    await newFaculty.save();

    return res.status(201).json({
      message: "Registered new faculty",
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

router.delete("/delete-faculty/:faculty_email", async (req, res) => {
  const email = clean(req.params.faculty_email);

  if (!email) {
    return res.status(400).json({
      message: "Faculty email is required",
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  try {
    const result = await Faculty.deleteOne({
      email_id: email.toLowerCase(),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Faculty not found",
      });
    }

    return res.status(200).json({
      message: "Faculty deleted successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post("/login-faculty", async (req, res) => {
  const { email_id, password } = req.body;

  if (!email_id || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  if (!isValidEmail(email_id)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  try {
    const faculty = await Faculty.findOne({
      email_id: email_id.toLowerCase(),
    });

    if (!faculty) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    faculty.last_login_at = new Date();
    await faculty.save();

    const token = jwt.sign(
      {
        faculty_id: faculty.faculty_id,
        email_id: faculty.email_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      }
    );

    return res.status(200).json({
      token,
      faculty: {
        faculty_id: faculty.faculty_id,
        first_name: faculty.first_name,
        last_name: faculty.last_name,
        email_id: faculty.email_id,
        department_name: faculty.department_name,
        college_name: faculty.college_name,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Authentication must be OTP for email or phone
router.post("/generate-student-otp", async (req, res) => {
  const { email_id } = req.body;

  if (!email_id) {
    return res.status(400).json({
      message: "Email required",
    });
  }

  if (!isValidEmail(email_id)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  if (!Student.findOne({ email_id })) {
    return res.status(404).json({
      message: `No student found with ${email_id}`,
    });
  }

  try {
    const otpCode = generateCode();

    console.log("Generated random code: " + otpCode);

    const newOtp = new Otp({
      code: "0000",
      email_id,
    });

    // Send OTP code here

    await newOtp.save();

    res.json({
      message: `OTP sent to ${email_id}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occured",
    });
  }
});

router.post("/validate-student-otp", async (req, res) => {
  const { email_id, otp_code } = req.body;

  if (!email_id) {
    return res.status(400).json({
      message: "Email required",
    });
  }

  if (!otp_code) {
    return res.status(400).json({
      message: "OTP required",
    });
  }

  if (!isValidEmail(email_id)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  try {
    const generatedOtp = await Otp.findOne({
      code: otp_code,
      email_id,
    });

    if (!generatedOtp) {
      res.status(401).json({
        message: "Invalid otp",
      });
    }

    const student = await Student.findOne({
      email_id,
    });

    const token = jwt.sign(
      {
        student_id: student.student_id,
        email_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      }
    );

    return res.status(200).json({
      token,
      student: {
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email_id: student.email_id,
        department_name: student.department_name,
        college_name: student.college_name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occured",
    });
  }
});

module.exports = router;
