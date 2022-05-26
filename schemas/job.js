const mongoose = require("mongoose");

const jobSchema = mongoose.Schema({
  roomId: {
    type: string,
    required: true,
    unique: true,
  },
  userSocketId: {
    type: String,
    required: true,
  },
  userNick: {
    type: String,
    required: true,
  },
  userJob: {
    type: String,
    required: true,
  },
  save: {
    type: Boolean,
    default: true,
  },
  AI: {
    type: Boolean,
    default: false,
  },
  chance: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Job", jobSchema);
