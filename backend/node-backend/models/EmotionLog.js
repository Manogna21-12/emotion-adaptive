const mongoose = require('mongoose');

const emotionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  emotion: {
    type: String,
    required: [true, 'Emotion is required'],
    trim: true,
    lowercase: true,
  },
  focus: {
    type: Number,
    required: [true, 'Focus score for this log is required'],
    min: [0, 'Focus score cannot be less than 0'],
    max: [100, 'Focus score cannot exceed 100'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('EmotionLog', emotionLogSchema);
