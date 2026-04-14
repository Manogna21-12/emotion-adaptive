import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Settings, Info } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import EmotionResult from './components/EmotionResult';
import EmotionAdaptiveUI from './components/EmotionAdaptiveUI';
import emotionApi from './services/emotionApi';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');

  // Check API health on mount
  React.useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const result = await emotionApi.checkHealth();
        if (result.success) {
          setApiStatus('healthy');
        } else {
          setApiStatus('unhealthy');
        }
      } catch (error) {
        setApiStatus('unhealthy');
      }
    };

    checkApiHealth();
  }, []);

  // Handle image selection
  const handleImageSelect = (imageData) => {
    setSelectedImage(imageData);
    setAnalysisResult(null);
    setError(null);
  };

  // Clear image
  const handleClearImage = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setError(null);
  };

  // Analyze emotion
  const handleAnalyzeEmotion = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await emotionApi.analyzeEmotion(selectedImage.file);
      
      if (result.success) {
        setAnalysisResult(result.data);
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Get emotion and confidence for adaptive UI
  const getEmotionData = () => {
    if (analysisResult && analysisResult.success) {
      return {
        emotion: analysisResult.emotion,
        confidence: analysisResult.confidence
      };
    }
    return null;
  };

  const emotionData = getEmotionData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Emotion Detection AI
                </h1>
                <p className="text-sm text-gray-600">
                  Powered by DeepFace Technology
                </p>
              </div>
            </div>
            
            {/* API Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  apiStatus === 'healthy' ? 'bg-green-500' : 
                  apiStatus === 'unhealthy' ? 'bg-red-500' : 
                  'bg-yellow-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  API {apiStatus === 'healthy' ? 'Connected' : 
                        apiStatus === 'unhealthy' ? 'Disconnected' : 
                        'Checking...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Upload and Analysis */}
          <div className="space-y-6">
            {/* Upload Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Upload Your Image
                  </h2>
                </div>
                
                <ImageUpload
                  onImageSelect={handleImageSelect}
                  selectedImage={selectedImage}
                  onClearImage={handleClearImage}
                />

                {/* Analyze Button */}
                {selectedImage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                  >
                    <button
                      onClick={handleAnalyzeEmotion}
                      disabled={isLoading}
                      className="w-full btn-primary flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="loading-spinner w-4 h-4"></div>
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4" />
                          <span>Analyze Emotion</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Result Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <EmotionResult
                result={analysisResult}
                isLoading={isLoading}
                error={error}
              />
            </motion.div>
          </div>

          {/* Right Column - Adaptive UI */}
          <div className="space-y-6">
            {emotionData ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <EmotionAdaptiveUI
                  emotion={emotionData.emotion}
                  confidence={emotionData.confidence}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white/80 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-gray-200 text-center"
              >
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Info className="w-8 h-8 text-gray-600" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Ready for Personalized Content
                    </h3>
                    <p className="text-gray-600">
                      Upload an image and analyze your emotion to get personalized recommendations
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">😊 Happy</h4>
                      <p className="text-sm text-blue-700">Get challenging quizzes and brain teasers</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">😢 Sad</h4>
                      <p className="text-sm text-blue-700">Receive motivational quotes and support</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">😠 Angry</h4>
                      <p className="text-sm text-blue-700">Access calming videos and techniques</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">😐 Neutral</h4>
                      <p className="text-sm text-blue-700">Discover learning opportunities</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-gray-200"
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Features
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Real-time Analysis</h4>
                      <p className="text-sm text-gray-600">Get instant emotion detection using advanced AI</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Personalized Content</h4>
                      <p className="text-sm text-gray-600">Receive tailored recommendations based on your mood</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Camera Support</h4>
                      <p className="text-sm text-gray-600">Capture photos directly from your webcam</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Drag & Drop</h4>
                      <p className="text-sm text-gray-600">Easy file upload with drag and drop interface</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>Built with ❤️ using DeepFace AI Technology</p>
            <p className="mt-1">© 2024 Emotion Detection AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
