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
        return options && options.length >= 2 && options.length <= 6;
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
    required: true,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  emotionTag: {
    type: String,
    required: true,
    enum: ['confused', 'sad', 'happy', 'angry'],
    default: 'confused'
  },
  category: {
    type: String,
    trim: true,
    maxlength: 100
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  points: {
    type: Number,
    min: 1,
    max: 100,
    default: 10
  },
  timeLimit: {
    type: Number,
    min: 10,
    max: 300,
    default: 30
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
  collection: 'Quizz'
});

// Indexes for performance
quizSchema.index({ emotionTag: 1, difficulty: 1, createdAt: -1 });
quizSchema.index({ difficulty: 1, createdAt: -1 });
quizSchema.index({ isActive: 1, createdAt: -1 });
quizSchema.index({ createdAt: -1 });

// Virtual for success rate
quizSchema.virtual('successRate').get(function() {
  return this.attempts > 0 ? (this.correctAttempts / this.attempts * 100).toFixed(2) : 0;
});

// Static method to get quiz by emotion
quizSchema.statics.getQuizByEmotion = async function(emotion, difficulty = null) {
  const query = { 
    emotionTag: emotion,
    isActive: true 
  };
  
  if (difficulty) {
    query.difficulty = difficulty;
  }
  
  return this.findOne(query)
    .sort({ createdAt: -1 })
    .exec();
};

// Static method to get quizzes by emotion with multiple options
quizSchema.statics.getQuizzesByEmotion = async function(emotion, limit = 5) {
  return this.find({ 
    emotionTag: emotion,
    isActive: true 
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

// Static method to get random quiz by emotion
quizSchema.statics.getRandomQuizByEmotion = async function(emotion, difficulty = null) {
  const query = { 
    emotionTag: emotion,
    isActive: true 
  };
  
  if (difficulty) {
    query.difficulty = difficulty;
  }
  
  const count = await this.countDocuments(query);
  const random = Math.floor(Math.random() * count);
  
  return this.findOne(query)
    .skip(random)
    .exec();
};

// Instance method to check answer
quizSchema.methods.checkAnswer = function(userAnswer) {
  return this.correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
};

// Instance method to get display data
quizSchema.methods.getDisplayData = function() {
  const difficultyColors = {
    easy: '#10b981',
    medium: '#f59e0b',
    hard: '#ef4444'
  };
  
  const emotionIcons = {
    confused: '🤔',
    sad: '😢',
    happy: '😊',
    angry: '😠'
  };
  
  return {
    _id: this._id,
    title: this.title,
    question: this.question,
    options: this.options,
    correctAnswer: this.correctAnswer,
    difficulty: this.difficulty,
    difficultyColor: difficultyColors[this.difficulty],
    emotionTag: this.emotionTag,
    emotionIcon: emotionIcons[this.emotionTag],
    category: this.category,
    explanation: this.explanation,
    points: this.points,
    timeLimit: this.timeLimit,
    createdAt: this.createdAt,
    successRate: this.successRate
  };
};

// Pre-save middleware
quizSchema.pre('save', function(next) {
  // Validate that correctAnswer is one of the options
  if (this.options && this.options.length > 0) {
    if (!this.options.includes(this.correctAnswer)) {
      return next(new Error('Correct answer must be one of the options'));
    }
  }
  next();
});

// Post-save middleware for real-time updates
quizSchema.post('save', function(doc) {
  console.log(`📝 Quiz saved: ${doc.title} (${doc.emotionTag} - ${doc.difficulty})`);
});

module.exports = mongoose.model('Quiz', quizSchema);
