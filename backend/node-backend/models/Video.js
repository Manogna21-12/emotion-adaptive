const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a video title'],
    trim: true,
  },
  level: {
    type: String,
    required: [true, 'Please provide a level (e.g., Beginner)'],
    trim: true,
  },
  duration: {
    type: String,
    trim: true,
  },
  video_url: {
    type: String,
    required: [true, 'Please provide a video URL'],
  },
  emotion_tag: {
    type: String,
    required: [true, 'Please provide an emotion tag for the video'],
    trim: true,
    lowercase: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
