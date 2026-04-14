import React from 'react';
import { motion } from 'framer-motion';
import { 
  Smile, 
  Frown, 
  Angry, 
  Meh, 
  Zap, 
  Heart, 
  Brain, 
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const EmotionResult = ({ result, isLoading, error }) => {
  // Emotion configuration
  const emotionConfig = {
    happy: {
      icon: Smile,
      color: 'text-emotion-happy',
      bgColor: 'bg-emotion-happy/10',
      borderColor: 'border-emotion-happy',
      label: 'Happy',
      description: 'You\'re feeling great!',
    },
    sad: {
      icon: Frown,
      color: 'text-emotion-sad',
      bgColor: 'bg-emotion-sad/10',
      borderColor: 'border-emotion-sad',
      label: 'Sad',
      description: 'You\'re feeling down.',
    },
    angry: {
      icon: Angry,
      color: 'text-emotion-angry',
      bgColor: 'bg-emotion-angry/10',
      borderColor: 'border-emotion-angry',
      label: 'Angry',
      description: 'You\'re feeling frustrated.',
    },
    neutral: {
      icon: Meh,
      color: 'text-emotion-neutral',
      bgColor: 'bg-emotion-neutral/10',
      borderColor: 'border-emotion-neutral',
      label: 'Neutral',
      description: 'You\'re feeling balanced.',
    },
    surprise: {
      icon: Zap,
      color: 'text-emotion-surprise',
      bgColor: 'bg-emotion-surprise/10',
      borderColor: 'border-emotion-surprise',
      label: 'Surprised',
      description: 'You\'re feeling surprised!',
    },
    fear: {
      icon: AlertCircle,
      color: 'text-emotion-fear',
      bgColor: 'bg-emotion-fear/10',
      borderColor: 'border-emotion-fear',
      label: 'Fearful',
      description: 'You\'re feeling anxious.',
    },
    disgust: {
      icon: AlertCircle,
      color: 'text-emotion-disgust',
      bgColor: 'bg-emotion-disgust/10',
      borderColor: 'border-emotion-disgust',
      label: 'Disgusted',
      description: 'You\'re feeling disgusted.',
    },
  };

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="emotion-card bg-white"
      >
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="loading-spinner w-12 h-12"></div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">
              Analyzing Your Emotion...
            </h3>
            <p className="text-gray-600">
              Our AI is detecting your emotional state
            </p>
          </div>
          
          {/* Loading animation bars */}
          <div className="flex space-x-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-8 bg-gradient-to-t from-blue-600 to-purple-600 rounded-full"
                animate={{
                  height: ['32px', '16px', '32px'],
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="emotion-card bg-white border-red-200"
      >
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-red-800">
              Analysis Failed
            </h3>
            <p className="text-red-600">
              {error}
            </p>
            <p className="text-sm text-gray-500">
              Please try again with a different image
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Success state
  if (result && result.success) {
    const emotion = result.data.emotion.toLowerCase();
    const config = emotionConfig[emotion] || emotionConfig.neutral;
    const Icon = config.icon;
    const confidence = result.data.confidence;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`emotion-card ${config.bgColor} ${config.borderColor} border-2`}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className={`p-4 rounded-full ${config.bgColor}`}>
                <Icon className={`w-12 h-12 ${config.color}`} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">
              {config.label}
            </h3>
            <p className="text-gray-600">
              {config.description}
            </p>
          </div>

          {/* Confidence Score */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Confidence
              </span>
              <span className="text-sm font-bold text-gray-900">
                {(confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className={`h-full ${config.color.replace('text-', 'bg-')}`}
                initial={{ width: 0 }}
                animate={{ width: `${confidence * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* All Emotions Breakdown */}
          {result.data.all_emotions && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">
                All Emotions Detected
              </h4>
              <div className="space-y-2">
                {Object.entries(result.data.all_emotions)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([emotionName, value]) => {
                    const emotionData = emotionConfig[emotionName.toLowerCase()] || emotionConfig.neutral;
                    const EmotionIcon = emotionData.icon;
                    
                    return (
                      <div key={emotionName} className="flex items-center space-x-3">
                        <EmotionIcon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {emotionName}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${emotionData.color.replace('text-', 'bg-')}`}
                            style={{ width: `${value * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-12 text-right">
                          {(value * 100).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Success Indicator */}
          <div className="flex items-center justify-center space-x-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              Analysis completed successfully
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Empty state
  return null;
};

export default EmotionResult;
