const Quiz = require('../models/Quiz');
const Video = require('../models/Video');
const Quote = require('../models/Quote');
const User = require('../models/User');

class AdminController {
  // Create new quiz
  async createQuiz(req, res) {
    try {
      const quizData = req.body;
      
      const quiz = new Quiz(quizData);
      await quiz.save();

      res.status(201).json({
        success: true,
        message: 'Quiz created successfully',
        data: quiz
      });
    } catch (error) {
      console.error('Error creating quiz:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get all quizzes
  async getQuizzes(req, res) {
    try {
      const { page = 1, limit = 10, emotionTag, difficulty } = req.query;
      
      const filter = { isActive: true };
      if (emotionTag) filter.emotionTag = emotionTag;
      if (difficulty) filter.difficulty = difficulty;

      const quizzes = await Quiz
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Quiz.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          quizzes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error getting quizzes:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Create new video
  async createVideo(req, res) {
    try {
      const videoData = req.body;
      
      const video = new Video(videoData);
      await video.save();

      res.status(201).json({
        success: true,
        message: 'Video created successfully',
        data: video
      });
    } catch (error) {
      console.error('Error creating video:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get all videos
  async getVideos(req, res) {
    try {
      const { page = 1, limit = 10, emotionTag } = req.query;
      
      const filter = { isActive: true };
      if (emotionTag) filter.emotionTag = emotionTag;

      const videos = await Video
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Video.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          videos,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error getting videos:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Create new quote
  async createQuote(req, res) {
    try {
      const quoteData = req.body;
      
      const quote = new Quote(quoteData);
      await quote.save();

      res.status(201).json({
        success: true,
        message: 'Quote created successfully',
        data: quote
      });
    } catch (error) {
      console.error('Error creating quote:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get all quotes
  async getQuotes(req, res) {
    try {
      const { page = 1, limit = 10, emotionTag } = req.query;
      
      const filter = { isActive: true };
      if (emotionTag) filter.emotionTag = emotionTag;

      const quotes = await Quote
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Quote.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          quotes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error getting quotes:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Update content (quiz/video/quote)
  async updateContent(req, res) {
    try {
      const { type, id } = req.params;
      const updateData = req.body;

      let Model;
      switch (type) {
        case 'quiz':
          Model = Quiz;
          break;
        case 'video':
          Model = Video;
          break;
        case 'quote':
          Model = Quote;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid content type'
          });
      }

      const content = await Model.findByIdAndUpdate(id, updateData, { new: true });
      
      if (!content) {
        return res.status(404).json({
          success: false,
          message: `${type} not found`
        });
      }

      res.status(200).json({
        success: true,
        message: `${type} updated successfully`,
        data: content
      });
    } catch (error) {
      console.error('Error updating content:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Delete content (soft delete by setting isActive to false)
  async deleteContent(req, res) {
    try {
      const { type, id } = req.params;

      let Model;
      switch (type) {
        case 'quiz':
          Model = Quiz;
          break;
        case 'video':
          Model = Video;
          break;
        case 'quote':
          Model = Quote;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid content type'
          });
      }

      const content = await Model.findByIdAndUpdate(id, { isActive: false }, { new: true });
      
      if (!content) {
        return res.status(404).json({
          success: false,
          message: `${type} not found`
        });
      }

      res.status(200).json({
        success: true,
        message: `${type} deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get dashboard stats
  async getDashboardStats(req, res) {
    try {
      const [
        totalQuizzes,
        totalVideos,
        totalQuotes,
        totalUsers,
        recentEmotions
      ] = await Promise.all([
        Quiz.countDocuments({ isActive: true }),
        Video.countDocuments({ isActive: true }),
        Quote.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: true }),
        User.aggregate([
          { $match: { lastEmotion: { $exists: true } } },
          { $group: { _id: '$lastEmotion', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalQuizzes,
          totalVideos,
          totalQuotes,
          totalUsers,
          emotionDistribution: recentEmotions
        }
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();
