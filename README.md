# 🧠 Emotion-Adaptive Learning System

A real-time, emotion-based adaptive learning platform that automatically triggers personalized content based on student emotions.

## 🎯 Features

### **Real-Time Emotion Detection**
- **MongoDB Change Streams**: Automatically detects emotion changes
- **Socket.IO Integration**: Instant frontend updates without page refresh
- **Smart Debouncing**: Prevents emotion spam with 30-second cooldown

### **Intelligent Recommendations**
- **😊 Happy**: Challenging quizzes
- **😢 Sad**: Motivational quotes + gentle activities
- **🤔 Confused**: Clarification videos + easy quizzes
- **😠 Angry**: Break suggestions + calming activities

### **Production-Ready Backend**
- **Express.js**: RESTful API with comprehensive error handling
- **MongoDB**: Optimized schemas with indexing
- **Socket.IO**: Real-time bidirectional communication
- **JWT Authentication**: Secure user management
- **Rate Limiting**: Protection against abuse

### **Modern Frontend**
- **React 18**: Modern hooks and patterns
- **Real-Time Popups**: Smooth animated modals
- **Responsive Design**: Mobile-first approach
- **Debounced Logging**: Smart user interaction

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend     │    │   Backend       │    │   MongoDB       │
│   (React)      │◄──►│   (Express)    │◄──►│   (Database)    │
│                │    │                │    │                │
│ • Socket.IO     │    │ • Socket.IO     │    │ • Change Streams│
│ • Popups       │    │ • API Routes    │    │ • Emotions Log │
│ • Debouncing   │    │ • Real-time     │    │ • Quizzes       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js 16+
- MongoDB 4.4+
- npm or yarn

### **1. Clone & Setup**
```bash
git clone <repository-url>
cd emotion-adaptive-main
```

### **2. Backend Setup**
```bash
cd emotion-adaptive-backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev
```

### **3. Frontend Setup**
```bash
cd emotion-adaptive-frontend
npm install
cp .env.example .env
npm start
```

### **4. Access Applications**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health

## 📊 Database Schema

### **emotions_log**
```javascript
{
  userId: ObjectId,
  emotion: "sad" | "confused" | "happy" | "angry",
  createdAt: Date
}
```

### **quizzes**
```javascript
{
  title: String,
  description: String,
  difficulty: "easy" | "medium" | "hard",
  emotionTag: "sad" | "confused" | "happy" | "angry",
  question: String,
  options: [String],
  correctAnswer: String,
  isActive: Boolean
}
```

### **videos**
```javascript
{
  title: String,
  url: String,
  emotionTag: String,
  topic: String,
  duration: Number,
  isActive: Boolean
}
```

### **quotes**
```javascript
{
  text: String,
  emotionTag: String,
  author: String,
  isActive: Boolean
}
```

## 🎯 Real-Time Flow

### **1. Emotion Change Detection**
```
User logs emotion → MongoDB insert → Change Stream triggers → Socket.IO emits → Frontend receives
```

### **2. Recommendation Logic**
```
Latest emotion → API recommendation → Personalized content → Popup display
```

### **3. Smart Behaviors**
```
Debounce (30s) → Prevent spam → Cache latest → Optimize performance
```

## 🔌 API Endpoints

### **Recommendation API**
- `GET /api/recommendation/:userId` - Get personalized recommendation
- `POST /api/emotion` - Log new emotion
- `GET /api/emotion-history/:userId` - Get emotion history

### **Admin API**
- `GET /api/admin/quizzes` - List all quizzes
- `POST /api/admin/quizzes` - Create new quiz
- `GET /api/admin/videos` - List all videos
- `POST /api/admin/videos` - Create new video
- `GET /api/admin/quotes` - List all quotes
- `POST /api/admin/quotes` - Create new quote
- `GET /api/admin/dashboard/stats` - Dashboard statistics

## 🔌 Socket.IO Events

### **Client → Server**
- `authenticate` - User authentication
- `log_emotion` - Log emotion from frontend
- `get_recommendation` - Request recommendation

### **Server → Client**
- `emotion_changed` - Real-time emotion change
- `recommendation` - Recommendation data
- `authenticated` - Authentication success
- `emotion_update` - Admin updates

## 🎨 Frontend Components

### **EmotionLogger**
- Interactive emotion selection
- 30-second debouncing
- Visual feedback
- Mobile responsive

### **EmotionPopup**
- Dynamic content based on emotion
- Smooth animations
- Quiz, video, quote display
- Break suggestions

## 🛠️ Development

### **Environment Variables**
```bash
# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/emotion-adaptive-db
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key

# Frontend (.env)
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### **Running Tests**
```bash
# Backend
cd emotion-adaptive-backend
npm test

# Frontend
cd emotion-adaptive-frontend
npm test
```

## 🚀 Production Deployment

### **Backend**
```bash
cd emotion-adaptive-backend
npm install --production
NODE_ENV=production npm start
```

### **Frontend**
```bash
cd emotion-adaptive-frontend
npm run build
# Deploy build/ folder to your web server
```

### **Environment Setup**
- Use MongoDB Atlas for production database
- Set proper CORS origins
- Use HTTPS for Socket.IO
- Configure proper JWT secrets

## 📈 Performance Features

### **Backend Optimizations**
- MongoDB indexing on userId and emotion fields
- Connection pooling
- Rate limiting
- Efficient Change Stream queries
- Memory-efficient socket handling

### **Frontend Optimizations**
- Debounced emotion logging
- Cached recommendations
- Optimized re-renders
- Smooth animations
- Responsive design

## 🔒 Security Features

- JWT authentication
- Rate limiting
- CORS protection
- Input validation
- Helmet.js security headers
- SQL injection prevention (MongoDB)

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-friendly interactions
- Optimized animations
- Mobile-first approach

## 🎯 Use Cases

### **Educational Institutions**
- Adaptive learning platforms
- Student support systems
- Personalized education

### **Corporate Training**
- Employee wellness monitoring
- Adaptive training content
- Performance optimization

### **Mental Health Apps**
- Emotion tracking
- Personalized interventions
- Real-time support

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create GitHub issue
- Check documentation
- Review examples

---

**🚀 This system provides real-time, emotion-adaptive learning that responds instantly to student emotional states without page refreshes!**
