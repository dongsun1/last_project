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
  },
  userLose: {
    type: Number,
  },
  from: {
    type: String,
  },
  friendList: [],
});

module.exports = mongoose.model("User", userSchema);
