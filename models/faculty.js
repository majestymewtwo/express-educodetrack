const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    faculty_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    first_name: {
      type: String,
      required: true,
      trim: true,
    },

    last_name: {
      type: String,
      required: true,
      trim: true,
    },

    password : {
      type: String,
      required : true
    },

    phone_no: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Invalid phone number"],
    },

    email_id: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    watchlist: {
      type: [{ type: String, ref: "Student" }],
      default: [],
    },
    
    department_name: {
      type: String,
      required: true,
    },

    college_name: {
      type: String,
      required: true,
    },

    last_login_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Faculty = mongoose.model("Faculty", facultySchema);
module.exports = Faculty;
