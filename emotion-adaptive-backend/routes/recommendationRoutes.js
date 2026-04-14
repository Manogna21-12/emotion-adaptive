const express = require('express');
const recommendationController = require('../controllers/recommendationController');
const auth = require('../middleware/auth');

const router = express.Router();

// Get recommendation based on user's latest emotion
router.get('/recommendation/:userId', auth.optional, recommendationController.getRecommendation);

// Log new emotion (for testing/manual logging)
router.post('/emotion', auth.optional, recommendationController.logEmotion);

// Get emotion history for a user
router.get('/emotion-history/:userId', auth.optional, recommendationController.getEmotionHistory);

module.exports = router;
