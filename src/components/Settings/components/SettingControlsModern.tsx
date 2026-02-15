/**
 * Modern Enterprise Setting Controls
 * Professional, polished UI components with better UX
 */

import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon, CheckIcon } from '../Icons';

// ===== SETTING GROUP (Card-based) =====
interface SettingGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const SettingGroup: React.FC<SettingGroupProps> = ({ 
  title, 
  description, 
  children,
  icon 
}) => (
  <div className="group rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-800/60 dark:bg-gray-900/40">
    <div className="mb-6 flex items-start gap-4">
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </div>
    </div>
    <div className="space-y-5">{children}</div>
  </div>
);

// ===== SETTING ROW (Grid-based) =====
interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  badge?: string;
}

export const SettingRow: React.FC<SettingRowProps> = ({ 
  label, 
  description, 
  children,
  badge 
}) => (
  <div className="group grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-gray-200 hover:bg-gray-50 dark:border-gray-800/50 dark:bg-gray-800/30 dark:hover:border-gray-700 dark:hover:bg-gray-800/50 lg:grid-cols-2 lg:items-center">
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="font-semibold text-gray-900 dark:text-white">{label}</label>
        {badge && (
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
    <div className="flex justify-start lg:justify-end">{children}</div>
  </div>
);

// ===== MODERN TOGGLE =====
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Toggle: React.FC<ToggleProps> = ({ 
  checked, 
  onChange, 
  disabled = false,
  size = 'md'
}) => {
  const sizes = {
    sm: { container: 'h-5 w-9', knob: 'h-3 w-3', translate: 'translate-x-4' },
    md: { container: 'h-6 w-11', knob: 'h-4 w-4', translate: 'translate-x-5' },
    lg: { container: 'h-7 w-14', knob: 'h-5 w-5', translate: 'translate-x-7' },
  };

  const s = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex ${s.container} items-center rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-4 ${
        checked
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 focus:ring-blue-500/20 dark:from-blue-600 dark:to-blue-700'
          : 'bg-gray-300 shadow-inner focus:ring-gray-500/20 dark:bg-gray-700'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-xl'}`}
    >
      <span
        className={`inline-block ${s.knob} transform rounded-full bg-white shadow-md transition-all duration-300 ease-out ${
          checked ? s.translate : 'translate-x-1'
        }`}
      />
    </button>
  );
};

// ===== MODERN INPUT =====
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'url';
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  suffix?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  min,
  max,
  suffix,
  icon,
}) => (
  <div className="flex items-center gap-3">
    <div className="relative flex-1 max-w-md group">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500">
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        className={`w-full rounded-xl border border-gray-300 bg-white ${icon ? 'pl-10 pr-4' : 'px-4'} py-3 text-sm font-medium text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-blue-600`}
      />
    </div>
    {suffix && (
      <span className="whitespace-nowrap text-sm font-medium text-gray-600 dark:text-gray-400">
        {suffix}
      </span>
    )}
  </div>
);

// ===== SECRET INPUT WITH COPY =====
interface SecretInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SecretInput: React.FC<SecretInputProps> = ({ 
  value, 
  onChange, 
  placeholder 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative max-w-md group">
      <input
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-24 text-sm font-medium text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-blue-600"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title={isVisible ? 'Hide' : 'Show'}
        >
          {isVisible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
        {value && (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="Copy"
          >
            {copied ? (
              <CheckIcon size={18} className="text-green-500" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// ===== SELECT WITH ICONS =====
interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({ 
  value, 
  onChange, 
  options, 
  disabled = false 
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className="max-w-md cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600 dark:focus:border-blue-600"
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// ===== TEXT AREA =====
interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  placeholder,
  rows = 6,
  disabled = false,
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    disabled={disabled}
    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-blue-600"
  />
);

// ===== RADIO GROUP (Pill Style) =====
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ 
  value, 
  onChange, 
  options, 
  disabled = false,
  layout = 'horizontal'
}) => (
  <div className={`flex ${layout === 'horizontal' ? 'flex-wrap gap-2' : 'flex-col gap-2'}`}>
    {options.map((option) => {
      const isSelected = value === option.value;
      return (
        <label
          key={option.value}
          className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
            isSelected
              ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 shadow-lg shadow-blue-500/20 dark:border-blue-400 dark:from-blue-900/40 dark:to-blue-800/40'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${
            layout === 'horizontal' ? 'flex-1 min-w-[120px]' : 'w-full'
          }`}
        >
          <input
            type="radio"
            value={option.value}
            checked={isSelected}
            onChange={(e) => !disabled && onChange(e.target.value)}
            disabled={disabled}
            className="sr-only"
          />
          <div className="flex items-center gap-3 p-4">
            {option.icon && (
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all ${
                isSelected
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {option.icon}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  isSelected
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {option.label}
                </span>
                {isSelected && (
                  <CheckIcon size={16} className="text-blue-600 dark:text-blue-400" />
                )}
              </div>
              {option.description && (
                <p className={`mt-1 text-xs ${
                  isSelected
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {option.description}
                </p>
              )}
            </div>
          </div>
        </label>
      );
    })}
  </div>
);

// ===== COLOR PICKER WITH GRADIENT PREVIEW =====
interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const presetColors = [
    { color: '#3b82f6', name: 'Blue' },
    { color: '#8b5cf6', name: 'Purple' },
    { color: '#ec4899', name: 'Pink' },
    { color: '#ef4444', name: 'Red' },
    { color: '#f97316', name: 'Orange' },
    { color: '#eab308', name: 'Yellow' },
    { color: '#22c55e', name: 'Green' },
    { color: '#14b8a6', name: 'Teal' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Current Color Display */}
      <div className="relative group">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-12 cursor-pointer rounded-xl border-4 border-white shadow-lg ring-2 ring-gray-300 transition-all hover:ring-4 hover:ring-blue-500/30 dark:border-gray-800 dark:ring-gray-700"
          title="Pick custom color"
        />
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700">
          Custom
        </div>
      </div>

      {/* Preset Colors */}
      <div className="flex flex-wrap gap-2">
        {presetColors.map((preset) => (
          <button
            key={preset.color}
            type="button"
            onClick={() => onChange(preset.color)}
            className={`group relative h-12 w-12 rounded-xl transition-all hover:scale-110 hover:shadow-lg ${
              value === preset.color
                ? 'ring-4 ring-blue-500 dark:ring-blue-400'
                : 'ring-2 ring-gray-300 hover:ring-gray-400 dark:ring-gray-700 dark:hover:ring-gray-600'
            }`}
            style={{ backgroundColor: preset.color }}
            title={preset.name}
          >
            {value === preset.color && (
              <CheckIcon size={20} className="absolute inset-0 m-auto text-white drop-shadow-lg" />
            )}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700">
              {preset.name}
            </div>
          </button>
        ))}
      </div>

      {/* Hex Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-xs font-mono font-semibold text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        placeholder="#000000"
        pattern="^#[0-9A-Fa-f]{6}$"
      />
    </div>
  );
};

// ===== SLIDER =====
interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  unit?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit = '',
}) => (
  <div className="w-full max-w-md space-y-2">
    <div className="flex items-center justify-between">
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      )}
      <span className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        {value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition-all [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all hover:[&::-webkit-slider-thumb]:scale-110 dark:bg-gray-700"
    />
    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
  </div>
);
