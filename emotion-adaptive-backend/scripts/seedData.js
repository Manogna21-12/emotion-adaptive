const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const Video = require('../models/Video');
const Quote = require('../models/Quote');
const User = require('../models/User');

// Sample quiz data
const sampleQuizzes = [
  {
    title: "Basic Math Quiz",
    description: "Simple arithmetic for confused students",
    difficulty: "easy",
    emotionTag: "confused",
    question: "What is 15 + 27?",
    options: ["40", "41", "42", "43"],
    correctAnswer: "42"
  },
  {
    title: "Advanced Algebra Challenge",
    description: "Challenging math for happy students",
    difficulty: "hard",
    emotionTag: "happy",
    question: "Solve for x: 2x + 5 = 15",
    options: ["x = 5", "x = 10", "x = 15", "x = 20"],
    correctAnswer: "x = 5"
  },
  {
    title: "Gentle Reading Comprehension",
    description: "Easy reading for sad students",
    difficulty: "easy",
    emotionTag: "sad",
    question: "What is the main theme of 'Hope'?",
    options: ["Despair", "Optimism", "Fear", "Anger"],
    correctAnswer: "Optimism"
  }
];

// Sample video data
const sampleVideos = [
  {
    title: "Understanding Math Basics",
    url: "https://www.youtube.com/watch?v=example1",
    emotionTag: "confused",
    topic: "Mathematics",
    duration: 300
  },
  {
    title: "Calming Breathing Exercises",
    url: "https://www.youtube.com/watch?v=example2",
    emotionTag: "angry",
    topic: "Wellness",
    duration: 180
  }
];

// Sample quote data
const sampleQuotes = [
  {
    text: "Every expert was once a beginner.",
    emotionTag: "sad",
    author: "Helen Hayes",
    category: "Motivation"
  },
  {
    text: "The only way to do great work is to love what you do.",
    emotionTag: "confused",
    author: "Steve Jobs",
    category: "Inspiration"
  },
  {
    text: "Believe you can and you're halfway there.",
    emotionTag: "angry",
    author: "Theodore Roosevelt",
    category: "Encouragement"
  }
];

// Sample user data
const sampleUsers = [
  {
    name: "Demo Student",
    email: "student@example.com",
    password: "password123",
    role: "student"
  },
  {
    name: "Admin User",
    email: "admin@example.com",
    password: "admin123",
    role: "admin"
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emotion-adaptive-db');
    console.log('🔗 Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️ Clearing existing data...');
    await Quiz.deleteMany({});
    await Video.deleteMany({});
    await Quote.deleteMany({});
    await User.deleteMany({});

    // Insert sample data
    console.log('📚 Inserting quizzes...');
    const insertedQuizzes = await Quiz.insertMany(sampleQuizzes);
    console.log(`✅ Inserted ${insertedQuizzes.length} quizzes`);

    console.log('🎬 Inserting videos...');
    const insertedVideos = await Video.insertMany(sampleVideos);
    console.log(`✅ Inserted ${insertedVideos.length} videos`);

    console.log('💭 Inserting quotes...');
    const insertedQuotes = await Quote.insertMany(sampleQuotes);
    console.log(`✅ Inserted ${insertedQuotes.length} quotes`);

    console.log('👥 Inserting users...');
    const insertedUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Inserted ${insertedUsers.length} users`);

    // Display inserted data
    console.log('\n📊 INSERTED DATA SUMMARY:');
    console.log('========================');
    
    console.log('\n📚 Quizzes:');
    insertedQuizzes.forEach((quiz, index) => {
      console.log(`${index + 1}. ${quiz.title} (${quiz.emotionTag} - ${quiz.difficulty})`);
      console.log(`   ID: ${quiz._id}`);
      console.log(`   Question: ${quiz.question}`);
    });

    console.log('\n🎬 Videos:');
    insertedVideos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title} (${video.emotionTag})`);
      console.log(`   ID: ${video._id}`);
      console.log(`   URL: ${video.url}`);
    });

    console.log('\n💭 Quotes:');
    insertedQuotes.forEach((quote, index) => {
      console.log(`${index + 1}. "${quote.text}" (${quote.emotionTag})`);
      console.log(`   ID: ${quote._id}`);
      console.log(`   Author: ${quote.author}`);
    });

    console.log('\n👥 Users:');
    insertedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.role})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
    });

    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Helper function to update specific quiz
async function updateQuiz(quizId, updates) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emotion-adaptive-db');
    
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      quizId,
      updates,
      { new: true }
    );
    
    if (updatedQuiz) {
      console.log('✅ Quiz updated successfully:');
      console.log(updatedQuiz);
    } else {
      console.log('❌ Quiz not found');
    }
    
  } catch (error) {
    console.error('❌ Error updating quiz:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Helper function to add new quiz
async function addNewQuiz(quizData) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emotion-adaptive-db');
    
    const newQuiz = new Quiz(quizData);
    await newQuiz.save();
    
    console.log('✅ New quiz added successfully:');
    console.log(newQuiz);
    
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
      seedDatabase();
      break;
      
    case 'update':
      const quizId = process.argv[3];
      if (!quizId) {
        console.log('❌ Please provide quiz ID: npm run seed update <quiz-id>');
        process.exit(1);
      }
      console.log('📝 Updating quiz with ID:', quizId);
      // Example update - you can modify this
      updateQuiz(quizId, {
        title: "Updated Quiz Title",
        question: "Updated question?",
        options: ["New Option 1", "New Option 2", "New Option 3", "New Option 4"],
        correctAnswer: "New Option 1"
      });
      break;
      
    case 'add':
      console.log('➕ Adding new quiz...');
      // Example new quiz - you can modify this
      addNewQuiz({
        title: "New Custom Quiz",
        description: "Custom quiz description",
        difficulty: "medium",
        emotionTag: "confused",
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: "Paris"
      });
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  npm run seed              - Seed database with sample data');
      console.log('  npm run seed update <id>   - Update specific quiz');
      console.log('  npm run seed add           - Add new quiz');
      break;
  }
}

module.exports = {
  seedDatabase,
  updateQuiz,
  addNewQuiz
};
