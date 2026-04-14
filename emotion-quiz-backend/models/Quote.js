const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  author: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'Unknown'
  },
  emotionTag: {
    type: String,
    enum: ['confused', 'sad', 'happy', 'angry', 'any'],
    default: 'any'
  },
  category: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'motivational'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'quotes'
});

// Indexes
quoteSchema.index({ emotionTag: 1, createdAt: -1 });
quoteSchema.index({ text: 'text', author: 'text' });
quoteSchema.index({ isActive: 1 });

// Static: get quote by emotion (random pick)
quoteSchema.statics.getByEmotion = async function(emotion, limit = 1) {
  const docs = await this.find({
    emotionTag: { $in: [emotion, 'any'] },
    isActive: true
  }).exec();

  if (!docs.length) return [];

  // Shuffle and slice
  const shuffled = docs.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
};

module.exports = mongoose.model('Quote', quoteSchema);
