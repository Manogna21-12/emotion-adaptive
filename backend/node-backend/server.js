require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const dashboardRoutes = require('./routes/dashboardRoutes');
const emotionRoutes = require('./routes/emotionRoutes');
const videoRoutes = require('./routes/videoRoutes');

// Handlers
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB();

// Register API Routes
app.use('/api', dashboardRoutes);
app.use('/api', emotionRoutes);
app.use('/api', videoRoutes);

// Error Handling Middleware (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
