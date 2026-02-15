const React = require('react');

module.exports = function ReactMarkdown({ children }) {
  // Render children directly for snapshots and tests
  return React.createElement('div', null, children);
};
