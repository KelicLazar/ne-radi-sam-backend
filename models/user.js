const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  image: { type: String, required: true },
  jobs: [{ type: mongoose.Types.ObjectId, required: true, ref: "Job" }],
  rating: [{ type: mongoose.Types.ObjectId, required: true, ref: "Rating" }],
  notifications: [
    { type: mongoose.Types.ObjectId, required: true, ref: "Notifications" },
  ],
});

module.exports = mongoose.model("User", userSchema);
