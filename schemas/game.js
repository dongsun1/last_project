const mongoose = require("mongoose");

const gameSchema = mongoose.Schema({
  roomId: {
    type: Number,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  userJop: {
    type: String,
    required: true,
  },
  save: {
    type: Boolean,
    required: true,
    default: true,
  },
});

module.exports = mongoose.model("Game", gameSchema);
