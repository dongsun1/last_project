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
  userJob: {
    type: String,
    required: true,
  },
  save: {
    type: Boolean,
    default: true,
  },
  chance: {
    type: Boolean,
  },
});

module.exports = mongoose.model("Job", jobSchema);
