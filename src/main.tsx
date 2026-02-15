import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@/styles/chat-enhancements.css';

// Initialize error handlers
import { errorHandler } from './utils/errorHandler';
import { eventBus } from './utils/EventBus';

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handle(event.reason, {
    type: 'unhandledrejection',
    promise: event.promise,
  });
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  errorHandler.handle(event.error, {
    type: 'error',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

// Network status monitoring
window.addEventListener('online', () => {
  eventBus.emit('network:online', undefined);
});

window.addEventListener('offline', () => {
  eventBus.emit('network:offline', undefined);
});

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
