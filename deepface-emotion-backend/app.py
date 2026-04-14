"""
DeepFace Emotion Detection API
Production-ready backend for emotion detection using DeepFace
Optimized for Render deployment with low memory usage
"""

import os
import sys
import logging
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import cv2
import numpy as np
from deepface import DeepFace

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'temp')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

# CORS configuration for frontend integration
CORS(app, 
     origins=os.getenv('CORS_ORIGINS', '*').split(','),
     methods=['GET', 'POST', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)

# Global variables for DeepFace model optimization
_deepface_model = None
_model_loaded = False

def allowed_file(filename):
    """Check if the uploaded file has an allowed extension"""
    allowed_extensions = set(os.getenv('ALLOWED_EXTENSIONS', 'jpg,jpeg,png,gif,webp').split(','))
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def get_deepface_model():
    """
    Lazy loading of DeepFace model to optimize memory usage
    Only loads model when first request comes in
    """
    global _deepface_model, _model_loaded
    
    if not _model_loaded:
        try:
            logger.info("Loading DeepFace model for emotion detection...")
            # Pre-load the model with emotion action only to reduce memory usage
            _deepface_model = DeepFace.build_model(os.getenv('DEEPFACE_BACKEND', 'tensorflow'))
            _model_loaded = True
            logger.info("DeepFace model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load DeepFace model: {str(e)}")
            raise e
    
    return _deepface_model

def cleanup_temp_file(file_path):
    """Clean up temporary files to save disk space"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.debug(f"Cleaned up temporary file: {file_path}")
    except Exception as e:
        logger.warning(f"Failed to cleanup file {file_path}: {str(e)}")

def analyze_emotion(image_path):
    """
    Analyze emotion from image using DeepFace
    Optimized for low memory usage
    """
    try:
        # Use DeepFace.analyze with only emotion action
        result = DeepFace.analyze(
            img_path=image_path,
            actions=['emotion'],  # Only emotion analysis to save memory
            enforce_detection=os.getenv('DEEPFACE_ENFORCE_DETECTION', 'False').lower() == 'true',
            detector_backend='opencv',
            align=True,
            expand_percentage=10
        )
        
        # Extract emotion data
        if isinstance(result, list) and len(result) > 0:
            emotion_data = result[0]
        else:
            emotion_data = result
            
        # Get dominant emotion
        emotions = emotion_data['emotion']
        dominant_emotion = max(emotions, key=emotions.get)
        confidence = emotions[dominant_emotion]
        
        # Format response
        response = {
            'success': True,
            'emotion': dominant_emotion,
            'confidence': round(confidence, 4),
            'all_emotions': {k: round(v, 4) for k, v in emotions.items()},
            'timestamp': datetime.utcnow().isoformat(),
            'model_info': {
                'backend': os.getenv('DEEPFACE_BACKEND', 'tensorflow'),
                'actions': ['emotion']
            }
        }
        
        logger.info(f"Emotion detected: {dominant_emotion} with confidence {confidence:.2f}")
        return response
        
    except Exception as e:
        logger.error(f"Emotion analysis failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

@app.route('/', methods=['GET'])
def health_check():
    """
    Health check endpoint
    Returns API status and basic information
    """
    try:
        return jsonify({
            'status': 'running',
            'message': 'DeepFace Emotion Detection API',
            'version': '1.0.0',
            'timestamp': datetime.utcnow().isoformat(),
            'endpoints': {
                'health': '/',
                'analyze': '/analyze (POST)',
                'info': '/info'
            },
            'model_loaded': _model_loaded,
            'environment': os.getenv('FLASK_ENV', 'development')
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/info', methods=['GET'])
def api_info():
    """
    API information endpoint
    Returns detailed API configuration and capabilities
    """
    try:
        return jsonify({
            'api_name': 'DeepFace Emotion Detection API',
            'version': '1.0.0',
            'description': 'Production-ready emotion detection using DeepFace',
            'supported_formats': os.getenv('ALLOWED_EXTENSIONS', 'jpg,jpeg,png,gif,webp').split(','),
            'max_file_size': f"{app.config['MAX_CONTENT_LENGTH'] // (1024*1024)}MB",
            'model_backend': os.getenv('DEEPFACE_BACKEND', 'tensorflow'),
            'actions_supported': ['emotion'],
            'cors_enabled': True,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"API info failed: {str(e)}")
        return jsonify({
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/analyze', methods=['POST'])
def analyze_image():
    """
    Main emotion analysis endpoint
    Accepts image file and returns emotion analysis
    """
    try:
        # Check if file was uploaded
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        file = request.files['image']
        
        # Check if file is empty
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        # Check file extension
        if not allowed_file(file.filename):
            allowed_extensions = os.getenv('ALLOWED_EXTENSIONS', 'jpg,jpeg,png,gif,webp').split(',')
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed types: {", ".join(allowed_extensions)}',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        # Create temporary file
        temp_dir = tempfile.gettempdir()
        unique_filename = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
        temp_path = os.path.join(temp_dir, unique_filename)
        
        try:
            # Save uploaded file
            file.save(temp_path)
            logger.info(f"Image saved temporarily: {temp_path}")
            
            # Ensure DeepFace model is loaded
            get_deepface_model()
            
            # Analyze emotion
            result = analyze_emotion(temp_path)
            
            # Add file information to response
            if result.get('success'):
                result['file_info'] = {
                    'original_filename': file.filename,
                    'file_size': os.path.getsize(temp_path),
                    'content_type': file.content_type or 'unknown'
                }
            
            return jsonify(result)
            
        finally:
            # Clean up temporary file
            cleanup_temp_file(temp_path)
            
    except Exception as e:
        logger.error(f"Analysis endpoint error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error during analysis',
            'details': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/test', methods=['GET'])
def test_endpoint():
    """
    Test endpoint for debugging
    Returns system information
    """
    try:
        import platform
        import cv2
        
        return jsonify({
            'success': True,
            'system_info': {
                'python_version': sys.version,
                'platform': platform.platform(),
                'opencv_version': cv2.__version__,
                'deepface_available': True
            },
            'environment': {
                'flask_env': os.getenv('FLASK_ENV', 'development'),
                'port': os.getenv('PORT', '8000'),
                'deepface_backend': os.getenv('DEEPFACE_BACKEND', 'tensorflow')
            },
            'memory_usage': {
                'model_loaded': _model_loaded,
                'temp_dir': tempfile.gettempdir()
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Test endpoint error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

# Error handlers
@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({
        'success': False,
        'error': 'File too large',
        'max_size': f"{app.config['MAX_CONTENT_LENGTH'] // (1024*1024)}MB",
        'timestamp': datetime.utcnow().isoformat()
    }), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'available_endpoints': ['/', '/analyze', '/info', '/test'],
        'timestamp': datetime.utcnow().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'timestamp': datetime.utcnow().isoformat()
    }), 500

# Create temp directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Pre-load model in production (optional - comment out for faster cold starts)
# if os.getenv('FLASK_ENV') == 'production':
#     get_deepface_model()

if __name__ == '__main__':
    # Development server
    port = int(os.getenv('PORT', 8000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting DeepFace Emotion API on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
