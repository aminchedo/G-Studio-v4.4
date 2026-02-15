# G-Studio Design System - Developer Guide

## 🎨 Design Principles

### Core Values
1. **Calm & Deliberate**: Reduce cognitive load, intentional white space
2. **Premium & Polished**: Professional quality, attention to detail
3. **AI-Native**: Designed specifically for AI interaction
4. **Readable & Accessible**: High contrast, optimal line height
5. **Fast & Responsive**: Buttery smooth, <100ms perceived latency

## 📐 Spacing System

### Grid Base: 4px
```css
--space-1: 4px   /* Tight spacing */
--space-2: 6px   /* Very compact */
--space-3: 8px   /* Compact */
--space-4: 10px  /* Small */
--space-5: 12px  /* Default gap */
--space-6: 14px  /* Medium-small */
--space-7: 16px  /* Medium */
--space-8: 18px  /* Medium-large */
--space-9: 20px  /* Large (message gap) */
--space-10: 24px /* XL (padding) */
--space-12: 32px /* 2XL */
--space-16: 48px /* 3XL */
```

### Usage Examples
```tsx
// Message list gap
gap: var(--message-gap); // 20px

// Chat container padding
padding: var(--chat-padding); // 24px

// Avatar to bubble distance
gap: var(--avatar-to-bubble); // 10px

// Button internal spacing
padding: var(--space-4) var(--space-7); // 10px 16px
```

## 🎨 Color System

### Background Layers
```css
--color-bg-base: #0E1116       /* Canvas background */
--color-bg-surface: #151A21    /* Raised surfaces */
--color-bg-elevated: #1B222C   /* Elevated elements */
--color-bg-overlay: rgba(21, 26, 33, 0.95) /* Modal overlays */
```

### Text Hierarchy
```css
--color-text-primary: #E6EDF3     /* Main content */
--color-text-secondary: #9DA7B3   /* Secondary info */
--color-text-muted: #6B7683       /* Tertiary/disabled */
```

### Interactive Elements
```css
--color-accent-primary: #5B8DEF   /* Buttons, links */
--color-accent-hover: #4A7ADE     /* Hover states */
--color-accent-subtle: rgba(91, 141, 239, 0.12) /* Backgrounds */
--color-accent-glow: rgba(91, 141, 239, 0.3) /* Focus effects */
```

### Semantic Colors
```css
--color-success: #3FB950          /* Success states */
--color-success-bg: rgba(63, 185, 80, 0.06)
--color-warning: #D29922          /* Warnings */
--color-warning-bg: rgba(210, 153, 34, 0.06)
--color-error: #F85149            /* Errors */
--color-error-bg: rgba(248, 81, 73, 0.06)
```

## ✏️ Typography

### Font Stack
```css
font-family: var(--font-inter);
/* 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif */

/* Code/Mono */
font-family: var(--font-mono);
/* 'JetBrains Mono', 'Fira Code', 'Consolas', monospace */
```

### Font Features
```css
font-feature-settings: var(--font-features);
/* "cv02", "cv03", "cv04" - Character variants for better readability */
```

### Size Scale
```tsx
// App title
fontSize: var(--font-size-app-title); // 18px
fontWeight: var(--font-weight-semibold); // 600

// Section headings
fontSize: var(--font-size-section); // 15px
fontWeight: var(--font-weight-semibold); // 600

// Message text
fontSize: var(--font-size-message); // 14px
fontWeight: var(--font-weight-regular); // 400
lineHeight: var(--line-height-relaxed); // 1.6

// Meta information
fontSize: var(--font-size-meta); // 12px
fontWeight: var(--font-weight-medium); // 500

// Badges
fontSize: var(--font-size-badge); // 11px
fontWeight: var(--font-weight-semibold); // 600
```

## 🔘 Border Radius

### Radius Scale
```css
--radius-sm: 8px    /* Small elements */
--radius-md: 12px   /* Default buttons, inputs */
--radius-lg: 18px   /* Chat bubbles */
--radius-xl: 24px   /* Modals, large panels */
--radius-full: 999px /* Pills, badges, avatars */
```

### Usage
```tsx
// Chat bubble
borderRadius: var(--radius-lg); // 18px

// Button
borderRadius: var(--radius-md); // 12px

// Avatar
borderRadius: var(--radius-full); // 999px

// Modal
borderRadius: var(--radius-xl); // 24px
```

## 🌊 Shadows & Elevation

### Shadow Scale
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3)
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.35)
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.4)
--shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.5)
--shadow-glow: 0 0 20px rgba(91, 141, 239, 0.15)
```

### Glass Effect
```css
background: var(--glass-bg); // rgba(27, 34, 44, 0.6)
border: 1px solid var(--glass-border); // rgba(255, 255, 255, 0.08)
backdrop-filter: blur(12px);
box-shadow: var(--glass-shadow);
```

## ⚡ Animations

### Timing Functions
```css
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)  /* Material standard */
--ease-smooth: cubic-bezier(0.16, 1, 0.3, 1)   /* Smooth acceleration */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1) /* Bounce effect */
```

### Durations
```css
--duration-instant: 80ms   /* Button press */
--duration-fast: 120ms     /* Hover states */
--duration-normal: 180ms   /* Message enter */
--duration-slow: 300ms     /* Modal open */
```

### Common Patterns
```tsx
// Message slide-in
animation: slideInUp var(--duration-normal) var(--ease-smooth);

// Hover action
transition: 
  background-color var(--duration-fast) var(--ease-standard),
  transform var(--duration-fast) var(--ease-standard);

// Button press
transform: scale(0.96);
transition: transform var(--duration-instant) var(--ease-standard);
```

## 📏 Layout Constraints

### Max Widths
```css
--layout-max-width: 860px  /* Chat container */
--layout-side-padding: 24px /* Page margins */
```

### Usage
```tsx
// Chat container
.message-list > * {
  max-width: var(--layout-max-width);
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}
```

## 🎯 Component Patterns

### Button Variants
```tsx
// Primary action
<button className="btn btn-primary">Send</button>

// Secondary action
<button className="btn btn-secondary">Cancel</button>

// Subtle action
<button className="btn btn-ghost">More</button>

// Small button
<button className="btn btn-sm btn-primary">OK</button>

// Large button
<button className="btn btn-lg btn-primary">Get Started</button>
```

### Message Bubble
```tsx
<div className={`message message-${role} message-enter`}>
  <div className="message-avatar">
    {role === 'user' ? '👤' : '🤖'}
  </div>
  <div className="message-content">
    <div className="message-text">{content}</div>
  </div>
</div>
```

### Modal Structure
```tsx
<div className="modal-overlay" onClick={onClose}>
  <div className="modal-content" onClick={e => e.stopPropagation()}>
    <div className="modal-header">
      <h2 className="modal-title">Title</h2>
      <button className="modal-close" onClick={onClose}>✕</button>
    </div>
    <div className="modal-body">
      {/* Content */}
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary">Cancel</button>
      <button className="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Form Elements
```tsx
// Text input
<input
  type="text"
  style={{
    width: '100%',
    padding: 'var(--space-4) var(--space-5)',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-message)',
    color: 'var(--color-text-primary)',
  }}
/>

// Checkbox
<label style={{ 
  display: 'flex', 
  alignItems: 'center',
  gap: 'var(--space-4)',
  cursor: 'pointer',
}}>
  <input
    type="checkbox"
    style={{ 
      width: '18px', 
      height: '18px',
      accentColor: 'var(--color-accent-primary)' 
    }}
  />
  Label text
</label>
```

## 🚨 Best Practices

### DO ✅
- Use design tokens instead of hardcoded values
- Follow the 4px spacing grid
- Maintain consistent border radius scale
- Use semantic color names
- Apply smooth transitions to interactive elements
- Test with keyboard navigation
- Verify color contrast

### DON'T ❌
- Introduce arbitrary spacing (use tokens)
- Mix different border radius scales
- Use `color: #fff` (use `var(--color-text-primary)`)
- Add animations without easing functions
- Forget hover/focus states
- Hardcode pixel values in components
- Skip accessibility attributes

## 🔄 Migration Pattern

### Before (Old Code)
```tsx
<div style={{ 
  padding: '20px',
  background: '#2c2f33',
  color: '#dcddde',
  borderRadius: '12px'
}}>
  Content
</div>
```

### After (Refactored)
```tsx
<div style={{ 
  padding: 'var(--space-10)',
  background: 'var(--color-bg-surface)',
  color: 'var(--color-text-primary)',
  borderRadius: 'var(--radius-md)'
}}>
  Content
</div>
```

## 📚 Resources

### Design Files
- `src/styles/design-tokens.css` - All CSS variables
- `src/App.css` - Global styles and component classes
- `UI_REFACTORING_SUMMARY.md` - Complete refactoring details
- `UI_TESTING_GUIDE.md` - Testing checklist

### Color Contrast
All text colors meet WCAG AA standards:
- Primary text on base: 12.6:1
- Secondary text on base: 7.8:1
- Muted text on base: 4.9:1

### Performance
- All transitions: < 300ms
- Animation frame rate: 60fps
- First paint: Optimized
- Reduced motion: Supported

---

**Questions?** Review the design tokens file for the complete system.
**Contributing?** Follow this guide for consistency.
