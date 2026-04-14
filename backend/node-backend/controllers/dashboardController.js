const mongoose = require('mongoose');
const UserStat = require('../models/UserStat');
const EmotionLog = require('../models/EmotionLog');

// @route   GET /api/dashboard/:userId
// @desc    Get dashboard metrics, user stats, and graph data
// @access  Public
exports.getDashboardData = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Validate valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID format' });
    }

    // 1. Fetch user_stats for the given userId
    let userStats = await UserStat.findOne({ userId });

    if (!userStats) {
      // If no stats found, let's create a default one for the sake of demo
      userStats = await UserStat.create({ userId });
    }

    // 2 & 5. Fetch last 6 emotion_logs & use aggregation for graph data
    // Sort desc to get latest 6, then sort asc for graph chronological order
    const graphData = await EmotionLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { timestamp: -1 } },
      { $limit: 6 },
      { $sort: { timestamp: 1 } },
      {
        $project: {
          _id: 0,
          time: { 
            // Formats to HH:MM format like "10:30"
            $dateToString: { format: "%H:%M", date: "$timestamp" } 
          },
          focus: 1,
          emotion: 1
        }
      }
    ]);

    // 3. Calculate latest emotion (most recent log)
    // Since graphData is chronologically ordered (oldest to newest of the last 6),
    // the very last item is the most recent.
    const latestLog = graphData.length > 0 ? graphData[graphData.length - 1] : null;
    const currentEmotion = latestLog ? latestLog.emotion : 'neutral';
    const focusScoreLive = latestLog ? latestLog.focus : 0;

    // Remove emotion from graph objects to match EXACT requested output format
    const formattedGraphData = graphData.map(log => ({
      time: log.time,
      focus: log.focus
    }));

    // 4. Return response in specified format
    res.status(200).json({
      focus_score: userStats.focus_score,
      time_spent: userStats.time_spent,
      streak: userStats.streak,
      topics_mastered: userStats.topics_mastered,
      current_emotion: currentEmotion,
      focus_score_live: focusScoreLive,
      graph_data: formattedGraphData
    });

  } catch (error) {
    next(error);
  }
};
