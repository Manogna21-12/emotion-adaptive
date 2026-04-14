const express = require('express');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { logEmotion } = require('../controllers/emotionController');

const router = express.Router();

// POST /api/log-emotion
router.post(
  '/log-emotion',
  [
    body('userId', 'Valid User ID is required').isMongoId(),
    body('emotion', 'Emotion string is required').notEmpty().isString(),
    body('focus', 'Focus score must be a number between 0 and 100')
      .isNumeric()
      .isFloat({ min: 0, max: 100 })
  ],
  validate,
  logEmotion
);

module.exports = router;
