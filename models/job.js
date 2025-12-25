const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    student_id: {
      type: String,
      required: true,
      index: true,
      ref: "Student"
    },

    company_name: {
      type: String,
      required: true,
      trim: true
    },

    role: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    compensation: {
      type: String,
      required: true,
    },

    is_off_campus: {
      type: Boolean,
      default: false
    },

    placed_at: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Job = mongoose.model("Job", jobSchema);
module.exports = Job;
