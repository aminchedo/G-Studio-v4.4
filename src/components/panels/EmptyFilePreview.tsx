/**
 * EmptyFilePreview Component
 * Theme-aware empty state for file preview panel
 */

import React from 'react';

export const EmptyFilePreview: React.FC = () => {
  return (
    <div className="empty-preview">
      <svg
        width="180"
        height="180"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.7 }}
      >
        <path
          d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M14 2V8H20"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8 13H16M8 17H14"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
