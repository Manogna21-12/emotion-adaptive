const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import models
const Quiz = require('./models/Quiz');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-management-db';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      socketio: io.engine.clientsCount >= 0 ? 'running' : 'stopped',
      changeStream: 'watching'
    }
  });
});

// API Routes

// GET /api/quizzes - Fetch all quizzes
app.get('/api/quizzes', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      emotionTag, 
      difficulty, 
      category,
      search 
    } = req.query;

    // Build filter
    const filter = { isActive: true };
    
    if (emotionTag) filter.emotionTag = emotionTag;
    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { question: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [quizzes, total] = await Promise.all([
      Quiz.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Quiz.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        quizzes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: skip + parseInt(limit) < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/quizzes/:id - Get single quiz
app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.status(200).json({
      success: true,
      data: quiz
    });

  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/quizzes - Create new quiz
app.post('/api/quizzes', async (req, res) => {
  try {
    const quizData = req.body;
    
    // Validate required fields
    const requiredFields = ['title', 'question', 'options', 'correctAnswer'];
    for (const field of requiredFields) {
      if (!quizData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Validate correctAnswer is in options
    if (!quizData.options.includes(quizData.correctAnswer)) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer must be one of the options'
      });
    }

    const quiz = new Quiz(quizData);
    await quiz.save();

    console.log('✅ New quiz created:', quiz.title);
    
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
});

// PUT /api/quizzes/:id - Update quiz
app.put('/api/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const quiz = await Quiz.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    console.log('✅ Quiz updated:', quiz.title);
    
    res.status(200).json({
      success: true,
      message: 'Quiz updated successfully',
      data: quiz
    });

  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /api/quizzes/:id - Delete quiz (soft delete)
app.delete('/api/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const quiz = await Quiz.findByIdAndUpdate(
      id, 
      { isActive: false }, 
      { new: true }
    );
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    console.log('✅ Quiz deleted:', quiz.title);
    
    res.status(200).json({
      success: false,
      message: 'Quiz deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/quizzes/stats - Get quiz statistics
app.get('/api/quizzes/stats', async (req, res) => {
  try {
    const stats = await Quiz.getStatistics();
    
    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalQuizzes: 0,
        easyQuizzes: 0,
        mediumQuizzes: 0,
        hardQuizzes: 0,
        totalAttempts: 0,
        totalCorrect: 0
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  // Send welcome message
  socket.emit('welcome', {
    message: 'Connected to Quiz Management System',
    socketId: socket.id,
    timestamp: new Date()
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Database connection and Change Stream setup
async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // Setup Change Stream
    setupChangeStream();
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// MongoDB Change Stream setup
function setupChangeStream() {
  console.log('👀 Setting up MongoDB Change Stream...');
  
  const changeStream = Quiz.watch([
    {
      $match: {
        operationType: 'insert',
        'fullDocument.isActive': true
      }
    }
  ]);

  changeStream.on('change', (change) => {
    handleQuizChange(change);
  });

  changeStream.on('error', (error) => {
    console.error('❌ Change Stream Error:', error);
    setTimeout(setupChangeStream, 5000); // Restart after 5 seconds
  });

  changeStream.on('close', () => {
    console.log('🔌 Change Stream closed');
    setTimeout(setupChangeStream, 5000); // Restart after 5 seconds
  });

  console.log('✅ MongoDB Change Stream watcher started');
}

// Handle quiz changes from Change Stream
function handleQuizChange(change) {
  try {
    const fullDocument = change.fullDocument;
    
    if (!fullDocument) {
      console.log('⚠️ Change event without full document');
      return;
    }

    console.log(`📝 New Quiz Detected: "${fullDocument.title}"`);
    
    // Emit to all connected clients
    io.emit('newQuiz', {
      quiz: fullDocument,
      timestamp: new Date(),
      changeId: change._id
    });

    console.log('📡 Real-time update sent to all clients');
    
  } catch (error) {
    console.error('❌ Error handling quiz change:', error);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    // Connect to database first
    await connectDatabase();
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Quiz Management Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📊 MongoDB: ${MONGODB_URI}`);
      console.log(`🔌 Socket.IO: Enabled`);
      console.log(`📡 Change Stream: Enabled`);
      console.log('\n🎯 API Endpoints:');
      console.log(`   GET  /health - Health check`);
      console.log(`   GET  /api/quizzes - Get all quizzes`);
      console.log(`   GET  /api/quizzes/:id - Get single quiz`);
      console.log(`   POST /api/quizzes - Create new quiz`);
      console.log(`   PUT  /api/quizzes/:id - Update quiz`);
      console.log(`   DELETE /api/quizzes/:id - Delete quiz`);
      console.log(`   GET  /api/quizzes/stats - Get statistics`);
      console.log('\n🔌 Socket.IO Events:');
      console.log(`   newQuiz - Emitted when new quiz is created`);
      console.log(`   welcome - Sent on connection`);
      console.log('\n📡 MongoDB Change Stream: Watching quizzes collection');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server, io };
