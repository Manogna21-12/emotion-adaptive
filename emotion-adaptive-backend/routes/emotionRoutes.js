const express = require('express');
const router = express.Router();
const {
  getLatestEmotion,
  getEmotionHistory,
  logEmotion,
  getAllLatestEmotions,
  getEmotionStats
} = require('../controllers/emotionController');

// GET /api/emotion/:userId - Fetch latest emotion for user
router.get('/:userId', getLatestEmotion);

// GET /api/emotion/:userId/history - Get emotion history for user
router.get('/:userId/history', getEmotionHistory);

// GET /api/emotion/stats/:userId - Get emotion statistics for user
router.get('/stats/:userId', getEmotionStats);

// POST /api/emotion - Log new emotion
router.post('/', logEmotion);

// GET /api/emotion - Get all latest emotions (for admin)
router.get('/', getAllLatestEmotions);

module.exports = router;
