const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');

// Force connection to emotion_learning explicitly
const MONGODB_URI = 'mongodb://localhost:27017/emotion_learning';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('🔗 Connected to MongoDB database: emotion_learning');
  
  const newQuiz = new Quiz({
    title: 'Did it work?',
    question: 'How many fingers am I holding up?',
    options: ['One', 'Two', 'Three', 'Four'],
    correctAnswer: 'Three',
    difficulty: 'easy',
    emotionTag: 'confused',
    category: 'Test',
    explanation: 'I am an AI, I have no fingers.',
    points: 10,
    timeLimit: 30
  });

  await newQuiz.save();
  console.log('✅ Quiz stored successfully inside emotion_learning -> Quizz collection!');
  
  await mongoose.connection.close();
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
