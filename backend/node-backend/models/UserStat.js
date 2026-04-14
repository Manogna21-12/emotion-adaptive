const mongoose = require('mongoose');

const userStatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One stat document per user
  },
  focus_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  time_spent: {
    type: Number, // In minutes
    default: 0,
  },
  streak: {
    type: Number, // In days
    default: 0,
  },
  topics_mastered: {
    type: Number,
    default: 0,
  },
  last_updated: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('UserStat', userStatSchema);
