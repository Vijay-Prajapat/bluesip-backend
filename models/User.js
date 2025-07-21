const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: { type: String, required: true, unique: true },
  password: String,
  role: {
    type: String,
    enum: ['admin', 'staffhead', 'staff'],
    default: 'staff'
  }
});

module.exports = mongoose.model("User", userSchema);
