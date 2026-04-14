# Emotion-Adaptive Learning Platform - Backend

This backend application is developed using Node.js, Express, and MongoDB (Mongoose) for an AI-based Emotion-Adaptive Learning Platform.

## Features
- Dashboard API for user statistics, recent emotion logs, and calculated metrics.
- Emotion logging with automatic focus score average adjustment.
- Video recommendation based on emotion tags.
- Clean MVC Architecture
- Global Error Handling Middleware
- Cross-Origin Resource Sharing (CORS) setup
- Request validation using `express-validator`

## Implemented APIs
1. **Dashboard API**: `GET /api/dashboard/:userId`
2. **Emotion Logging API**: `POST /api/log-emotion`
3. **Video Recommendation API**: `POST /api/get-video`

## Setup & Run Instructions

### 1. Prerequisites
- Node.js installed (v16+ recommended).
- MongoDB installed locally OR a MongoDB Atlas instance.

### 2. Installation
Navigate to this project folder in the terminal and install dependencies:
```bash
npm install
```

### 3. Configure Environment Variables
By default, the `.env` file exposes port 5000 and points to `mongodb://localhost:27017/emotion_adaptive`. 
*Important*: Edit `.env` to replace `MONGODB_URI` with your own MongoDB Atlas connection string to connect to the cloud.

### 4. Start the Application
**To run normally:**
```bash
npm start
```

**To run in development mode (with hot-reload):**
```bash
npm run dev
```

Your server will be running on `http://localhost:5000`.
