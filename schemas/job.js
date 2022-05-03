const mongoose = require("mongoose");

const jobSchema = mongoose.Schema({
  roomId: {
    type: Number,
    required: true,
  },
  userSocketId: {
    type: String,
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

module.exports = mongoose.model("Job", jobSchema);
