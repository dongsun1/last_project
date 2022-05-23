const mongoose = require("mongoose");

const voteSchema = mongoose.Schema({
  roomId: {
    type: Number,
    required: true,
  },
  userSocketId: {
    type: String,
    required: true,
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
    required: true,
  },
});

module.exports = mongoose.model("Vote", voteSchema);
