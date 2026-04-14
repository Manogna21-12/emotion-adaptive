const mongoose = require('mongoose');
const EmotionLog = require('../models/EmotionLog');

// Sample emotion data for testing
const sampleEmotions = [
  {
    userId: '60d5ecb74b5a52d2f2f2e1', // Mock user ID
    emotion: 'happy',
    metadata: {
      source: 'seed-script',
      page: 'dashboard',
      action: 'auto-generated'
    }
  },
  {
    userId: '60d5ecb74b5a52d2f2f2e1',
    emotion: 'confused',
    metadata: {
      source: 'seed-script',
      page: 'quiz',
      action: 'auto-generated'
    }
  },
  {
    userId: '60d5ecb74b5a52d2f2f2e2', // Another mock user ID
    emotion: 'sad',
    metadata: {
      source: 'seed-script',
      page: 'video',
      action: 'auto-generated'
    }
  },
  {
    userId: '60d5ecb74b5a52d2f2f2e2',
    emotion: 'angry',
    metadata: {
      source: 'seed-script',
      page: 'break',
      action: 'auto-generated'
    }
  }
];

async function seedEmotions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emotion-adaptive-db');
    console.log('🔗 Connected to MongoDB');

    // Clear existing emotions (optional)
    console.log('🗑️ Clearing existing emotions...');
    await EmotionLog.deleteMany({});

    // Insert sample emotions with timestamps
    console.log('📊 Inserting sample emotions...');
    const emotionsWithTimestamps = sampleEmotions.map((emotion, index) => ({
      ...emotion,
      createdAt: new Date(Date.now() - (index * 60000)) // Stagger by 1 minute
    }));

    const insertedEmotions = await EmotionLog.insertMany(emotionsWithTimestamps);
    
    console.log(`✅ Successfully inserted ${insertedEmotions.length} emotions`);
    
    // Display inserted emotions
    console.log('\n📊 INSERTED EMOTIONS:');
    console.log('========================');
    
    insertedEmotions.forEach((emotion, index) => {
      const displayData = emotion.getDisplayData();
      console.log(`${index + 1}. ${displayData.icon} ${displayData.label}`);
      console.log(`   User: ${emotion.userId}`);
      console.log(`   Time: ${emotion.createdAt.toLocaleString()}`);
      console.log(`   ID: ${emotion._id}`);
      console.log('');
    });

    console.log('🎉 Emotion seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding emotions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Add new emotion function
async function addNewEmotion(userId, emotionValue) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emotion-adaptive-db');
    
    const newEmotion = new EmotionLog({
      userId,
      emotion: emotionValue,
      metadata: {
        source: 'seed-script',
        page: 'test',
        action: 'manual-add'
      }
    });
    
    await newEmotion.save();
    
    const displayData = newEmotion.getDisplayData();
    
    console.log('✅ New emotion added successfully!');
    console.log('📝 Emotion Details:');
    console.log(`   ${displayData.icon} ${displayData.label}`);
    console.log(`   User: ${userId}`);
    console.log(`   Time: ${newEmotion.createdAt.toLocaleString()}`);
    console.log(`   ID: ${newEmotion._id}`);
    
    // This will trigger real-time update
    console.log('🚀 Real-time update will be sent to all connected clients!');
    
  } catch (error) {
    console.error('❌ Error adding emotion:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Command line usage
if (require.main === module) {
  const command = process.argv[2];
  const userId = process.argv[3];
  const emotion = process.argv[4];
  
  switch (command) {
    case 'seed':
      seedEmotions();
      break;
      
    case 'add':
      if (!userId || !emotion) {
        console.log('❌ Please provide userId and emotion');
        console.log('Usage: npm run seed-emotion add <userId> <emotion>');
        console.log('Emotions: happy, sad, confused, angry');
        process.exit(1);
      }
      
      console.log(`➕ Adding emotion "${emotion}" for user "${userId}"...`);
      addNewEmotion(userId, emotion);
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  npm run seed-emotion seed              - Seed database with sample emotions');
      console.log('  npm run seed-emotion add <userId> <emotion> - Add new emotion (triggers real-time update)');
      console.log('');
      console.log('💡 Examples:');
      console.log('  npm run seed-emotion add 60d5ecb74b5a52d2f2f2e1 happy');
      console.log('  npm run seed-emotion add 60d5ecb74b5a52d2f2f2e1 confused');
      console.log('');
      console.log('🎯 Use this to test real-time emotion updates!');
      break;
  }
}

module.exports = {
  seedEmotions,
  addNewEmotion
};
