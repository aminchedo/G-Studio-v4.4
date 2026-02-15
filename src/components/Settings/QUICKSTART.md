# Settings Module - Quick Start 🚀

Get the settings module up and running in 2 minutes!

## Step 1: Import the Component

```tsx
import { Settings, useSettingsStore } from './components/Settings';
```

## Step 2: Add State for Modal

```tsx
const [isSettingsOpen, setIsSettingsOpen] = useState(false);
```

## Step 3: Add the Settings Component

```tsx
<Settings
  isOpen={isSettingsOpen}
  onClose={() => setIsSettingsOpen(false)}
/>
```

## Step 4: Add a Button to Open Settings

```tsx
<button onClick={() => setIsSettingsOpen(true)}>
  Open Settings
</button>
```

## Complete Example

```tsx
import React, { useState } from 'react';
import { Settings } from './components/Settings';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div>
      <h1>My App</h1>
      
      <button onClick={() => setIsSettingsOpen(true)}>
        ⚙️ Settings
      </button>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
```

That's it! You now have a fully functional settings module. 🎉

## Bonus: Add Keyboard Shortcut (Ctrl+,)

```tsx
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
```

## Reading Settings in Your Code

```tsx
import { useSettingsStore } from './components/Settings';

function MyComponent() {
  const { settings } = useSettingsStore();
  
  console.log(settings.appearance.theme); // 'light', 'dark', or 'auto'
  console.log(settings.general.language); // 'en', 'es', etc.
  
  return <div>Current theme: {settings.appearance.theme}</div>;
}
```

## Updating Settings Programmatically

```tsx
import { useSettingsStore } from './components/Settings';

function ThemeToggle() {
  const { updateSettings, settings } = useSettingsStore();
  
  const toggleTheme = () => {
    updateSettings('appearance', {
      theme: settings.appearance.theme === 'dark' ? 'light' : 'dark'
    });
  };
  
  return <button onClick={toggleTheme}>Toggle Theme</button>;
}
```

## What's Included?

✅ 6 settings sections (General, Appearance, API Keys, Notifications, Privacy, Advanced)  
✅ Dark mode support  
✅ Persistent storage (localStorage)  
✅ Import/Export functionality  
✅ Search feature  
✅ TypeScript types  
✅ High-quality SVG icons  
✅ Responsive design  

## Next Steps

- Check out [README.md](./README.md) for detailed documentation
- See [Examples.tsx](./Examples.tsx) for more usage patterns
- Run [SettingsDemo.tsx](./SettingsDemo.tsx) to see all features in action

---

**Tip**: Press `Ctrl+,` (or `Cmd+,` on Mac) is the standard keyboard shortcut for opening settings in most applications!
