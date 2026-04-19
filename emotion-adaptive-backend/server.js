const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes and services
const recommendationRoutes = require('./routes/recommendationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const socketService = require('./services/socketService');
const changeStreamService = require('./services/changeStreamService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Environment variables - CRITICAL: PORT 8000 FOR FRONTEND COMPATIBILITY
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emotion-adaptive-db';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CRITICAL CORS FIX - Allow frontend on port 5173
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Handle pre-flight requests
app.options('*', cors());

// Request logging middleware - CRITICAL FOR DEBUGGING
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 [${timestamp}] ${req.method} ${req.url}`);
  console.log(`📋 Origin: ${req.headers.origin || 'Unknown'}`);
  console.log(`📋 User-Agent: ${req.headers['user-agent'] || 'Unknown'}`);
  next();
});

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

// Health check endpoint - ENHANCED FOR DEBUGGING
app.get('/health', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`❤️ [${timestamp}] Health check received from: ${req.headers.origin}`);
  
  res.status(200).json({
    status: 'OK',
    timestamp,
    uptime: process.uptime(),
    environment: NODE_ENV,
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      socketio: socketService.getConnectedUsersCount() >= 0 ? 'running' : 'stopped',
      changeStream: changeStreamService.getStatus().isWatching ? 'watching' : 'stopped',
      cors: 'configured'
    },
    endpoints: {
      health: 'GET /health',
      heartbeat: 'POST /streak/heartbeat',
      test: 'GET /api/test'
    }
  });
});

// CRITICAL: Heartbeat API endpoint
app.post('/streak/heartbeat', async (req, res) => {
  const timestamp = new Date().toISOString();
  const { userId } = req.body;
  
  console.log(`💓 [${timestamp}] Heartbeat received for user: ${userId}`);
  console.log(`📋 Request body:`, req.body);
  console.log(`📋 Headers:`, {
    'content-type': req.headers['content-type'],
    'origin': req.headers.origin,
    'user-agent': req.headers['user-agent']
  });
  
  try {
    if (!userId) {
      console.log(`❌ [${timestamp}] Heartbeat failed: Missing userId`);
      return res.status(400).json({
        success: false,
        message: 'userId is required',
        timestamp
      });
    }
    
    // Update user's last active timestamp
    // This would typically update in your database
    // For now, we'll just log it and return success
    
    console.log(`✅ [${timestamp}] Heartbeat successful for user: ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Heartbeat recorded successfully',
      userId,
      timestamp,
      nextHeartbeat: new Date(Date.now() + 60000).toISOString() // Suggest next heartbeat in 1 minute
    });
    
  } catch (error) {
    console.error(`❌ [${timestamp}] Heartbeat error:`, error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp,
      error: error.message
    });
  }
});

// Test API endpoint - FOR DEBUGGING
app.get('/api/test', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`🧪 [${timestamp}] Test endpoint called from: ${req.headers.origin}`);
  
  res.status(200).json({
    success: true,
    message: 'API is working correctly',
    timestamp,
    server: 'emotion-adaptive-backend',
    version: '1.0.0',
    port: PORT,
    cors: 'enabled'
  });
});

// API routes
app.use('/api', recommendationRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files in production
if (NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
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

// Database connection
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
    
    // Start change stream watcher after DB connection
    changeStreamService.startWatching();
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  try {
    await changeStreamService.stopWatching();
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
    await changeStreamService.stopWatching();
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
    
    // Initialize Socket.IO
    socketService.initialize(server);
    
    // Start HTTP server - CRITICAL: PORT 8000
    server.listen(PORT, '0.0.0.0', () => {
      const timestamp = new Date().toISOString();
      console.log(`🚀 [${timestamp}] Server running on http://localhost:8000`);
      console.log(`📡 [${timestamp}] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`❤️ [${timestamp}] Health check available at: http://localhost:8000/health`);
      console.log(`💓 [${timestamp}] Heartbeat endpoint at: http://localhost:8000/streak/heartbeat`);
      console.log(`🧪 [${timestamp}] Test endpoint at: http://localhost:8000/api/test`);
      console.log(`📊 [${timestamp}] MongoDB: ${MONGODB_URI}`);
      console.log(`🔌 [${timestamp}] Socket.IO: Enabled`);
      console.log(`📡 [${timestamp}] Change Stream: Enabled`);
      console.log('\n🎯 API Endpoints:');
      console.log(`   GET  /health - Health check`);
      console.log(`   POST /streak/heartbeat - Heartbeat endpoint`);
      console.log(`   GET  /api/test - Test endpoint`);
      console.log(`   GET  /api/recommendation/:userId - Get recommendation`);
      console.log(`   POST /api/emotion - Log emotion`);
      console.log(`   GET  /api/emotion-history/:userId - Get emotion history`);
      console.log(`   GET  /api/admin/* - Admin endpoints`);
      console.log('\n🔌 Socket.IO Events:');
      console.log(`   authenticate - User authentication`);
      console.log(`   log_emotion - Log emotion from frontend`);
      console.log(`   get_recommendation - Get recommendation`);
      console.log(`   emotion_changed - Real-time emotion change`);
      console.log(`   join_admin - Join admin room`);
      console.log('\n📡 MongoDB Change Stream: Watching emotions_log collection');
      console.log('\n✨ Frontend should connect to: https://emotion-adaptive.onrender.com');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle server errors - CRITICAL FOR PORT CONFLICTS
server.on('error', (error) => {
  const timestamp = new Date().toISOString();
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ [${timestamp}] Port ${PORT} is already in use!`);
    console.error(`💡 [${timestamp}] Please stop the other process or use a different port`);
    console.error(`🔧 [${timestamp}] You can set PORT environment variable to use a different port`);
    console.error(`🔍 [${timestamp}] Try: lsof -ti:${PORT} | xargs kill -9 (on Unix/Linux)`);
    console.error(`🔍 [${timestamp}] Or: netstat -ano | findstr :${PORT} (on Windows)`);
  } else {
    console.error(`❌ [${timestamp}] Server error:`, error);
  }
  process.exit(1);
});

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

module.exports = { app, server };
