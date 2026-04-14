const EmotionLog = require('../models/EmotionLog');
const mongoose = require('mongoose');

// GET /api/emotion/:userId - Fetch latest emotion for user
const getLatestEmotion = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const latestEmotion = await EmotionLog.getLatestEmotion(userId);
    
    if (!latestEmotion) {
      return res.status(404).json({
        success: false,
        message: 'No emotion data found for this user'
      });
    }

    const displayData = latestEmotion.getDisplayData();

    res.status(200).json({
      success: true,
      data: displayData
    });

  } catch (error) {
    console.error('Error fetching latest emotion:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// GET /api/emotion/:userId/history - Get emotion history for user
const getEmotionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, page = 1 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [emotions, total] = await Promise.all([
      EmotionLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      EmotionLog.countDocuments({ userId })
    ]);

    const displayData = emotions.map(emotion => {
      const emotionObj = new EmotionLog(emotion);
      return emotionObj.getDisplayData();
    });

    res.status(200).json({
      success: true,
      data: {
        emotions: displayData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: skip + parseInt(limit) < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching emotion history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// POST /api/emotion - Log new emotion
const logEmotion = async (req, res) => {
  try {
    const { userId, emotion, metadata = {} } = req.body;
    
    if (!userId || !emotion) {
      return res.status(400).json({
        success: false,
        message: 'User ID and emotion are required'
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate emotion
    const validEmotions = ['happy', 'sad', 'confused', 'angry'];
    if (!validEmotions.includes(emotion)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emotion. Must be one of: ' + validEmotions.join(', ')
      });
    }

    // Create emotion log
    const emotionLog = new EmotionLog({
      userId,
      emotion,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        page: metadata.page || 'unknown',
        action: metadata.action || 'manual',
        ...metadata
      }
    });

    await emotionLog.save();

    const displayData = emotionLog.getDisplayData();

    console.log(`✅ New emotion logged: ${emotion} for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Emotion logged successfully',
      data: displayData
    });

  } catch (error) {
    console.error('Error logging emotion:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// GET /api/emotion - Get all latest emotions (for admin)
const getAllLatestEmotions = async (req, res) => {
  try {
    const latestEmotions = await EmotionLog.getAllLatestEmotions();
    
    const displayData = latestEmotions.map(item => {
      const emotionData = {
        happy: { icon: '😊', color: '#10b981', label: 'Happy' },
        sad: { icon: '😢', color: '#3b82f6', label: 'Sad' },
        confused: { icon: '🤔', color: '#f59e0b', label: 'Confused' },
        angry: { icon: '😠', color: '#ef4444', label: 'Angry' }
      };
      
      return {
        userId: item._id,
        emotion: item.latestEmotion,
        icon: emotionData[item.latestEmotion]?.icon || '😐',
        color: emotionData[item.latestEmotion]?.color || '#6b7280',
        label: emotionData[item.latestEmotion]?.label || 'Unknown',
        timestamp: item.latestTimestamp
      };
    });

    res.status(200).json({
      success: true,
      data: displayData
    });

  } catch (error) {
    console.error('Error fetching all latest emotions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// GET /api/emotion/stats/:userId - Get emotion statistics for user
const getEmotionStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const stats = await EmotionLog.getEmotionStats(userId, parseInt(days));
    
    res.status(200).json({
      success: true,
      data: {
        userId,
        period: `${days} days`,
        stats: stats
      }
    });

  } catch (error) {
    console.error('Error fetching emotion stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getLatestEmotion,
  getEmotionHistory,
  logEmotion,
  getAllLatestEmotions,
  getEmotionStats
};
