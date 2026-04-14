const express = require('express');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { getRecommededVideo, getVideos, getRecommendations } = require('../controllers/videoController');

const router = express.Router();

// POST /api/get-video
router.post(
  '/get-video',
  [
    body('emotion', 'Emotion is required').notEmpty().isString()
  ],
  validate,
  getRecommededVideo
);

// GET /api/videos
router.get('/videos', getVideos);

// GET /api/videos/recommend/:userId
router.get('/videos/recommend/:userId', getRecommendations);

module.exports = router;
