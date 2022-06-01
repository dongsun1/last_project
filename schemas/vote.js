const mongoose = require("mongoose");

const voteSchema = mongoose.Schema({
  roomId: {
    type: String,
    required: true,
  },
  userSocketId: {
    type: String,
  },
  clickerJob: {
    type: String,
    required: true,
  },
  clickerNick: {
    type: String,
    required: true,
  },
  clickedNick: {
    type: String,
    required: true,
  },
  day: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Vote", voteSchema);
