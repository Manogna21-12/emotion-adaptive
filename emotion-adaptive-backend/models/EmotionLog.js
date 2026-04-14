const mongoose = require('mongoose');

const emotionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  emotion: {
    type: String,
    enum: ['sad', 'confused', 'happy', 'angry'],
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'emotions_log'
});

// Compound indexes for better performance
emotionLogSchema.index({ userId: 1, createdAt: -1 });
emotionLogSchema.index({ emotion: 1, createdAt: -1 });

// Static method to get latest emotion for user
emotionLogSchema.statics.getLatestEmotion = function(userId) {
  return this.findOne({ userId })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
};

// Static method to get emotion history for user
emotionLogSchema.statics.getEmotionHistory = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();
};

// Static method to get all active users' latest emotions
emotionLogSchema.statics.getAllLatestEmotions = function() {
  return this.aggregate([
    {
      $sort: { userId: 1, createdAt: -1 }
    },
    {
      $group: {
        _id: '$userId',
        latestEmotion: { $first: '$emotion' },
        latestTimestamp: { $first: '$createdAt' }
      }
    },
    {
      $sort: { latestTimestamp: -1 }
    }
  ]);
};

// Instance method to get emotion display data
emotionLogSchema.methods.getDisplayData = function() {
  const emotionData = {
    happy: { icon: '😊', color: '#10b981', label: 'Happy' },
    sad: { icon: '😢', color: '#3b82f6', label: 'Sad' },
    confused: { icon: '🤔', color: '#f59e0b', label: 'Confused' },
    angry: { icon: '😠', color: '#ef4444', label: 'Angry' }
  };
  
  return {
    emotion: this.emotion,
    icon: emotionData[this.emotion]?.icon || '😐',
    color: emotionData[this.emotion]?.color || '#6b7280',
    label: emotionData[this.emotion]?.label || 'Unknown',
    timestamp: this.createdAt,
    userId: this.userId
  };
};

// Post-save middleware for real-time updates
emotionLogSchema.post('save', function(doc) {
  console.log(`📊 Emotion logged: ${doc.emotion} for user ${doc.userId} at ${doc.createdAt}`);
});

module.exports = mongoose.model('EmotionLog', emotionLogSchema);
