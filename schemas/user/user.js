const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
  },
  userPw: {
    type: String,
  },
  userNick: {
    type: String,
  },
  userProfile: {
    type: String,
  },
  userWin: {
    type: Number,
    default: 0,
  },
  userLose: {
    type: Number,
    default: 0,
  },
  from: {
    type: String,
  },
  friendList: [],
});

module.exports = mongoose.model("User", userSchema);
