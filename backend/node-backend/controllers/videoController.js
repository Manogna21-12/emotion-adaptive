const Video = require('../models/Video');
const EmotionLog = require('../models/EmotionLog');

// @route   POST /api/get-video (legacy path)
// @desc    Fetch a random video matching the emotion tag
// @access  Public
exports.getRecommededVideo = async (req, res, next) => {
  try {
    const { emotion } = req.body;

    if (!emotion) {
      return res.status(400).json({ success: false, message: 'Emotion is required' });
    }

    const searchEmotion = emotion.toLowerCase().trim();

    // Use aggregation to fetch one random matching video
    const videos = await Video.aggregate([
      { $match: { emotion_tag: searchEmotion } },
      { $sample: { size: 1 } }
    ]);

    if (videos.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No video found for emotion: ${searchEmotion}`
      });
    }

    res.status(200).json({
      success: true,
      data: videos[0]
    });

  } catch (error) {
    next(error);
  }
};

// @route   GET /api/videos
// @desc    Fetch all videos, optionally filter by ?emotion=
// @access  Public
exports.getVideos = async (req, res, next) => {
  try {
    const { emotion } = req.query;
    let filter = {};

    if (emotion) {
      filter.emotion_tag = emotion.toLowerCase().trim();
    }

    const videos = await Video.find(filter);

    res.status(200).json(videos);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/videos/recommend/:userId
// @desc    Recommend 3 videos based on latest emotion
// @access  Public
exports.getRecommendations = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Fetch latest emotion
    const latestLog = await EmotionLog.findOne({ userId }).sort({ timestamp: -1 });
    
    // Default to 'neutral' if no emotion logged
    const emotionToSearch = latestLog ? latestLog.emotion : 'neutral';

    const videos = await Video.find({ emotion_tag: emotionToSearch }).limit(3);

    // If less than 3, we can pad with random ones or just return what we have
    res.status(200).json(videos);
  } catch (error) {
    next(error);
  }
};
