/**
 * GeminiTesterCore - Main Component
 * 
 * Core component that orchestrates all modules and provides the main interface
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GeminiTesterProvider } from './GeminiTesterContext';
import { GeminiTesterUI } from './GeminiTesterUI';

export interface GeminiTesterCoreProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Main Gemini Tester Component
 * 
 * This is the entry point for the Gemini Model Tester.
 * It provides a complete testing suite for Google Gemini AI models.
 * 
 * @example
 * ```tsx
 * import { GeminiTesterCore } from './components/gemini-tester';
 * 
 * function App() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   
 *   return (
 *     <>
 *       <button onClick={() => setIsOpen(true)}>
 *         Open Gemini Tester
 *       </button>
 *       
 *       <GeminiTesterCore 
 *         isOpen={isOpen} 
 *         onClose={() => setIsOpen(false)} 
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export const GeminiTesterCore: React.FC<GeminiTesterCoreProps> = React.memo(({ 
  isOpen = true, 
  onClose 
}) => {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <GeminiTesterProvider>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4 bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-800">
          <GeminiTesterUI onClose={onClose} />
        </div>
      </div>
    </GeminiTesterProvider>
  );

  // Render in portal for better z-index management
  return typeof window !== 'undefined' 
    ? createPortal(content, document.body)
    : null;
});

GeminiTesterCore.displayName = 'GeminiTesterCore';

/**
 * Standalone version (no modal wrapper)
 * 
 * Use this when you want to embed the tester directly in your page
 * without the modal overlay.
 * 
 * @example
 * ```tsx
 * import { GeminiTesterStandalone } from './components/gemini-tester';
 * 
 * function TestPage() {
 *   return (
 *     <div className="h-screen">
 *       <GeminiTesterStandalone />
 *     </div>
 *   );
 * }
 * ```
 */
export const GeminiTesterStandalone: React.FC = React.memo(() => {
  return (
    <GeminiTesterProvider>
      <div className="w-full h-full bg-slate-900">
        <GeminiTesterUI />
      </div>
    </GeminiTesterProvider>
  );
});

GeminiTesterStandalone.displayName = 'GeminiTesterStandalone';
