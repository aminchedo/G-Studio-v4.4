/**
 * Modern Appearance Settings Section
 * Enterprise-level visual customization with live previews
 */

import React from 'react';
import { useSettingsStore } from '../settingsStore';
import { 
  SettingGroup, 
  SettingRow, 
  Select, 
  ColorPicker, 
  Toggle, 
  RadioGroup,
  Slider 
} from '../components/SettingControlsModern';

const AppearanceSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const appearance = settings.appearance;

  return (
    <div className="space-y-6">
      
      {/* Theme Configuration */}
      <SettingGroup 
        title="Theme & Color Mode" 
        description="Customize the visual theme and color scheme"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        }
      >
        <SettingRow
          label="Color Mode"
          description="Choose between light, dark, or automatic theme based on system preferences"
        >
          <RadioGroup
            value={appearance.theme}
            onChange={(value) => updateSettings('appearance', { theme: value as 'light' | 'dark' | 'auto' })}
            options={[
              { 
                value: 'light', 
                label: 'Light',
                description: 'Bright interface',
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )
              },
              { 
                value: 'dark', 
                label: 'Dark',
                description: 'Easy on eyes',
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )
              },
              { 
                value: 'auto', 
                label: 'Auto',
                description: 'Follows system',
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )
              },
            ]}
            layout="horizontal"
          />
        </SettingRow>

        <SettingRow
          label="Primary Brand Color"
          description="Main accent color used throughout the interface for buttons, links, and highlights"
          badge="Brand"
        >
          <ColorPicker
            value={appearance.primaryColor}
            onChange={(value) => updateSettings('appearance', { primaryColor: value })}
          />
        </SettingRow>

        <SettingRow
          label="Secondary Accent Color"
          description="Complementary color for secondary UI elements and special highlights"
        >
          <ColorPicker
            value={appearance.accentColor}
            onChange={(value) => updateSettings('appearance', { accentColor: value })}
          />
        </SettingRow>
      </SettingGroup>

      {/* Typography Settings */}
      <SettingGroup 
        title="Typography" 
        description="Customize text appearance and readability"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        }
      >
        <SettingRow
          label="Base Font Size"
          description="Adjust the base font size for better readability - affects all text in the interface"
        >
          <RadioGroup
            value={appearance.fontSize}
            onChange={(value) => updateSettings('appearance', { fontSize: value as 'small' | 'medium' | 'large' })}
            options={[
              { 
                value: 'small', 
                label: 'Small',
                description: '13px - Compact',
                icon: <span className="text-xs font-bold">A</span>
              },
              { 
                value: 'medium', 
                label: 'Medium',
                description: '14px - Default',
                icon: <span className="text-sm font-bold">A</span>
              },
              { 
                value: 'large', 
                label: 'Large',
                description: '16px - Comfortable',
                icon: <span className="text-base font-bold">A</span>
              },
            ]}
            layout="horizontal"
          />
        </SettingRow>

        <SettingRow
          label="Font Family"
          description="Choose the primary typeface used across the application"
          badge="Typography"
        >
          <Select
            value={appearance.fontFamily}
            onChange={(value) => updateSettings('appearance', { fontFamily: value })}
            options={[
              { value: 'Inter Variable, sans-serif', label: 'Inter - Modern Sans-serif' },
              { value: 'system-ui, sans-serif', label: 'System UI - Native Look' },
              { value: '-apple-system, sans-serif', label: 'San Francisco - Apple Design' },
              { value: 'Segoe UI, sans-serif', label: 'Segoe UI - Windows Design' },
              { value: 'Roboto, sans-serif', label: 'Roboto - Material Design' },
              { value: 'Georgia, serif', label: 'Georgia - Classic Serif' },
              { value: '"Courier New", monospace', label: 'Courier New - Code Style' },
              { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono - Developer' },
              { value: '"Fira Code", monospace', label: 'Fira Code - Programming' },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      {/* Layout Configuration */}
      <SettingGroup 
        title="Layout & Interface Density" 
        description="Customize the interface layout and spacing"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
          </svg>
        }
      >
        <SettingRow
          label="Sidebar Position"
          description="Choose which side of the screen to display the main navigation sidebar"
        >
          <RadioGroup
            value={appearance.sidebarPosition}
            onChange={(value) => updateSettings('appearance', { sidebarPosition: value as 'left' | 'right' })}
            options={[
              { 
                value: 'left', 
                label: 'Left',
                description: 'Western standard',
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )
              },
              { 
                value: 'right', 
                label: 'Right',
                description: 'Alternative layout',
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )
              },
            ]}
            layout="horizontal"
          />
        </SettingRow>

        <SettingRow
          label="Compact Mode"
          description="Reduce spacing and padding for a denser, more efficient layout - fits more content on screen"
          badge="Advanced"
        >
          <Toggle
            checked={appearance.compactMode}
            onChange={(checked) => updateSettings('appearance', { compactMode: checked })}
            size="md"
          />
        </SettingRow>

        <SettingRow
          label="Smooth Animations"
          description="Enable smooth transitions and animations throughout the interface - may impact performance on slower devices"
        >
          <Toggle
            checked={appearance.animations}
            onChange={(checked) => updateSettings('appearance', { animations: checked })}
            size="md"
          />
        </SettingRow>
      </SettingGroup>

      {/* Preview Card */}
      <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-gray-800/60 dark:bg-gray-900/40">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">Live Preview</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">See how your changes look</p>
          </div>
        </div>
        
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-800/50">
          <div 
            className="rounded-lg p-6 shadow-lg transition-all"
            style={{ 
              backgroundColor: appearance.primaryColor,
              fontFamily: appearance.fontFamily,
            }}
          >
            <h3 className="text-2xl font-bold text-white">Sample Heading</h3>
            <p className="mt-2 text-white/90" style={{ 
              fontSize: appearance.fontSize === 'small' ? '13px' : appearance.fontSize === 'large' ? '16px' : '14px' 
            }}>
              This is how your selected theme will appear throughout the application.
            </p>
            <button 
              className="mt-4 rounded-lg px-6 py-2 font-semibold text-white shadow-md transition-all hover:shadow-xl"
              style={{ backgroundColor: appearance.accentColor }}
            >
              Sample Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
