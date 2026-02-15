# Settings Module 🎛️

A modern, fully functional settings module for G-Studio with a minimalist design, high-quality SVG icons, and comprehensive functionality.

## ✨ Features

- **Modern Design**: Clean, minimalist interface with dark mode support
- **Fully Typed**: Complete TypeScript support with type safety
- **Persistent Storage**: Settings automatically saved to localStorage
- **Import/Export**: Easy backup and restore of settings
- **Search**: Quick search across all settings
- **Tabbed Interface**: Organized into logical sections
- **Responsive**: Works beautifully on all screen sizes
- **Accessible**: Keyboard navigation and ARIA labels
- **High-Quality Icons**: Custom SVG icons for every section
- **Zustand Integration**: Modern state management

## 📁 Structure

```
Settings/
├── Settings.tsx              # Main settings component
├── settingsStore.ts          # Zustand state management
├── types.ts                  # TypeScript type definitions
├── Icons.tsx                 # Custom SVG icon components
├── Examples.tsx              # Usage examples
├── README.md                 # This file
├── components/
│   └── SettingControls.tsx   # Reusable UI controls
└── sections/
    ├── GeneralSettings.tsx
    ├── AppearanceSettings.tsx
    ├── APIKeysSettings.tsx
    ├── NotificationSettings.tsx
    ├── PrivacySettings.tsx
    └── AdvancedSettings.tsx
```

## 🚀 Quick Start

### Installation

The module is already included in the project. No additional dependencies needed (uses existing zustand).

### Basic Usage

```tsx
import React, { useState } from 'react';
import { Settings } from './components/Settings';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsSettingsOpen(true)}>
        Open Settings
      </button>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
```

### With Keyboard Shortcut (Ctrl+,)

```tsx
import React, { useState, useEffect } from 'react';
import { Settings } from './components/Settings';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <>
      <p>Press Ctrl+, to open settings</p>
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
```

### Open to Specific Tab

```tsx
<Settings
  isOpen={isSettingsOpen}
  onClose={() => setIsSettingsOpen(false)}
  defaultTab="appearance"  // or 'general', 'apiKeys', etc.
/>
```

## 📖 Using Settings in Your Components

### Reading Settings

```tsx
import { useSettingsStore } from './components/Settings';

function MyComponent() {
  const { settings } = useSettingsStore();

  return (
    <div>
      <p>Theme: {settings.appearance.theme}</p>
      <p>Language: {settings.general.language}</p>
      <p>Auto-Save: {settings.general.autoSave ? 'On' : 'Off'}</p>
    </div>
  );
}
```

### Updating Settings

```tsx
import { useSettingsStore } from './components/Settings';

function ThemeToggle() {
  const { settings, updateSettings } = useSettingsStore();

  const toggleTheme = () => {
    updateSettings('appearance', {
      theme: settings.appearance.theme === 'dark' ? 'light' : 'dark',
    });
  };

  return (
    <button onClick={toggleTheme}>
      Toggle Theme
    </button>
  );
}
```

### Reacting to Settings Changes

```tsx
import { useSettingsStore } from './components/Settings';
import { useEffect } from 'react';

function ThemeApplier() {
  const { settings } = useSettingsStore();

  useEffect(() => {
    // Apply theme to document
    if (settings.appearance.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.appearance.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Auto mode
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, [settings.appearance.theme]);

  return null;
}
```

## 🎨 Available Settings

### General Settings
- Language selection
- Timezone configuration
- Default workspace
- Auto-save preferences
- Auto-save interval

### Appearance Settings
- Theme (light/dark/auto)
- Primary color
- Accent color
- Font size
- Font family
- Sidebar position
- Compact mode
- Animations toggle

### API Keys Settings
- OpenAI API key
- Anthropic API key
- Google AI API key
- Cohere API key
- Hugging Face token
- Custom endpoints

### Notification Settings
- Master notification toggle
- Sound notifications
- Desktop notifications
- Email notifications
- Email address
- Task completion alerts
- Error notifications
- Update notifications

### Privacy Settings
- Usage analytics
- Crash reports
- Telemetry
- Usage data sharing
- Data retention period
- Data export
- Data deletion

### Advanced Settings
- Developer mode
- Experimental features
- Beta features
- Max concurrent tasks
- Cache size
- API rate limit
- Log level
- Custom CSS
- System information

## 🛠️ Customization

### Adding New Settings

1. **Update Types** (`types.ts`):
```tsx
export interface MyNewSection {
  setting1: string;
  setting2: boolean;
}

export interface AppSettings {
  // ... existing settings
  myNewSection: MyNewSection;
}
```

2. **Update Store** (`settingsStore.ts`):
```tsx
const defaultSettings: AppSettings = {
  // ... existing defaults
  myNewSection: {
    setting1: 'default',
    setting2: true,
  },
};
```

3. **Create Section Component** (`sections/MyNewSection.tsx`):
```tsx
import React from 'react';
import { useSettingsStore } from '../settingsStore';
import { SettingGroup, SettingRow, Toggle } from '../components/SettingControls';

const MyNewSection: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const mySection = settings.myNewSection;

  return (
    <SettingGroup title="My Section">
      <SettingRow label="Setting 1">
        <Toggle
          checked={mySection.setting2}
          onChange={(checked) => updateSettings('myNewSection', { setting2: checked })}
        />
      </SettingRow>
    </SettingGroup>
  );
};

export default MyNewSection;
```

4. **Add to Main Settings** (`Settings.tsx`):
```tsx
// Add to SETTINGS_TABS array
// Add to renderSectionContent switch
```

### Custom Icons

Create new icons in `Icons.tsx`:
```tsx
export const MyIcon: React.FC<IconProps> = ({ className = '', size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    {/* Your SVG path here */}
  </svg>
);
```

## 🎯 Best Practices

1. **Always use the store hook** for accessing/updating settings
2. **Apply theme changes** in your app's root component
3. **Validate API keys** before using them
4. **Respect privacy settings** when collecting data
5. **Test with different themes** to ensure compatibility
6. **Use keyboard shortcuts** for better UX

## 🔧 API Reference

### `Settings` Component

```tsx
interface SettingsProps {
  isOpen: boolean;        // Controls visibility
  onClose: () => void;    // Called when closing
  defaultTab?: SettingsSection;  // Initial tab
}
```

### `useSettingsStore` Hook

```tsx
{
  settings: AppSettings;           // Current settings
  updateSettings: (section, updates) => void;  // Update function
  resetSettings: () => void;       // Reset to defaults
  exportSettings: () => string;    // Export as JSON
  importSettings: (json) => boolean;  // Import from JSON
}
```

## 📱 Responsive Design

The settings module is fully responsive:
- **Desktop**: Full sidebar with descriptions
- **Tablet**: Collapsible sidebar
- **Mobile**: Bottom sheet or full screen

## 🌙 Dark Mode

Automatically supports dark mode using Tailwind's dark mode classes:
- Respects system preferences when theme is "auto"
- Manual toggle available in appearance settings
- All components styled for both themes

## 🔐 Security

- API keys are stored in localStorage (encrypted recommended for production)
- Password/secret inputs have show/hide toggle
- Settings can be exported/imported for backup
- No settings sent to external servers

## 🐛 Troubleshooting

### Settings not persisting
- Check localStorage is enabled
- Verify Zustand persist middleware is working
- Check browser console for errors

### Theme not applying
- Ensure dark mode is configured in tailwind.config
- Check that `dark` class is added to `<html>` element
- Verify CSS is loaded correctly

### Icons not showing
- Check SVG imports are correct
- Verify stroke and fill properties
- Check icon size props

## 📝 License

Part of G-Studio project.

## 🤝 Contributing

1. Follow existing code style
2. Add TypeScript types for new features
3. Update README for significant changes
4. Test in both light and dark modes

## 📞 Support

For issues or questions, please refer to the main G-Studio documentation or create an issue in the project repository.

---

Made with ❤️ for G-Studio
