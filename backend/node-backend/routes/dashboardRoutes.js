const express = require('express');
const { getDashboardData } = require('../controllers/dashboardController');

const router = express.Router();

// GET /api/dashboard/:userId
router.get('/dashboard/:userId', getDashboardData);

module.exports = router;
