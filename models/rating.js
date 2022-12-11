const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ratingSchema = new Schema({
  rate: { type: Number, require: true },
  comment: { type: String, required: true },
  dateCreated: { type: Date, required: true },
  byUser: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

module.exports = mongoose.model("Rating", ratingSchema);
