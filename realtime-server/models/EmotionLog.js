const mongoose = require('mongoose');

const EmotionLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  emotion: { 
    type: String, 
    enum: ["sad", "confused", "happy", "angry", "neutral", "fear", "surprise", "disgust"], 
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
}, {
  collection: 'emotions_log' // specified in requirement
});

module.exports = mongoose.model('EmotionLog', EmotionLogSchema);
