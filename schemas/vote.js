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
  clickerId: {
    type: String,
    required: true,
  },
  clickedId: {
    type: String,
    required: true,
  },
  day: {
    type: Boolean,
    required: true,
  },
});

module.exports = mongoose.model("Vote", voteSchema);
