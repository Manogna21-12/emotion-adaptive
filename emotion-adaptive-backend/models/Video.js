const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  emotionTag: {
    type: String,
    enum: ['sad', 'confused', 'happy', 'angry'],
    required: true,
    index: true
  },
  topic: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  duration: {
    type: Number, // in seconds
    required: true
  },
  thumbnail: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'videos'
});

// Index for efficient emotion-based queries
videoSchema.index({ emotionTag: 1, isActive: 1 });

module.exports = mongoose.model('Video', videoSchema);
