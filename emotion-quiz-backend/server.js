const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
require('dotenv').config();

// ── Import models ────────────────────────────────────────────────────────────
const Quiz      = require('./models/Quiz');
const EmotionLog = require('./models/EmotionLog');
const Video     = require('./models/Video');
const Quote     = require('./models/Quote');

// ── App & Server ─────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── Env ───────────────────────────────────────────────────────────────────────
const PORT        = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emotion-quiz-db';
const NODE_ENV    = process.env.NODE_ENV || 'development';

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, _res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// ── Helper: recommendation message ───────────────────────────────────────────
const getRecommendationMessage = (emotion, type) => {
  const msgs = {
    confused: 'You seem confused. Here\'s an easy quiz + a helpful video to clear things up!',
    sad:      'Feeling down? Here\'s a motivational quote and a gentle quiz to lift your spirits!',
    happy:    'You\'re happy! Ready for a challenge? Here\'s a hard quiz to keep the momentum going!',
    angry:    'You seem frustrated. Take a short break — your well-being comes first. 🧘'
  };
  return msgs[emotion] || 'Here\'s some personalised content for you!';
};

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/quizzes
app.get('/api/quizzes', async (req, res) => {
  try {
    const { emotion, difficulty, limit = 50, page = 1 } = req.query;

    const query = { isActive: true };
    if (emotion)    query.emotionTag = emotion;
    if (difficulty) query.difficulty = difficulty;

    const skip    = (parseInt(page) - 1) * parseInt(limit);
    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    const total = await Quiz.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        quizzes: quizzes.map(q => q.getDisplayData()),
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (err) {
    console.error('❌ /api/quizzes:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// GET /api/quizzes/:id
app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    res.status(200).json({ success: true, data: quiz.getDisplayData() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// POST /api/quizzes
app.post('/api/quizzes', async (req, res) => {
  try {
    const quiz = new Quiz({ ...req.body, metadata: { source: 'api', timestamp: new Date().toISOString() } });
    await quiz.save();
    console.log(`✅ Quiz added: ${quiz.title}`);
    res.status(201).json({ success: true, message: 'Quiz added successfully', data: quiz.getDisplayData() });
  } catch (err) {
    console.error('❌ POST /api/quizzes:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMOTION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/emotion/:userId  — latest emotion for user
app.get('/api/emotion/:userId', async (req, res) => {
  try {
    const latest = await EmotionLog.getLatestEmotion(req.params.userId);
    if (!latest) {
      return res.status(404).json({ success: false, message: 'No emotion data found for this user' });
    }
    res.status(200).json({ success: true, data: latest.getDisplayData() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// POST /api/emotion  — log a new emotion
app.post('/api/emotion', async (req, res) => {
  try {
    const { userId, emotion, context, sessionId } = req.body;
    if (!userId || !emotion) {
      return res.status(400).json({ success: false, message: 'userId and emotion are required' });
    }

    const emotionLog = new EmotionLog({
      userId, emotion, context, sessionId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        source: 'api',
        timestamp: new Date().toISOString()
      }
    });

    await emotionLog.save();
    console.log(`✅ Emotion logged: ${emotion} for ${userId}`);
    res.status(201).json({ success: true, message: 'Emotion logged successfully', data: emotionLog.getDisplayData() });
  } catch (err) {
    console.error('❌ POST /api/emotion:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RECOMMENDATION ENGINE  GET /api/recommendation/:userId
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/recommendation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find latest emotion
    const latestEmotion = await EmotionLog.findOne({ userId }).sort({ createdAt: -1 }).exec();

    if (!latestEmotion) {
      return res.status(404).json({ success: false, message: 'No emotion found for this user. Log an emotion first.' });
    }

    const emotion = latestEmotion.emotion;
    let recommendation = { type: emotion, message: getRecommendationMessage(emotion), content: {} };

    switch (emotion) {
      case 'confused': {
        // 1 easy quiz + 1 video
        const quiz  = await Quiz.findOne({ emotionTag: 'confused', difficulty: 'easy', isActive: true }).sort({ createdAt: -1 });
        const videos = await Video.getByEmotion('confused', 1);
        recommendation.title   = '🤔 You seem confused — let\'s help!';
        recommendation.content = {
          quiz:  quiz  ? quiz.getDisplayData()         : null,
          video: videos.length  ? videos[0]             : null
        };
        break;
      }

      case 'sad': {
        // 1 quote + 1 easy quiz
        const quotes = await Quote.getByEmotion('sad', 1);
        const quiz   = await Quiz.findOne({ difficulty: 'easy', isActive: true }).sort({ createdAt: -1 });
        recommendation.title   = '😢 Feeling down? We\'re here for you!';
        recommendation.content = {
          quote: quotes.length ? quotes[0]            : null,
          quiz:  quiz          ? quiz.getDisplayData() : null
        };
        break;
      }

      case 'happy': {
        // 1 hard quiz
        const quiz = await Quiz.findOne({ difficulty: 'hard', isActive: true }).sort({ createdAt: -1 });
        recommendation.title   = '😊 You\'re happy — time to level up!';
        recommendation.content = {
          quiz: quiz ? quiz.getDisplayData() : null
        };
        break;
      }

      case 'angry': {
        recommendation.title   = '😠 Take a breather!';
        recommendation.content = {
          breakMessage: 'Step away from the screen for a few minutes. Breathe, stretch, and come back refreshed.',
          breakDuration: 5,
          suggestedActivities: [
            '🧘 Deep breathing exercises',
            '🚶 Short walk outside',
            '💧 Drink a glass of water',
            '🎵 Listen to calming music'
          ]
        };
        break;
      }

      default: {
        const quiz = await Quiz.findOne({ isActive: true }).sort({ createdAt: -1 });
        recommendation.title   = '📚 Here\'s something for you!';
        recommendation.content = { quiz: quiz ? quiz.getDisplayData() : null };
        break;
      }
    }

    res.status(200).json({ success: true, data: recommendation });
  } catch (err) {
    console.error('❌ GET /api/recommendation:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH  GET /api/search?q=keyword
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;

    if (!q.trim()) {
      return res.status(200).json({ success: true, data: { quizzes: [], videos: [] } });
    }

    const regex = { $regex: q.trim(), $options: 'i' };

    const [quizzes, videos] = await Promise.all([
      Quiz.find({
        isActive: true,
        $or: [{ title: regex }, { question: regex }, { category: regex }]
      })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .exec(),

      Video.find({
        isActive: true,
        $or: [{ title: regex }, { topic: regex }, { description: regex }]
      })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .exec()
    ]);

    res.status(200).json({
      success: true,
      data: {
        quizzes: quizzes.map(q => q.getDisplayData()),
        videos
      }
    });
  } catch (err) {
    console.error('❌ GET /api/search:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO ROUTES
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await Video.find({ isActive: true }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, data: { videos } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

app.post('/api/videos', async (req, res) => {
  try {
    const video = new Video(req.body);
    await video.save();
    res.status(201).json({ success: true, data: video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE ROUTES
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/quotes', async (req, res) => {
  try {
    const quotes = await Quote.find({ isActive: true }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, data: { quotes } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const quote = new Quote(req.body);
    await quote.save();
    res.status(201).json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SOCKET.IO
// ─────────────────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join a user-specific room
  socket.on('joinUserRoom', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined room`);
  });

  // Quiz answer submission via socket
  socket.on('submitQuizAnswer', async (data) => {
    try {
      const { quizId, userAnswer, userId } = data;
      const quiz = await Quiz.findById(quizId);
      if (!quiz) { socket.emit('quizError', { message: 'Quiz not found' }); return; }

      const isCorrect = quiz.checkAnswer(userAnswer);

      await Quiz.findByIdAndUpdate(quizId, {
        $inc: { attempts: 1, correctAttempts: isCorrect ? 1 : 0 }
      });

      socket.emit('quizResult', {
        quizId,
        isCorrect,
        correctAnswer: quiz.correctAnswer,
        explanation: quiz.explanation,
        points: isCorrect ? quiz.points : 0
      });

      console.log(`📝 Quiz answered by ${userId}: ${isCorrect ? 'Correct' : 'Wrong'}`);
    } catch (err) {
      socket.emit('quizError', { message: 'Failed to submit answer' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MONGODB CHANGE STREAMS
// ─────────────────────────────────────────────────────────────────────────────
let quizStream    = null;
let emotionStream = null;

const startChangeStreams = () => {
  console.log('👀 Starting MongoDB Change Streams...');

  // ── Quiz stream ────────────────────────────────────────────────────────────
  try {
    quizStream = Quiz.watch([{ $match: { operationType: 'insert' } }], {
      fullDocument: 'updateLookup'
    });

    quizStream.on('change', (change) => {
      if (change.operationType === 'insert') {
        const doc = change.fullDocument;
        console.log(`📝 New quiz via change stream: ${doc.title}`);

        // Emit "quizAdded" — matches what frontend listens to
        try {
          // Build display data manually since it's a raw doc, not a Mongoose instance
          const displayData = {
            _id:        doc._id,
            title:      doc.title,
            question:   doc.question,
            options:    doc.options,
            correctAnswer: doc.correctAnswer,
            difficulty: doc.difficulty,
            emotionTag: doc.emotionTag,
            category:   doc.category,
            explanation: doc.explanation,
            points:     doc.points,
            timeLimit:  doc.timeLimit,
            createdAt:  doc.createdAt
          };
          io.emit('quizAdded', displayData);
        } catch (e) {
          console.error('Change stream emit error:', e);
        }
      }
    });

    quizStream.on('error', (err) => console.error('❌ Quiz stream error:', err));
    console.log('✅ Quiz Change Stream active');
  } catch (err) {
    console.error('❌ Could not start Quiz Change Stream:', err.message);
  }

  // ── Emotion stream ─────────────────────────────────────────────────────────
  try {
    emotionStream = EmotionLog.watch([{ $match: { operationType: 'insert' } }], {
      fullDocument: 'updateLookup'
    });

    emotionStream.on('change', async (change) => {
      if (change.operationType === 'insert') {
        const doc = change.fullDocument;
        console.log(`📊 New emotion via change stream: ${doc.emotion} for ${doc.userId}`);

        const emotionData = {
          _id:       doc._id,
          userId:    doc.userId,
          emotion:   doc.emotion,
          createdAt: doc.createdAt
        };

        // Emit "emotionUpdate" — matches what frontend listens to
        io.emit('emotionUpdate', emotionData);

        // Also emit to user-specific room so frontend can filter easily
        io.to(`user_${doc.userId}`).emit('emotionUpdate', emotionData);

        // Fire recommendation to that user's room
        try {
          let content = {};

          if (doc.emotion === 'angry') {
            content = {
              breakMessage: 'Take a short break — you deserve it!',
              breakDuration: 5,
              suggestedActivities: ['🧘 Deep breathing', '🚶 Short walk', '💧 Drink water', '🎵 Calming music']
            };
          } else if (doc.emotion === 'confused') {
            const quiz   = await Quiz.findOne({ emotionTag: 'confused', difficulty: 'easy', isActive: true }).sort({ createdAt: -1 });
            const videos = await Video.getByEmotion('confused', 1);
            content = { quiz: quiz ? quiz.getDisplayData() : null, video: videos[0] || null };
          } else if (doc.emotion === 'sad') {
            const quotes = await Quote.getByEmotion('sad', 1);
            const quiz   = await Quiz.findOne({ difficulty: 'easy', isActive: true }).sort({ createdAt: -1 });
            content = { quote: quotes[0] || null, quiz: quiz ? quiz.getDisplayData() : null };
          } else if (doc.emotion === 'happy') {
            const quiz = await Quiz.findOne({ difficulty: 'hard', isActive: true }).sort({ createdAt: -1 });
            content = { quiz: quiz ? quiz.getDisplayData() : null };
          }

          const recommendation = {
            type:    doc.emotion,
            message: getRecommendationMessage(doc.emotion),
            content
          };

          io.to(`user_${doc.userId}`).emit('recommendation', { success: true, data: recommendation });
        } catch (recErr) {
          console.error('❌ Recommendation fetch in change stream:', recErr);
        }
      }
    });

    emotionStream.on('error', (err) => console.error('❌ Emotion stream error:', err));
    console.log('✅ Emotion Change Stream active');
  } catch (err) {
    console.error('❌ Could not start Emotion Change Stream:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEED default data if collections are empty
// ─────────────────────────────────────────────────────────────────────────────
const seedDefaultData = async () => {
  try {
    const videoCount = await Video.countDocuments();
    if (videoCount === 0) {
      await Video.insertMany([
        { title: 'Understanding Basic Concepts', topic: 'Learning Fundamentals', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', emotionTag: 'confused', difficulty: 'easy', description: 'A beginner-friendly video to clear up confusion' },
        { title: 'Staying Motivated Through Challenges', topic: 'Motivation', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', emotionTag: 'sad', difficulty: 'easy', description: 'Uplifting content to boost your mood' },
        { title: 'Advanced Problem Solving', topic: 'Critical Thinking', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', emotionTag: 'happy', difficulty: 'hard', description: 'Challenge yourself with complex problems' }
      ]);
      console.log('🌱 Seeded default videos');
    }

    const quoteCount = await Quote.countDocuments();
    if (quoteCount === 0) {
      await Quote.insertMany([
        { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs', emotionTag: 'sad', category: 'motivational' },
        { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius', emotionTag: 'sad', category: 'perseverance' },
        { text: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt', emotionTag: 'any', category: 'motivational' },
        { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein', emotionTag: 'confused', category: 'inspiration' },
        { text: 'Success is not final, failure is not fatal.', author: 'Winston Churchill', emotionTag: 'any', category: 'motivational' }
      ]);
      console.log('🌱 Seeded default quotes');
    }
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE CONNECTION
// ─────────────────────────────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('🔗 MongoDB connected:', MONGODB_URI);
  await seedDefaultData();
  startChangeStreams();
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`🎯 Endpoints:`);
  console.log(`   GET  /api/quizzes`);
  console.log(`   POST /api/quizzes`);
  console.log(`   GET  /api/emotion/:userId`);
  console.log(`   POST /api/emotion`);
  console.log(`   GET  /api/recommendation/:userId`);
  console.log(`   GET  /api/search?q=keyword`);
  console.log(`   GET  /api/videos  POST /api/videos`);
  console.log(`   GET  /api/quotes  POST /api/quotes`);
  console.log(`🔌 Socket events: quizAdded | emotionUpdate | recommendation | quizResult`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = () => {
  console.log('🛑 Shutting down gracefully...');
  if (quizStream)    quizStream.close().catch(() => {});
  if (emotionStream) emotionStream.close().catch(() => {});
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('✅ Closed');
      process.exit(0);
    });
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

module.exports = { app, server, io };
