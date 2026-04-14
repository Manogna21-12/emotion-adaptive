const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  topic: {
    type: String,
    trim: true,
    maxlength: 200
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  emotionTag: {
    type: String,
    enum: ['confused', 'sad', 'happy', 'angry', 'any'],
    default: 'any'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  duration: {
    type: Number, // in seconds
    min: 0,
    default: 0
  },
  thumbnail: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'videos'
});

// Indexes
videoSchema.index({ emotionTag: 1, createdAt: -1 });
videoSchema.index({ title: 'text', topic: 'text', description: 'text' });
videoSchema.index({ isActive: 1 });

// Static: get video by emotion
videoSchema.statics.getByEmotion = function(emotion, limit = 1) {
  return this.find({ emotionTag: { $in: [emotion, 'any'] }, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

module.exports = mongoose.model('Video', videoSchema);
