const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    platformName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    userPayload: {
      type: String,
      required: true,
      trim: true,
    },

    fetchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  }
);

profileSchema.index({ platformName: 1, username: 1 }, { unique: true });

const Profile = mongoose.model("Profile", profileSchema);
module.exports = Profile;
