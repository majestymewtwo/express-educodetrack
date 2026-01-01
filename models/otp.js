const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
    },
    email_id: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Otp = mongoose.model("Otp", otpSchema);
module.exports = Otp;
