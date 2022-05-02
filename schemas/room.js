const mongoose = require("mongoose");

const roomSchema = mongoose.Schema({
  roomId: {
    type: Number,
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
  currentPeople: {
    type: Array,
    default: [],
  },
  currentPeopleSocketId: {
    type: Array,
    default: [],
  },
  start: {
    default: false,
  },
  voteList: {
    type: Array,
    default: [],
  },
  night: {
    default: false,
  },
});

module.exports = mongoose.model("Room", roomSchema);
