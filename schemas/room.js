const mongoose = require("mongoose");

const roomSchema = mongoose.Schema({
  roomId: {
    type: Number,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  roomTitle: {
    type: String,
    required: true,
  },
  roomPeople: {
    type: Number,
    required: true,
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
  currentReadyPeople: {
    type: Array,
    default: [],
  },
  start: {
    type: Boolean,
    default: false,
  },
  night: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Room", roomSchema);
