const mongoose = require("mongoose");

const dataSchema = mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    question: { type: String, required: true },
    user_id: { type: String, required: true },
    response: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("DataModel", dataSchema);
