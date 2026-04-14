# 🧠 DeepFace Emotion Detection API

Production-ready emotion detection backend using DeepFace, optimized for Render deployment with low memory usage.

## 🚀 **Quick Start**

### **Local Development**
```bash
# Clone and setup
git clone <repository-url>
cd deepface-emotion-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run development server
python app.py
```

### **Render Deployment**
1. **Push to GitHub**
2. **Create Render Web Service**
3. **Connect Repository**
4. **Auto-deploy** 🎉

## 📋 **API Endpoints**

### **Health Check**
```http
GET /
```
**Response:**
```json
{
  "status": "running",
  "message": "DeepFace Emotion Detection API",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "endpoints": {
    "health": "/",
    "analyze": "/analyze (POST)",
    "info": "/info"
  },
  "model_loaded": false,
  "environment": "production"
}
```

### **Emotion Analysis**
```http
POST /analyze
Content-Type: multipart/form-data
```

**Request Body:**
- `image` (file): Image file to analyze

**Response:**
```json
{
  "success": true,
  "emotion": "happy",
  "confidence": 0.8542,
  "all_emotions": {
    "happy": 0.8542,
    "neutral": 0.1234,
    "sad": 0.0123,
    "angry": 0.0067,
    "surprise": 0.0021,
    "fear": 0.0013
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "model_info": {
    "backend": "tensorflow",
    "actions": ["emotion"]
  },
  "file_info": {
    "original_filename": "photo.jpg",
    "file_size": 1024000,
    "content_type": "image/jpeg"
  }
}
```

### **API Information**
```http
GET /info
```

### **System Test**
```http
GET /test
```

## 🧪 **Testing Examples**

### **Postman Collection**
```json
{
  "info": {
    "name": "DeepFace Emotion API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/"
      }
    },
    {
      "name": "Analyze Emotion",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/analyze",
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "image",
              "type": "file",
              "src": "/path/to/your/image.jpg"
            }
          ]
        }
      }
    }
  ]
}
```

### **JavaScript/Frontend Example**
```javascript
// Function to analyze emotion from image file
async function analyzeEmotion(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  try {
    const response = await fetch('https://your-app.onrender.com/analyze', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type header for FormData
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Emotion:', result.emotion);
      console.log('Confidence:', result.confidence);
      console.log('All emotions:', result.all_emotions);
    } else {
      console.error('Analysis failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

// Usage example with file input
document.getElementById('imageInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      const result = await analyzeEmotion(file);
      // Handle result
    } catch (error) {
      // Handle error
    }
  }
});
```

### **React Hook Example**
```javascript
import { useState } from 'react';

const useEmotionAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const analyzeEmotion = async (imageFile) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('https://your-app.onrender.com/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { analyzeEmotion, loading, error, result };
};

// Usage in component
const EmotionDetector = () => {
  const { analyzeEmotion, loading, error, result } = useEmotionAnalysis();

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      analyzeEmotion(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleImageUpload} accept="image/*" />
      {loading && <p>Analyzing...</p>}
      {error && <p>Error: {error}</p>}
      {result && (
        <div>
          <p>Emotion: {result.emotion}</p>
          <p>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
};
```

### **Python Test Script**
```python
import requests
import json

# Test the API
def test_emotion_api(image_path, api_url="http://localhost:8000"):
    """Test emotion analysis API"""
    
    # Health check
    health_response = requests.get(f"{api_url}/")
    print("Health Check:", health_response.json())
    
    # Analyze emotion
    with open(image_path, 'rb') as image_file:
        files = {'image': image_file}
        response = requests.post(f"{api_url}/analyze", files=files)
    
    result = response.json()
    print("Analysis Result:", json.dumps(result, indent=2))
    
    return result

# Usage
if __name__ == "__main__":
    test_emotion_api("path/to/your/image.jpg")
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False

# Render Configuration
PORT=8000

# DeepFace Configuration
DEEPFACE_BACKEND=tensorflow
DEEPFACE_ENFORCE_DETECTION=False

# Performance Settings
MAX_CONTENT_LENGTH=16777216  # 16MB max file size
UPLOAD_FOLDER=temp
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp

# CORS Settings
CORS_ORIGINS=*

# Logging
LOG_LEVEL=INFO
```

### **Supported Image Formats**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### **Emotions Detected**
- Happy
- Sad
- Angry
- Fear
- Surprise
- Neutral
- Disgust

## 🚀 **Deployment on Render**

### **Automatic Deployment**
1. **Push to GitHub**
2. **Create Render Web Service**
3. **Connect Repository**
4. **Select Python 3.10.13**
5. **Build Command**: `pip install -r requirements.txt`
6. **Start Command**: `gunicorn app:app`

### **Manual Configuration**
```yaml
# render.yaml (optional)
services:
  - type: web
    name: deepface-emotion-api
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
    healthCheckPath: /
```

### **Environment Variables on Render**
- `FLASK_ENV=production`
- `DEEPFACE_BACKEND=tensorflow`
- `PORT=8000` (automatically set by Render)

## 📊 **Performance Optimization**

### **Memory Usage**
- **Lazy Loading**: Model loads only on first request
- **Minimal Actions**: Only emotion analysis (no age, gender, etc.)
- **Headless OpenCV**: `opencv-python-headless` instead of `opencv-python`
- **Automatic Cleanup**: Temporary files removed immediately

### **Render Free Tier Optimization**
- **Cold Start**: ~30-45 seconds (model loading)
- **Memory Usage**: ~512MB after model load
- **Request Time**: ~2-5 seconds per analysis
- **Concurrent Requests**: Limited by Render free tier

### **Scaling Tips**
- **Paid Tier**: More memory and faster cold starts
- **Redis Cache**: Cache frequent results
- **CDN**: Serve static assets via CDN
- **Load Balancer**: Multiple instances for high traffic

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. Model Loading Error**
```
Error: Failed to load DeepFace model
```
**Solution:**
- Check TensorFlow version compatibility
- Ensure sufficient memory
- Verify `DEEPFACE_BACKEND` setting

#### **2. File Upload Error**
```
Error: Invalid file type
```
**Solution:**
- Check file extension in `ALLOWED_EXTENSIONS`
- Verify file size under `MAX_CONTENT_LENGTH`
- Ensure proper multipart form data

#### **3. CORS Error**
```
Error: Access blocked by CORS policy
```
**Solution:**
- Check `CORS_ORIGINS` environment variable
- Verify frontend URL is allowed
- Ensure proper pre-flight handling

#### **4. Memory Issues**
```
Error: Container killed due to memory limit
```
**Solution:**
- Use lazy loading (already implemented)
- Reduce model complexity
- Upgrade to paid Render plan

### **Debug Mode**
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python app.py
```

### **Health Monitoring**
```bash
# Check API health
curl https://your-app.onrender.com/

# Check system info
curl https://your-app.onrender.com/test
```

## 📝 **Development Notes**

### **Code Structure**
- `app.py`: Main Flask application
- `requirements.txt`: Python dependencies
- `runtime.txt`: Python version specification
- `render.yaml`: Render deployment configuration
- `.env.example`: Environment variables template

### **Best Practices**
- **Error Handling**: Comprehensive error responses
- **Logging**: Structured logging with levels
- **Security**: File validation and cleanup
- **Performance**: Lazy loading and memory optimization
- **Monitoring**: Health checks and system info

### **Dependencies Explained**
- `flask`: Web framework
- `gunicorn`: Production WSGI server
- `flask-cors`: CORS support
- `deepface`: Emotion detection
- `tensorflow`: ML backend
- `opencv-python-headless`: Image processing (headless)
- `numpy`: Numerical operations
- `pandas`: Data handling

---

## 🎉 **Ready for Production**

This API is production-ready and optimized for Render deployment:

✅ **Memory Optimized** - Lazy loading and minimal dependencies  
✅ **Error Handling** - Comprehensive error responses  
✅ **CORS Enabled** - Frontend integration ready  
✅ **Health Checks** - Monitoring endpoints  
✅ **Documentation** - Complete API documentation  
✅ **Testing** - Example code and test scripts  
✅ **Deployment** - Render configuration included  

**Deploy to Render in minutes!** 🚀
