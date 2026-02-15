/**
 * AI Avatar Component
 * Animated AI character that shows emotional states
 */

import React, { useEffect, useState } from 'react';

export type Emotion = 'idle' | 'listening' | 'thinking' | 'happy' | 'confused';

interface AIAvatarProps {
  isListening: boolean;
  isSpeaking: boolean;
  emotion?: Emotion;
  size?: 'small' | 'medium' | 'large';
}

export const AIAvatar: React.FC<AIAvatarProps> = ({
  isListening,
  isSpeaking,
  emotion = 'idle',
  size = 'medium',
}) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (isListening || isSpeaking) {
      setPulse(true);
      const interval = setInterval(() => setPulse(p => !p), 800);
      return () => clearInterval(interval);
    } else {
      setPulse(false);
    }
  }, [isListening, isSpeaking]);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
  };

  const getEyes = () => {
    if (emotion === 'thinking') return '🤔';
    if (emotion === 'happy') return '😊';
    if (emotion === 'confused') return '😕';
    if (isListening) return '👂';
    return '👁️';
  };

  const getMouth = () => {
    if (isSpeaking) return '🗣️';
    if (emotion === 'happy') return '😊';
    if (emotion === 'thinking') return '🤔';
    return '😊';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar Container */}
      <div className="relative">
        {/* Pulse Ring */}
        {pulse && (
          <div className="absolute inset-0 animate-ping">
            <div className={`${sizeClasses[size]} rounded-full bg-purple-400 opacity-30`} />
          </div>
        )}

        {/* Main Avatar */}
        <div
          className={`
            ${sizeClasses[size]}
            rounded-full
            bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600
            flex items-center justify-center
            shadow-2xl shadow-purple-500/50
            transition-all duration-300
            ${pulse ? 'scale-110' : 'scale-100'}
            border-4 border-white/20
          `}
        >
          <div className="text-center">
            <div className="text-3xl mb-1">{getEyes()}</div>
            {isSpeaking && (
              <div className="text-2xl animate-bounce">{getMouth()}</div>
            )}
          </div>
        </div>

        {/* Voice Indicator */}
        {isListening && (
          <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1.5 animate-pulse">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        {/* Speaking Indicator */}
        {isSpeaking && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5">
            <svg
              className="w-4 h-4 text-white animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 3.5a.5.5 0 01.5.5v12a.5.5 0 01-1 0V4a.5.5 0 01.5-.5z" />
              <path d="M12 5a.5.5 0 01.5.5v9a.5.5 0 01-1 0v-9A.5.5 0 0112 5zM8 5a.5.5 0 01.5.5v9a.5.5 0 01-1 0v-9A.5.5 0 018 5z" />
            </svg>
          </div>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center">
        <p className="text-xs font-medium text-slate-600">
          {isListening && '🎤 Listening...'}
          {isSpeaking && '🔊 Speaking...'}
          {emotion === 'thinking' && '💭 Thinking...'}
          {!isListening && !isSpeaking && emotion === 'idle' && '😊 Ready'}
        </p>
      </div>
    </div>
  );
};

export default AIAvatar;
