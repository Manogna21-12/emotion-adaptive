const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');

// Sample quiz data for testing
const sampleQuizzes = [
  {
    title: "Basic Mathematics",
    question: "What is 15 + 27?",
    options: ["40", "41", "42", "43"],
    correctAnswer: "42",
    difficulty: "easy",
    emotionTag: "confused",
    category: "Mathematics",
    timeLimit: 30,
    points: 10
  },
  {
    title: "World Geography",
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: "Paris",
    difficulty: "easy",
    emotionTag: "happy",
    category: "Geography",
    timeLimit: 20,
    points: 10
  },
  {
    title: "Advanced Algebra",
    question: "Solve for x: 2x + 5 = 15",
    options: ["x = 5", "x = 10", "x = 15", "x = 20"],
    correctAnswer: "x = 5",
    difficulty: "hard",
    emotionTag: "confused",
    category: "Mathematics",
    timeLimit: 60,
    points: 20
  },
  {
    title: "Science Basics",
    question: "What is the chemical symbol for water?",
    options: ["H2O", "CO2", "O2", "N2"],
    correctAnswer: "H2O",
    difficulty: "easy",
    emotionTag: "sad",
    category: "Science",
    timeLimit: 15,
    points: 10
  },
  {
    title: "History Challenge",
    question: "In which year did World War II end?",
    options: ["1943", "1944", "1945", "1946"],
    correctAnswer: "1945",
    difficulty: "medium",
    emotionTag: "angry",
    category: "History",
    timeLimit: 45,
    points: 15
  },
  {
    title: "Programming Logic",
    question: "What does 'HTML' stand for?",
    options: [
      "Hyper Text Markup Language",
      "High Tech Modern Language",
      "Home Tool Markup Language",
      "Hyperlinks and Text Markup Language"
    ],
    correctAnswer: "Hyper Text Markup Language",
    difficulty: "medium",
    emotionTag: "confused",
    category: "Technology",
    timeLimit: 40,
    points: 15
  },
  {
    title: "Literature Quiz",
    question: "Who wrote 'Romeo and Juliet'?",
    options: [
      "Charles Dickens",
      "William Shakespeare",
      "Jane Austen",
      "Mark Twain"
    ],
    correctAnswer: "William Shakespeare",
    difficulty: "easy",
    emotionTag: "happy",
    category: "Literature",
    timeLimit: 25,
    points: 10
  },
  {
    title: "Physics Problem",
    question: "What is the speed of light in vacuum?",
    options: [
      "299,792 km/s",
      "199,792 km/s",
      "399,792 km/s",
      "99,792 km/s"
    ],
    correctAnswer: "299,792 km/s",
    difficulty: "hard",
    emotionTag: "confused",
    category: "Physics",
    timeLimit: 90,
    points: 25
  }
];

async function seedQuizzes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-management-db');
    console.log('🔗 Connected to MongoDB');

    // Clear existing quizzes (optional)
    console.log('🗑️ Clearing existing quizzes...');
    await Quiz.deleteMany({});

    // Insert sample quizzes
    console.log('📚 Inserting sample quizzes...');
    const insertedQuizzes = await Quiz.insertMany(sampleQuizzes);
    
    console.log(`✅ Successfully inserted ${insertedQuizzes.length} quizzes`);
    
    // Display inserted quizzes
    console.log('\n📊 INSERTED QUIZZES:');
    console.log('====================');
    
    insertedQuizzes.forEach((quiz, index) => {
      console.log(`${index + 1}. ${quiz.title}`);
      console.log(`   📝 Question: ${quiz.question}`);
      console.log(`   🎯 Difficulty: ${quiz.difficulty}`);
      console.log(`   😊 Emotion: ${quiz.emotionTag}`);
      console.log(`   📁 Category: ${quiz.category}`);
      console.log(`   🏆 Points: ${quiz.points}`);
      console.log(`   ⏱️ Time Limit: ${quiz.timeLimit}s`);
      console.log(`   🆔 ID: ${quiz._id}`);
      console.log('');
    });

    console.log('🎉 Quiz seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding quizzes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Add new quiz function
async function addNewQuiz(quizData) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-management-db');
    
    const newQuiz = new Quiz(quizData);
    await newQuiz.save();
    
    console.log('✅ New quiz added successfully!');
    console.log('📝 Quiz Details:');
    console.log(`   Title: ${newQuiz.title}`);
    console.log(`   Question: ${newQuiz.question}`);
    console.log(`   Difficulty: ${newQuiz.difficulty}`);
    console.log(`   Emotion: ${newQuiz.emotionTag}`);
    console.log(`   ID: ${newQuiz._id}`);
    
    // This will trigger the real-time update
    console.log('🚀 Real-time update will be sent to all connected clients!');
    
  } catch (error) {
    console.error('❌ Error adding quiz:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Command line usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'seed':
      seedQuizzes();
      break;
      
    case 'add':
      console.log('➕ Adding a new quiz...');
      // Example new quiz - you can modify this
      addNewQuiz({
        title: "New Dynamic Quiz",
        question: "What is 8 × 7?",
        options: ["54", "56", "58", "60"],
        correctAnswer: "56",
        difficulty: "medium",
        emotionTag: "happy",
        category: "Mathematics",
        timeLimit: 30,
        points: 15
      });
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  npm run seed              - Seed database with sample quizzes');
      console.log('  npm run seed add           - Add a new quiz (triggers real-time update)');
      console.log('');
      console.log('💡 Tip: Use "npm run seed add" to test real-time updates!');
      break;
  }
}

module.exports = {
  seedQuizzes,
  addNewQuiz
};
