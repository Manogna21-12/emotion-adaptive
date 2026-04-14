const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(options) {
        return options.length >= 2 && options.length <= 6;
      },
      message: 'Quiz must have between 2 and 6 options'
    }
  },
  correctAnswer: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    default: 'medium'
  },
  emotionTag: {
    type: String,
    enum: ['confused', 'happy', 'sad', 'angry'],
    required: true,
    default: 'confused'
  },
  category: {
    type: String,
    trim: true,
    maxlength: 100
  },
  timeLimit: {
    type: Number, // in seconds
    default: 30,
    min: 5,
    max: 300
  },
  points: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  correctAttempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'quizzes'
});

// Indexes for better performance
quizSchema.index({ createdAt: -1 });
quizSchema.index({ emotionTag: 1, difficulty: 1 });
quizSchema.index({ isActive: 1 });
quizSchema.index({ category: 1 });

// Virtual for success rate
quizSchema.virtual('successRate').get(function() {
  if (this.attempts === 0) return 0;
  return Math.round((this.correctAttempts / this.attempts) * 100);
});

// Pre-save middleware to validate correctAnswer is in options
quizSchema.pre('save', function(next) {
  if (this.isModified('options') || this.isModified('correctAnswer')) {
    if (!this.options.includes(this.correctAnswer)) {
      const error = new Error('Correct answer must be one of the options');
      return next(error);
    }
  }
  next();
});

// Static method to get active quizzes
quizSchema.statics.getActiveQuizzes = function(limit = 50, skip = 0) {
  return this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Static method to get quizzes by emotion
quizSchema.statics.getQuizzesByEmotion = function(emotionTag, limit = 20) {
  return this.find({ emotionTag, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get quiz statistics
quizSchema.statics.getStatistics = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalQuizzes: { $sum: 1 },
        easyQuizzes: { $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] } },
        mediumQuizzes: { $sum: { $cond: [{ $eq: ['$difficulty', 'medium'] }, 1, 0] } },
        hardQuizzes: { $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] } },
        totalAttempts: { $sum: '$attempts' },
        totalCorrect: { $sum: '$correctAttempts' }
      }
    }
  ]);
};

// Instance method to check answer
quizSchema.methods.checkAnswer = function(userAnswer) {
  return {
    correct: this.correctAnswer === userAnswer,
    correctAnswer: this.correctAnswer,
    points: this.points
  };
};

// Instance method to record attempt
quizSchema.methods.recordAttempt = function(isCorrect) {
  this.attempts += 1;
  if (isCorrect) {
    this.correctAttempts += 1;
  }
  return this.save();
};

module.exports = mongoose.model('Quiz', quizSchema);
