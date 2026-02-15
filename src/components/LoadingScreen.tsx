import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
      <p className="loading-text">Loading G-Studio...</p>
    </div>
  );
};
