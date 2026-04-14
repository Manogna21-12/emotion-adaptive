const mongoose = require('mongoose');
const EmotionLog = require('../models/EmotionLog');
const UserStat = require('../models/UserStat');
const { calculateNewFocusScore } = require('../utils/focusScoreHelper');

// @route   POST /api/log-emotion
// @desc    Store new emotion log and update user stats
// @access  Public
exports.logEmotion = async (req, res, next) => {
  try {
    const { userId, emotion, focus } = req.body;

    // Find User Stats or create if not exists
    let userStats = await UserStat.findOne({ userId });
    if (!userStats) {
      userStats = new UserStat({ userId });
    }

    // Get number of existing logs to correctly calculate average
    const currentLogCount = await EmotionLog.countDocuments({ userId });

    // Store new entry in emotion_logs
    const newEmotionLog = await EmotionLog.create({
      userId,
      emotion,
      focus
    });

    // Update user_stats:
    // 1. Increase time_spent (Assuming each log adds 5 minutes of time spent, this can be customized)
    userStats.time_spent += 5;

    // 2. Adjust focus_score (average logic via helper)
    userStats.focus_score = calculateNewFocusScore(userStats.focus_score, currentLogCount, focus);

    // 3. Update last_updated
    userStats.last_updated = Date.now();

    // Save updated stats
    await userStats.save();

    res.status(201).json({
      success: true,
      message: 'Emotion logged successfully',
      data: {
        log: newEmotionLog,
        updatedStats: {
          time_spent: userStats.time_spent,
          focus_score: userStats.focus_score,
          last_updated: userStats.last_updated
        }
      }
    });

  } catch (error) {
    next(error);
  }
};
