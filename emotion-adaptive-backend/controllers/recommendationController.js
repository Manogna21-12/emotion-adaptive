const EmotionLog = require('../models/EmotionLog');
const Quiz = require('../models/Quiz');
const Video = require('../models/Video');
const Quote = require('../models/Quote');
const User = require('../models/User');

class RecommendationController {
  // Get recommendation based on user's latest emotion
  async getRecommendation(req, res) {
    try {
      const { userId } = req.params;

      // Validate userId
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Fetch latest emotion for the user
      const latestEmotion = await EmotionLog
        .findOne({ userId })
        .sort({ createdAt: -1 })
        .lean();

      if (!latestEmotion) {
        return res.status(404).json({
          success: false,
          message: 'No emotion data found for this user',
          data: null
        });
      }

      const emotion = latestEmotion.emotion;
      let recommendation = {};

      // Recommendation logic based on emotion
      switch (emotion) {
        case 'confused':
          recommendation = await this.getConfusedRecommendation();
          break;
        
        case 'sad':
          recommendation = await this.getSadRecommendation();
          break;
        
        case 'happy':
          recommendation = await this.getHappyRecommendation();
          break;
        
        case 'angry':
          recommendation = await this.getAngryRecommendation();
          break;
        
        default:
          recommendation = await this.getDefaultRecommendation();
      }

      // Update user's last emotion and recommendation timestamp
      await User.findByIdAndUpdate(userId, {
        lastEmotion: emotion,
        lastRecommendationAt: new Date()
      });

      res.status(200).json({
        success: true,
        data: {
          emotion,
          recommendation,
          timestamp: new Date(),
          userId
        }
      });

    } catch (error) {
      console.error('Error getting recommendation:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Confused emotion: 1 easy quiz + 1 short video
  async getConfusedRecommendation() {
    try {
      const [easyQuiz, shortVideo] = await Promise.all([
        Quiz.findOne({ 
          emotionTag: 'confused', 
          difficulty: 'easy',
          isActive: true 
        }).sort({ createdAt: -1 }),
        
        Video.findOne({ 
          emotionTag: 'confused',
          isActive: true 
        }).sort({ createdAt: -1 })
      ]);

      return {
        type: 'confused',
        title: 'Let\'s clarify things!',
        message: 'You seem confused. Here\'s a simple quiz and a helpful video to clear things up.',
        content: {
          quiz: easyQuiz,
          video: shortVideo
        },
        priority: 'high'
      };
    } catch (error) {
      console.error('Error getting confused recommendation:', error);
      return this.getDefaultRecommendation();
    }
  }

  // Sad emotion: 1 motivational quote + 1 easy quiz
  async getSadRecommendation() {
    try {
      const [motivationalQuote, easyQuiz] = await Promise.all([
        Quote.findOne({ 
          emotionTag: 'sad',
          isActive: true 
        }).sort({ createdAt: -1 }),
        
        Quiz.findOne({ 
          emotionTag: 'sad', 
          difficulty: 'easy',
          isActive: true 
        }).sort({ createdAt: -1 })
      ]);

      return {
        type: 'sad',
        title: 'You\'ve got this!',
        message: 'Everyone feels sad sometimes. Here\'s some motivation and a gentle activity.',
        content: {
          quote: motivationalQuote,
          quiz: easyQuiz
        },
        priority: 'high'
      };
    } catch (error) {
      console.error('Error getting sad recommendation:', error);
      return this.getDefaultRecommendation();
    }
  }

  // Happy emotion: 1 hard quiz
  async getHappyRecommendation() {
    try {
      const challengingQuiz = await Quiz.findOne({ 
        emotionTag: 'happy', 
        difficulty: 'hard',
        isActive: true 
      }).sort({ createdAt: -1 });

      return {
        type: 'happy',
        title: 'Great to see you happy!',
        message: 'You\'re in a great mood! Ready for a challenge?',
        content: {
          quiz: challengingQuiz
        },
        priority: 'medium'
      };
    } catch (error) {
      console.error('Error getting happy recommendation:', error);
      return this.getDefaultRecommendation();
    }
  }

  // Angry emotion: break suggestion
  async getAngryRecommendation() {
    try {
      return {
        type: 'angry',
        title: 'Take a moment',
        message: 'It\'s okay to feel angry. Let\'s take a short break and reset.',
        content: {
          breakMessage: 'Take a 5-minute break. Try deep breathing or a short walk.',
          breakDuration: 5,
          suggestedActivities: [
            'Deep breathing exercises',
            'Short walk',
            'Listen to calming music',
            'Stretch your body'
          ]
        },
        priority: 'high'
      };
    } catch (error) {
      console.error('Error getting angry recommendation:', error);
      return this.getDefaultRecommendation();
    }
  }

  // Default fallback recommendation
  async getDefaultRecommendation() {
    return {
      type: 'default',
      title: 'Keep learning!',
      message: 'Here\'s something to help you continue your learning journey.',
      content: {
        message: 'Continue with your current learning path.',
        suggestion: 'Review previous topics or try a new activity.'
      },
      priority: 'low'
    };
  }

  // Log new emotion (for testing/manual logging)
  async logEmotion(req, res) {
    try {
      const { userId, emotion } = req.body;

      if (!userId || !emotion) {
        return res.status(400).json({
          success: false,
          message: 'User ID and emotion are required'
        });
      }

      // Create new emotion log
      const emotionLog = new EmotionLog({
        userId,
        emotion
      });

      await emotionLog.save();

      // Update user's last emotion
      await User.findByIdAndUpdate(userId, {
        lastEmotion: emotion
      });

      res.status(201).json({
        success: true,
        message: 'Emotion logged successfully',
        data: emotionLog
      });

    } catch (error) {
      console.error('Error logging emotion:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get emotion history for a user
  async getEmotionHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10, page = 1 } = req.query;

      const emotions = await EmotionLog
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await EmotionLog.countDocuments({ userId });

      res.status(200).json({
        success: true,
        data: {
          emotions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error getting emotion history:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new RecommendationController();
