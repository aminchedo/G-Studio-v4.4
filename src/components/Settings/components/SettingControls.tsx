/**
 * Setting Controls - Reusable UI Components
 * Modern, minimalist control elements for settings
 */

import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon, CheckIcon } from '../Icons';

// ===== SETTING GROUP =====
interface SettingGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingGroup: React.FC<SettingGroupProps> = ({ title, description, children }) => (
  <div className="space-y-4">
    <div className="border-b border-gray-200 pb-2 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

// ===== SETTING ROW =====
interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingRow: React.FC<SettingRowProps> = ({ label, description, children }) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <div className="flex-1">
      <label className="block font-medium text-gray-900 dark:text-white">{label}</label>
      {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

// ===== TOGGLE =====
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
      checked
        ? 'bg-blue-600 dark:bg-blue-500'
        : 'bg-gray-200 dark:bg-gray-700'
    } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// ===== INPUT =====
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'url';
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  suffix?: string;
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
}) => (
  <div className="flex items-center gap-2">
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    />
    {suffix && <span className="text-sm text-gray-500 dark:text-gray-400">{suffix}</span>}
  </div>
);

// ===== SECRET INPUT =====
interface SecretInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SecretInput: React.FC<SecretInputProps> = ({ value, onChange, placeholder }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative w-full max-w-xs">
      <input
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        {isVisible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  );
};

// ===== SELECT =====
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, options, disabled = false }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
  rows = 4,
  disabled = false,
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    disabled={disabled}
    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
  />
);

// ===== RADIO GROUP =====
interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ value, onChange, options, disabled = false }) => (
  <div className="flex gap-3">
    {options.map((option) => (
      <label
        key={option.value}
        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${
          value === option.value
            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-400'
            : 'border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input
          type="radio"
          value={option.value}
          checked={value === option.value}
          onChange={(e) => !disabled && onChange(e.target.value)}
          disabled={disabled}
          className="sr-only"
        />
        {value === option.value && <CheckIcon size={16} />}
        {option.label}
      </label>
    ))}
  </div>
);

// ===== COLOR PICKER =====
interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const presetColors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
  ];

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border-2 border-gray-300 dark:border-gray-700"
        />
      </div>
      <div className="flex gap-2">
        {presetColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
              value === color
                ? 'border-gray-900 dark:border-white'
                : 'border-gray-300 dark:border-gray-700'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
    </div>
  );
};
