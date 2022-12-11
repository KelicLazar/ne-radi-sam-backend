const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  type: { type: String, required: true },
  date: { type: Date, required: true },
  forJob: { type: String, required: false },
  byUser: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

module.exports = mongoose.model("Notification", notificationSchema);
