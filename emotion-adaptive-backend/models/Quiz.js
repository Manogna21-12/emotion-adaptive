const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    index: true
  },
  emotionTag: {
    type: String,
    enum: ['sad', 'confused', 'happy', 'angry'],
    required: true,
    index: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  correctAnswer: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'quizzes'
});

// Index for efficient emotion-based queries
quizSchema.index({ emotionTag: 1, difficulty: 1, isActive: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
