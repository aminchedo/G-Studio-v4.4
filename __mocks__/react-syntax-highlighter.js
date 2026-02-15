const React = require('react');

function Prism({ children }) {
  // Simple wrapper that renders code children
  return React.createElement('pre', null, children);
}

module.exports = {
  Prism,
  default: Prism
};
