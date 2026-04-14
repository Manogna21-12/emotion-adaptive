const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  emotionTag: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: String, required: true }
}, {
  collection: 'quizzes'
});

module.exports = mongoose.model('Quiz', QuizSchema);
