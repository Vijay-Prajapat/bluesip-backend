const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: { type: String, required: true, unique: true },
  password: String,
});

module.exports = mongoose.model("User", userSchema);
