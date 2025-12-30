const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    student_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    first_name: {
      type: String,
      required: true,
      trim: true
    },

    last_name: {
      type: String,
      required: true,
      trim: true
    },

    status : {
      type : String,
      required : false,
      default : ""
    },

    profile_pic : {
      type : String,
      required : false
    },

    phone_no: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Invalid phone number"]
    },

    email_id: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passout_year: {
      type: Number,
      required: true
    },

    department_name: {
      type: String,
      required: true
    },

    college_name: {
      type: String,
      required: true
    },

    last_login_at: {
      type: Date,
      default: null
    },

    is_placed: {
      type: Boolean,
      default: false
    },

    faculty_mentor_id: {
      type: String,
      ref: "Faculty",
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
