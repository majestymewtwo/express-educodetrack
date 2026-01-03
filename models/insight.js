const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema(
  {
    data: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      required: true,
    },
    isFaculty: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Insight = mongoose.model("Insight", insightSchema);
module.exports = Insight;
