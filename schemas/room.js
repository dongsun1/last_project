const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  socketId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
  },
  roomTitle: {
    type: String,
    required: true,
  },
  roomPeople: {
    type: String,
  },
  password: {
    type: String,
  },
  currentPeople: [],
  currentPeopleSocketId: [],
  start: {
    default: false,
  },
  voteList: [],
  night: {
    default: false,
  },
});

module.exports = mongoose.model("User", userSchema);
