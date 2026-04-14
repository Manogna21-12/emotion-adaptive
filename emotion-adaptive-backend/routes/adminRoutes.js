const express = require('express');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

const router = express.Router();

// Quiz routes
router.post('/quizzes', auth.required, adminController.createQuiz);
router.get('/quizzes', auth.required, adminController.getQuizzes);
router.put('/quizzes/:id', auth.required, adminController.updateContent.bind(null, 'quiz'));
router.delete('/quizzes/:id', auth.required, adminController.deleteContent.bind(null, 'quiz'));

// Video routes
router.post('/videos', auth.required, adminController.createVideo);
router.get('/videos', auth.required, adminController.getVideos);
router.put('/videos/:id', auth.required, adminController.updateContent.bind(null, 'video'));
router.delete('/videos/:id', auth.required, adminController.deleteContent.bind(null, 'video'));

// Quote routes
router.post('/quotes', auth.required, adminController.createQuote);
router.get('/quotes', auth.required, adminController.getQuotes);
router.put('/quotes/:id', auth.required, adminController.updateContent.bind(null, 'quote'));
router.delete('/quotes/:id', auth.required, adminController.deleteContent.bind(null, 'quote'));

// Dashboard stats
router.get('/dashboard/stats', auth.required, adminController.getDashboardStats);

module.exports = router;
