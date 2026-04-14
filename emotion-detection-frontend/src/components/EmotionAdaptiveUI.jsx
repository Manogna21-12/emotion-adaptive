import React from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Brain, 
  Video, 
  BookOpen, 
  Quote, 
  Play,
  ExternalLink,
  Lightbulb,
  Target,
  Sparkles
} from 'lucide-react';

const EmotionAdaptiveUI = ({ emotion, confidence }) => {
  // Emotion-based content configuration
  const emotionContent = {
    sad: {
      icon: Heart,
      color: 'text-emotion-sad',
      bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-100',
      borderColor: 'border-emotion-sad',
      title: 'Feeling Down? Let\'s Brighten Your Day!',
      subtitle: 'Here\'s something to lift your spirits',
      content: {
        type: 'motivation',
        quote: 'Every day may not be good, but there\'s something good in every day.',
        author: 'Alice Morse Earle',
        tips: [
          'Take a deep breath and remember this feeling is temporary',
          'Reach out to a friend or loved one',
          'Listen to your favorite uplifting music',
          'Write down three things you\'re grateful for'
        ],
        resources: [
          { title: 'Meditation Guide', url: '#', icon: Brain },
          { title: 'Mood Boost Playlist', url: '#', icon: Play },
          { title: 'Gratitude Journal', url: '#', icon: BookOpen }
        ]
      }
    },
    happy: {
      icon: Sparkles,
      color: 'text-emotion-happy',
      bgColor: 'bg-gradient-to-br from-green-50 to-emerald-100',
      borderColor: 'border-emotion-happy',
      title: 'Great Energy! Let\'s Keep It Going!',
      subtitle: 'Perfect time for a challenge',
      content: {
        type: 'quiz',
        message: 'Your positive mood is perfect for learning!',
        challenges: [
          { title: 'Brain Teaser', difficulty: 'Easy', time: '5 min' },
          { title: 'Logic Puzzle', difficulty: 'Medium', time: '10 min' },
          { title: 'Creative Challenge', difficulty: 'Hard', time: '15 min' }
        ],
        benefits: [
          'Boost your problem-solving skills',
          'Enhance your focus and concentration',
          'Build mental resilience'
        ]
      }
    },
    angry: {
      icon: Video,
      color: 'text-emotion-angry',
      bgColor: 'bg-gradient-to-br from-red-50 to-orange-100',
      borderColor: 'border-emotion-angry',
      title: 'Time for a Calming Break',
      subtitle: 'Let\'s help you find your inner peace',
      content: {
        type: 'calming',
        message: 'It\'s okay to feel angry. Let\'s channel this energy constructively.',
        techniques: [
          { name: 'Box Breathing', duration: '4 minutes', description: 'Breathe in for 4, hold for 4, out for 4, hold for 4' },
          { name: 'Progressive Muscle Relaxation', duration: '10 minutes', description: 'Tense and release muscle groups' },
          { name: 'Mindful Walking', duration: '15 minutes', description: 'Focus on each step and your surroundings' }
        ],
        videos: [
          { title: '5-Minute Meditation', url: '#', thumbnail: 'meditation' },
          { title: 'Nature Sounds', url: '#', thumbnail: 'nature' },
          { title: 'Calming Music', url: '#', thumbnail: 'music' }
        ]
      }
    },
    neutral: {
      icon: Brain,
      color: 'text-emotion-neutral',
      bgColor: 'bg-gradient-to-br from-gray-50 to-slate-100',
      borderColor: 'border-emotion-neutral',
      title: 'Ready to Learn?',
      subtitle: 'Perfect state for acquiring new knowledge',
      content: {
        type: 'learning',
        message: 'Your balanced mind is ideal for learning new things!',
        topics: [
          { category: 'Science', title: 'Introduction to Quantum Physics', level: 'Beginner' },
          { category: 'Art', title: 'Digital Painting Basics', level: 'Beginner' },
          { category: 'Technology', title: 'Machine Learning Fundamentals', level: 'Intermediate' },
          { category: 'Language', title: 'Spanish for Beginners', level: 'Beginner' }
        ],
        benefits: [
          'Expand your knowledge base',
          'Develop new skills',
          'Boost your confidence'
        ]
      }
    },
    surprise: {
      icon: Lightbulb,
      color: 'text-emotion-surprise',
      bgColor: 'bg-gradient-to-br from-yellow-50 to-amber-100',
      borderColor: 'border-emotion-surprise',
      title: 'What a Surprise!',
      subtitle: 'Let\'s explore something unexpected',
      content: {
        type: 'exploration',
        message: 'Surprise moments are perfect for discovery!',
        facts: [
          'Honey never spoils - archaeologists have found 3000-year-old honey that\'s still edible!',
          'A group of flamingos is called a "flamboyance"',
          'Octopuses have three hearts and blue blood',
          'Bananas are berries, but strawberries aren\'t!'
        ],
        activities: [
          { title: 'Random Fact Generator', type: 'Interactive' },
          { title: 'Virtual Museum Tour', type: 'Educational' },
          { title: 'Wonder Quiz', type: 'Challenge' }
        ]
      }
    },
    fear: {
      icon: Target,
      color: 'text-emotion-fear',
      bgColor: 'bg-gradient-to-br from-purple-50 to-violet-100',
      borderColor: 'border-emotion-fear',
      title: 'Let\'s Build Your Confidence',
      subtitle: 'Transform fear into courage',
      content: {
        type: 'confidence',
        message: 'Facing fears helps us grow stronger.',
        strategies: [
          { name: 'Gradual Exposure', description: 'Start small and build up gradually' },
          { name: 'Positive Visualization', description: 'Imagine yourself succeeding' },
          { name: 'Power Posing', description: 'Stand confidently for 2 minutes' }
        ],
        exercises: [
          { title: 'Confidence Building', duration: '10 min' },
          { title: 'Fear Facing Challenge', duration: '15 min' },
          { title: 'Success Visualization', duration: '5 min' }
        ]
      }
    },
    disgust: {
      icon: Heart,
      color: 'text-emotion-disgust',
      bgColor: 'bg-gradient-to-br from-lime-50 to-green-100',
      borderColor: 'border-emotion-disgust',
      title: 'Let\'s Refocus Your Mind',
      subtitle: 'Time for a mental reset',
      content: {
        type: 'refocus',
        message: 'Let\'s shift your focus to something positive.',
        activities: [
          { title: 'Mindful Cleaning', description: 'Organize your space to clear your mind' },
          { title: 'Aromatherapy', description: 'Use pleasant scents to change your mood' },
          { title: 'Creative Expression', description: 'Channel feelings into art or writing' }
        ],
        suggestions: [
          'Take a walk in nature',
          'Listen to uplifting music',
          'Practice gratitude exercises'
        ]
      }
    }
  };

  // Get content for current emotion or default to neutral
  const content = emotionContent[emotion?.toLowerCase()] || emotionContent.neutral;
  const Icon = content.icon;

  // Render content based on type
  const renderContent = () => {
    switch (content.content.type) {
      case 'motivation':
        return (
          <div className="space-y-6">
            {/* Quote */}
            <div className="text-center space-y-3">
              <Quote className="w-8 h-8 mx-auto text-blue-600" />
              <blockquote className="text-lg italic text-gray-700">
                "{content.content.quote}"
              </blockquote>
              <cite className="text-sm text-gray-600">— {content.content.author}</cite>
            </div>

            {/* Tips */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Quick Tips:</h4>
              <ul className="space-y-2">
                {content.content.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Helpful Resources:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {content.content.resources.map((resource, index) => {
                  const ResourceIcon = resource.icon;
                  return (
                    <a
                      key={index}
                      href={resource.url}
                      className="flex items-center space-x-2 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ResourceIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">{resource.title}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Brain className="w-8 h-8 mx-auto text-green-600" />
              <p className="text-gray-700">{content.content.message}</p>
            </div>

            {/* Challenges */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Recommended Challenges:</h4>
              <div className="space-y-3">
                {content.content.challenges.map((challenge, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div>
                      <h5 className="font-medium text-gray-800">{challenge.title}</h5>
                      <p className="text-sm text-gray-600">{challenge.difficulty} • {challenge.time}</p>
                    </div>
                    <button className="btn-primary text-sm">Start</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Benefits:</h4>
              <ul className="space-y-2">
                {content.content.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'calming':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Video className="w-8 h-8 mx-auto text-red-600" />
              <p className="text-gray-700">{content.content.message}</p>
            </div>

            {/* Techniques */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Calming Techniques:</h4>
              <div className="space-y-3">
                {content.content.techniques.map((technique, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-800">{technique.name}</h5>
                      <span className="text-sm text-gray-600">{technique.duration}</span>
                    </div>
                    <p className="text-sm text-gray-600">{technique.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Videos */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Calming Videos:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {content.content.videos.map((video, index) => (
                  <div key={index} className="group cursor-pointer">
                    <div className="aspect-video bg-gray-200 rounded-lg mb-2 flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                      <Play className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">{video.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'learning':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-gray-600" />
              <p className="text-gray-700">{content.content.message}</p>
            </div>

            {/* Topics */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Recommended Topics:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {content.content.topics.map((topic, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">{topic.category}</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">{topic.level}</span>
                    </div>
                    <h5 className="font-medium text-gray-800">{topic.title}</h5>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Why Learn Now?</h4>
              <ul className="space-y-2">
                {content.content.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-600 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'exploration':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Lightbulb className="w-8 h-8 mx-auto text-yellow-600" />
              <p className="text-gray-700">{content.content.message}</p>
            </div>

            {/* Fun Facts */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Did You Know?</h4>
              <div className="space-y-2">
                {content.content.facts.map((fact, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-gray-700">{fact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Fun Activities:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {content.content.activities.map((activity, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 hover:border-yellow-300 transition-colors">
                    <h5 className="font-medium text-gray-800">{activity.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">{activity.type}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'confidence':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Target className="w-8 h-8 mx-auto text-purple-600" />
              <p className="text-gray-700">{content.content.message}</p>
            </div>

            {/* Strategies */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Confidence Building:</h4>
              <div className="space-y-3">
                {content.content.strategies.map((strategy, index) => (
                  <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h5 className="font-medium text-gray-800">{strategy.name}</h5>
                    <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exercises */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Practice Exercises:</h4>
              <div className="space-y-2">
                {content.content.exercises.map((exercise, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-gray-700">{exercise.title}</span>
                    <span className="text-sm text-gray-600">{exercise.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'refocus':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Heart className="w-8 h-8 mx-auto text-lime-600" />
              <p className="text-gray-700">{content.content.message}</p>
            </div>

            {/* Activities */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Refocus Activities:</h4>
              <div className="space-y-3">
                {content.content.activities.map((activity, index) => (
                  <div key={index} className="p-4 bg-lime-50 rounded-lg border border-lime-200">
                    <h5 className="font-medium text-gray-800">{activity.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Quick Suggestions:</h4>
              <ul className="space-y-2">
                {content.content.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-lime-600 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`emotion-card ${content.bgColor} ${content.borderColor} border-2`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${content.bgColor}`}>
              <Icon className={`w-12 h-12 ${content.color}`} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800">
            {content.title}
          </h3>
          <p className="text-gray-600">
            {content.subtitle}
          </p>
          {confidence && (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {(confidence * 100).toFixed(1)}% confidence
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Content */}
        <div className="border-t border-gray-200 pt-6">
          {renderContent()}
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button className="btn-primary">
            Start Activity
            <ExternalLink className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default EmotionAdaptiveUI;
