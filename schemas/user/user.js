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
  ready: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("User", userSchema);
