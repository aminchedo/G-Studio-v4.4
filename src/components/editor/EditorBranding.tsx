/**
 * G Studio - Editor Branding Background
 *
 * Displays program logo and name transparently as editor background
 */

import React from "react";
import { Sparkles } from "lucide-react";

export interface EditorBrandingProps {
  isDarkMode?: boolean;
}

export const EditorBranding: React.FC<EditorBrandingProps> = ({
  isDarkMode = true,
}) => {
  return (
    <div className={`editor-branding ${isDarkMode ? "dark" : "light"}`}>
      {/* Logo */}
      <div className="branding-logo">
        <div className="logo-icon">
          <Sparkles className="icon" />
        </div>
      </div>

      {/* Program Name */}
      <div className="branding-text">
        <h1 className="program-name">G Studio</h1>
        <p className="program-tagline">AI-Powered Development Environment</p>
      </div>

      <style>{`
        .editor-branding {
          position: absolute;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          opacity: 0.08;
          pointer-events: none;
          user-select: none;
          z-index: 0;
        }

        .branding-logo {
          position: relative;
        }

        .logo-icon {
          width: 180px;
          height: 180px;
          border-radius: 36px;
          background: linear-gradient(135deg, #5B8DEF 0%, #4A7ADE 50%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 60px rgba(91, 141, 239, 0.3);
        }

        .logo-icon .icon {
          width: 100px;
          height: 100px;
          color: white;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
        }

        .branding-text {
          text-align: center;
        }

        .program-name {
          font-size: 64px;
          font-weight: 800;
          margin: 0;
          background: linear-gradient(135deg, #5B8DEF 0%, #4A7ADE 50%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -2px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .program-tagline {
          font-size: 18px;
          font-weight: 500;
          margin: 8px 0 0 0;
          color: currentColor;
          opacity: 0.6;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .logo-icon {
            width: 120px;
            height: 120px;
          }

          .logo-icon .icon {
            width: 64px;
            height: 64px;
          }

          .program-name {
            font-size: 48px;
          }

          .program-tagline {
            font-size: 14px;
          }
        }

        /* Animation on hover (even though pointer-events: none) */
        @keyframes subtle-pulse {
          0%, 100% {
            transform: translateX(-50%) scale(1);
          }
          50% {
            transform: translateX(-50%) scale(1.02);
          }
        }

        .editor-branding {
          animation: subtle-pulse 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default EditorBranding;
