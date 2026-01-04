const express = require("express");
const router = express.Router();

const Student = require("../models/student");
const { getLLMInsights } = require("../utils/analyze");

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
    placed_details &&
    (!placed_details.company_name ||
      !placed_details.role_name ||
      !placed_details.role_description ||
      !placed_details.compensation)
  ) {
    return res.status(400).json({
      message: "Provide all required placement details",
    });
  }

  try {
    const student = await Student.findOne({
      email: req.user.email_id,
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

module.exports = router;
