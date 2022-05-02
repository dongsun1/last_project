const mongoose = require("mongoose");

const voteSchema = mongoose.Schema({
  socketId: {
    type: String,
    required: true,
  },
  clicker: {
    type: String,
    required: true,
  },
  clicked: {
    type: String,
    required: true,
  },
  day: {
    type: Boolean,
  },
});

module.exports = mongoose.model("Vote", voteSchema);
