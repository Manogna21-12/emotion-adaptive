const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  text: {
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
  author: {
    type: String,
    trim: true
  },
  category: {
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
  collection: 'quotes'
});

// Index for efficient emotion-based queries
quoteSchema.index({ emotionTag: 1, isActive: 1 });

module.exports = mongoose.model('Quote', quoteSchema);
