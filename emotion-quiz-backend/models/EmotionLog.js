const mongoose = require('mongoose');

const emotionLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  emotion: {
    type: String,
    required: true,
    enum: ['happy', 'sad', 'confused', 'angry']
  },
  sessionId: {
    type: String,
    trim: true
  },
  context: {
    type: String,
    trim: true,
    maxlength: 200
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    page: String,
    action: String,
    source: {
      type: String,
      default: 'manual'
    }
  }
}, {
  timestamps: true,
  collection: 'emotions_log'
});

// Indexes for performance
emotionLogSchema.index({ userId: 1, createdAt: -1 });
emotionLogSchema.index({ emotion: 1, createdAt: -1 });
emotionLogSchema.index({ sessionId: 1, createdAt: -1 });
emotionLogSchema.index({ createdAt: -1 });

// Static method to get latest emotion for user
emotionLogSchema.statics.getLatestEmotion = function(userId) {
  return this.findOne({ userId })
    .sort({ createdAt: -1 })
    .exec();
};

// Static method to get emotion history for user
emotionLogSchema.statics.getEmotionHistory = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

// Static method to get emotion statistics
emotionLogSchema.statics.getEmotionStats = function(userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$emotion',
        count: { $sum: 1 },
        latest: { $max: '$createdAt' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Instance method to get display data
emotionLogSchema.methods.getDisplayData = function() {
  const emotionData = {
    happy: { icon: '😊', color: '#10b981', label: 'Happy' },
    sad: { icon: '😢', color: '#3b82f6', label: 'Sad' },
    confused: { icon: '🤔', color: '#f59e0b', label: 'Confused' },
    angry: { icon: '😠', color: '#ef4444', label: 'Angry' }
  };
  
  return {
    _id: this._id,
    userId: this.userId,
    emotion: this.emotion,
    icon: emotionData[this.emotion]?.icon || '😐',
    color: emotionData[this.emotion]?.color || '#6b7280',
    label: emotionData[this.emotion]?.label || 'Unknown',
    sessionId: this.sessionId,
    context: this.context,
    metadata: this.metadata,
    createdAt: this.createdAt
  };
};

// Pre-save middleware
emotionLogSchema.pre('save', function(next) {
  // Set sessionId if not provided
  if (!this.sessionId) {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Set metadata source if not provided
  if (!this.metadata || !this.metadata.source) {
    if (!this.metadata) this.metadata = {};
    this.metadata.source = 'manual';
  }
  
  next();
});

// Post-save middleware for real-time updates
emotionLogSchema.post('save', function(doc) {
  console.log(`📊 Emotion logged: ${doc.emotion} for user ${doc.userId} at ${doc.createdAt}`);
});

module.exports = mongoose.model('EmotionLog', emotionLogSchema);
