/**
 * G Studio v2.3.0 - Theme System
 * Dynamic theming with design tokens, auto-theme detection,
 * and customizable color schemes
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================================
// COLOR PALETTES
// ============================================================================

const colorPalettes = {
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
  emerald: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#145231",
    950: "#052e16",
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  red: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#4f0713",
  },
  cyan: {
    50: "#ecf0ff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63",
    950: "#082f49",
  },
  violet: {
    50: "#faf5ff",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7",
    600: "#9333ea",
    700: "#7e22ce",
    800: "#6b21a8",
    900: "#581c87",
    950: "#3f0f5c",
  },
  teal: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
    950: "#0d3331",
  },
} as const;

// ============================================================================
// COLOR TOKENS INTERFACE
// ============================================================================

export interface ColorTokens {
  // Background
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  bgHover: string;
  bgActive: string;
  bgOverlay: string;
  bgDisabled: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textInverse: string;
  textDisabled: string;
  textHint: string;

  // Border
  borderPrimary: string;
  borderSecondary: string;
  borderFocus: string;
  borderDivider: string;
  borderDisabled: string;

  // Accent
  accent: string;
  accentHover: string;
  accentActive: string;
  accentMuted: string;

  // Success
  success: string;
  successHover: string;
  successBg: string;
  successBgLight: string;

  // Warning
  warning: string;
  warningHover: string;
  warningBg: string;
  warningBgLight: string;

  // Error
  error: string;
  errorHover: string;
  errorBg: string;
  errorBgLight: string;

  // Info
  info: string;
  infoHover: string;
  infoBg: string;
  infoBgLight: string;

  // Editor
  editorBg: string;
  editorLineNumber: string;
  editorLineNumberActive: string;
  editorSelection: string;
  editorCursor: string;
  editorGutter: string;
  editorFold: string;

  // Syntax
  syntaxKeyword: string;
  syntaxString: string;
  syntaxNumber: string;
  syntaxComment: string;
  syntaxFunction: string;
  syntaxVariable: string;
  syntaxType: string;
  syntaxOperator: string;
  syntaxPunctuation: string;
  syntaxProperty: string;
  syntaxTag: string;

  // Chat
  chatUserBg: string;
  chatUserText: string;
  chatAssistantBg: string;
  chatAssistantText: string;
  chatSystemBg: string;
  chatSystemText: string;

  // UI Components
  inputBg: string;
  inputBorder: string;
  inputFocus: string;
  buttonBg: string;
  buttonText: string;
  scrollbar: string;
  scrollbarHover: string;
}

// ============================================================================
// SPACING TOKENS
// ============================================================================

export interface SpacingTokens {
  0: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
  "4xl": string;
}

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export interface TypographyTokens {
  fontFamilySans: string;
  fontFamilyMono: string;
  fontFamilyDisplay: string;
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeMd: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontSize2xl: string;
  fontSize3xl: string;
  fontSize4xl: string;
  fontWeightLight: number;
  fontWeightNormal: number;
  fontWeightMedium: number;
  fontWeightSemibold: number;
  fontWeightBold: number;
  lineHeightTight: number;
  lineHeightNormal: number;
  lineHeightRelaxed: number;
  lineHeightLoose: number;
}

// ============================================================================
// SHADOW TOKENS
// ============================================================================

export interface ShadowTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  inner: string;
}

// ============================================================================
// RADIUS TOKENS
// ============================================================================

export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

// ============================================================================
// ANIMATION TOKENS
// ============================================================================

export interface AnimationTokens {
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  durationSlower: string;
  easingLinear: string;
  easingIn: string;
  easingOut: string;
  easingInOut: string;
  easingSpring: string;
}

// ============================================================================
// BREAKPOINT TOKENS
// ============================================================================

export interface BreakpointTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
}

// ============================================================================
// Z-INDEX TOKENS
// ============================================================================

export interface ZIndexTokens {
  hide: string;
  base: string;
  dropdown: string;
  sticky: string;
  fixed: string;
  backdrop: string;
  offcanvas: string;
  modal: string;
  popover: string;
  tooltip: string;
}

// ============================================================================
// COMPLETE THEME TOKENS
// ============================================================================

export interface ThemeTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  shadows: ShadowTokens;
  radius: RadiusTokens;
  animation: AnimationTokens;
  breakpoints: BreakpointTokens;
  zIndex: ZIndexTokens;
}

// ============================================================================
// DARK THEME
// ============================================================================

const darkTheme: ThemeTokens = {
  colors: {
    bgPrimary: colorPalettes.slate[900],
    bgSecondary: colorPalettes.slate[800],
    bgTertiary: colorPalettes.slate[700],
    bgElevated: colorPalettes.slate[800],
    bgHover: colorPalettes.slate[700],
    bgActive: colorPalettes.slate[600],
    bgOverlay: "rgba(15, 23, 42, 0.6)",
    bgDisabled: colorPalettes.slate[800],

    textPrimary: colorPalettes.slate[50],
    textSecondary: colorPalettes.slate[300],
    textTertiary: colorPalettes.slate[400],
    textMuted: colorPalettes.slate[400],
    textInverse: colorPalettes.slate[900],
    textDisabled: colorPalettes.slate[500],
    textHint: colorPalettes.slate[400],

    borderPrimary: colorPalettes.slate[700],
    borderSecondary: colorPalettes.slate[600],
    borderFocus: colorPalettes.blue[500],
    borderDivider: colorPalettes.slate[700],
    borderDisabled: colorPalettes.slate[800],

    accent: colorPalettes.blue[500],
    accentHover: colorPalettes.blue[600],
    accentActive: colorPalettes.blue[700],
    accentMuted: colorPalettes.blue[950],

    success: colorPalettes.emerald[500],
    successHover: colorPalettes.emerald[600],
    successBg: colorPalettes.emerald[950],
    successBgLight: colorPalettes.emerald[900],

    warning: colorPalettes.amber[500],
    warningHover: colorPalettes.amber[600],
    warningBg: colorPalettes.amber[950],
    warningBgLight: colorPalettes.amber[900],

    error: colorPalettes.red[500],
    errorHover: colorPalettes.red[600],
    errorBg: colorPalettes.red[950],
    errorBgLight: colorPalettes.red[900],

    info: colorPalettes.cyan[500],
    infoHover: colorPalettes.cyan[600],
    infoBg: colorPalettes.cyan[950],
    infoBgLight: colorPalettes.cyan[900],

    editorBg: "#0d1117",
    editorLineNumber: "#6e7681",
    editorLineNumberActive: "#8b949e",
    editorSelection: "#264f78",
    editorCursor: "#c9d1d9",
    editorGutter: "#0d1117",
    editorFold: "#6e7681",

    syntaxKeyword: colorPalettes.violet[400],
    syntaxString: colorPalettes.emerald[400],
    syntaxNumber: colorPalettes.amber[300],
    syntaxComment: colorPalettes.slate[600],
    syntaxFunction: colorPalettes.blue[400],
    syntaxVariable: colorPalettes.slate[50],
    syntaxType: colorPalettes.teal[400],
    syntaxOperator: colorPalettes.red[400],
    syntaxPunctuation: colorPalettes.slate[400],
    syntaxProperty: colorPalettes.blue[300],
    syntaxTag: colorPalettes.violet[300],

    chatUserBg: colorPalettes.blue[950],
    chatUserText: colorPalettes.slate[50],
    chatAssistantBg: colorPalettes.slate[800],
    chatAssistantText: colorPalettes.slate[50],
    chatSystemBg: colorPalettes.slate[700],
    chatSystemText: colorPalettes.slate[300],

    inputBg: colorPalettes.slate[800],
    inputBorder: colorPalettes.slate[700],
    inputFocus: colorPalettes.blue[500],
    buttonBg: colorPalettes.blue[500],
    buttonText: colorPalettes.slate[50],
    scrollbar: colorPalettes.slate[600],
    scrollbarHover: colorPalettes.slate[500],
  },
  spacing: {
    0: "0",
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
    "4xl": "6rem",
  },
  typography: {
    fontFamilySans:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyMono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    fontFamilyDisplay: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSizeXs: "0.75rem",
    fontSizeSm: "0.875rem",
    fontSizeMd: "1rem",
    fontSizeLg: "1.125rem",
    fontSizeXl: "1.25rem",
    fontSize2xl: "1.5rem",
    fontSize3xl: "1.875rem",
    fontSize4xl: "2.25rem",
    fontWeightLight: 300,
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightSemibold: 600,
    fontWeightBold: 700,
    lineHeightTight: 1.25,
    lineHeightNormal: 1.5,
    lineHeightRelaxed: 1.75,
    lineHeightLoose: 2,
  },
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.3)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.3)",
  },
  radius: {
    none: "0",
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
  animation: {
    durationFast: "100ms",
    durationNormal: "200ms",
    durationSlow: "300ms",
    durationSlower: "500ms",
    easingLinear: "linear",
    easingIn: "cubic-bezier(0.4, 0, 1, 1)",
    easingOut: "cubic-bezier(0, 0, 0.2, 1)",
    easingInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    easingSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  breakpoints: {
    xs: "320px",
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
  zIndex: {
    hide: "-1",
    base: "0",
    dropdown: "1000",
    sticky: "1020",
    fixed: "1030",
    backdrop: "1040",
    offcanvas: "1050",
    modal: "1060",
    popover: "1070",
    tooltip: "1080",
  },
};

// ============================================================================
// LIGHT THEME
// ============================================================================

const lightTheme: ThemeTokens = {
  ...darkTheme,
  colors: {
    bgPrimary: colorPalettes.slate[50],
    bgSecondary: colorPalettes.slate[100],
    bgTertiary: colorPalettes.slate[200],
    bgElevated: colorPalettes.slate[50],
    bgHover: colorPalettes.slate[200],
    bgActive: colorPalettes.slate[300],
    bgOverlay: "rgba(15, 23, 42, 0.4)",
    bgDisabled: colorPalettes.slate[100],

    textPrimary: colorPalettes.slate[900],
    textSecondary: colorPalettes.slate[600],
    textTertiary: colorPalettes.slate[500],
    textMuted: colorPalettes.slate[500],
    textInverse: colorPalettes.slate[50],
    textDisabled: colorPalettes.slate[400],
    textHint: colorPalettes.slate[500],

    borderPrimary: colorPalettes.slate[300],
    borderSecondary: colorPalettes.slate[400],
    borderFocus: colorPalettes.blue[600],
    borderDivider: colorPalettes.slate[200],
    borderDisabled: colorPalettes.slate[200],

    accent: colorPalettes.blue[600],
    accentHover: colorPalettes.blue[700],
    accentActive: colorPalettes.blue[800],
    accentMuted: colorPalettes.blue[50],

    success: colorPalettes.emerald[600],
    successHover: colorPalettes.emerald[700],
    successBg: colorPalettes.emerald[50],
    successBgLight: colorPalettes.emerald[100],

    warning: colorPalettes.amber[600],
    warningHover: colorPalettes.amber[700],
    warningBg: colorPalettes.amber[50],
    warningBgLight: colorPalettes.amber[100],

    error: colorPalettes.red[600],
    errorHover: colorPalettes.red[700],
    errorBg: colorPalettes.red[50],
    errorBgLight: colorPalettes.red[100],

    info: colorPalettes.cyan[600],
    infoHover: colorPalettes.cyan[700],
    infoBg: colorPalettes.cyan[50],
    infoBgLight: colorPalettes.cyan[100],

    editorBg: "#ffffff",
    editorLineNumber: "#9ca3af",
    editorLineNumberActive: "#6b7280",
    editorSelection: "#add6ff",
    editorCursor: "#000000",
    editorGutter: "#f9fafb",
    editorFold: "#9ca3af",

    syntaxKeyword: colorPalettes.violet[600],
    syntaxString: colorPalettes.emerald[600],
    syntaxNumber: colorPalettes.amber[600],
    syntaxComment: colorPalettes.slate[400],
    syntaxFunction: colorPalettes.blue[600],
    syntaxVariable: colorPalettes.slate[900],
    syntaxType: colorPalettes.teal[600],
    syntaxOperator: colorPalettes.red[600],
    syntaxPunctuation: colorPalettes.slate[600],
    syntaxProperty: colorPalettes.blue[600],
    syntaxTag: colorPalettes.violet[600],

    chatUserBg: colorPalettes.blue[100],
    chatUserText: colorPalettes.blue[900],
    chatAssistantBg: colorPalettes.slate[100],
    chatAssistantText: colorPalettes.slate[900],
    chatSystemBg: colorPalettes.slate[200],
    chatSystemText: colorPalettes.slate[700],

    inputBg: colorPalettes.slate[50],
    inputBorder: colorPalettes.slate[300],
    inputFocus: colorPalettes.blue[600],
    buttonBg: colorPalettes.blue[600],
    buttonText: colorPalettes.slate[50],
    scrollbar: colorPalettes.slate[300],
    scrollbarHover: colorPalettes.slate[400],
  },
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  },
};

// ============================================================================
// HIGH CONTRAST THEME
// ============================================================================

const highContrastTheme: ThemeTokens = {
  ...darkTheme,
  colors: {
    bgPrimary: "#000000",
    bgSecondary: "#1a1a1a",
    bgTertiary: "#333333",
    bgElevated: "#1a1a1a",
    bgHover: "#444444",
    bgActive: "#555555",
    bgOverlay: "rgba(0, 0, 0, 0.8)",
    bgDisabled: "#1a1a1a",

    textPrimary: "#ffffff",
    textSecondary: "#e5e5e5",
    textTertiary: "#d0d0d0",
    textMuted: "#cccccc",
    textInverse: "#000000",
    textDisabled: "#999999",
    textHint: "#cccccc",

    borderPrimary: "#ffffff",
    borderSecondary: "#ffffff",
    borderFocus: "#ffff00",
    borderDivider: "#ffffff",
    borderDisabled: "#666666",

    accent: "#00ffff",
    accentHover: "#00cccc",
    accentActive: "#009999",
    accentMuted: "#003333",

    success: "#00ff00",
    successHover: "#00cc00",
    successBg: "#001a00",
    successBgLight: "#003300",

    warning: "#ffff00",
    warningHover: "#cccc00",
    warningBg: "#333300",
    warningBgLight: "#666600",

    error: "#ff0000",
    errorHover: "#cc0000",
    errorBg: "#330000",
    errorBgLight: "#660000",

    info: "#00ffff",
    infoHover: "#00cccc",
    infoBg: "#003333",
    infoBgLight: "#006666",

    editorBg: "#000000",
    editorLineNumber: "#ffffff",
    editorLineNumberActive: "#ffff00",
    editorSelection: "#ffff00",
    editorCursor: "#ffffff",
    editorGutter: "#1a1a1a",
    editorFold: "#ffffff",

    syntaxKeyword: "#ffff00",
    syntaxString: "#00ff00",
    syntaxNumber: "#ff00ff",
    syntaxComment: "#cccccc",
    syntaxFunction: "#00ffff",
    syntaxVariable: "#ffffff",
    syntaxType: "#ff9900",
    syntaxOperator: "#ff0000",
    syntaxPunctuation: "#ffffff",
    syntaxProperty: "#00ffff",
    syntaxTag: "#ffff00",

    chatUserBg: "#003366",
    chatUserText: "#ffffff",
    chatAssistantBg: "#1a1a1a",
    chatAssistantText: "#ffffff",
    chatSystemBg: "#333333",
    chatSystemText: "#ffffff",

    inputBg: "#1a1a1a",
    inputBorder: "#ffffff",
    inputFocus: "#ffff00",
    buttonBg: "#00ffff",
    buttonText: "#000000",
    scrollbar: "#ffffff",
    scrollbarHover: "#ffff00",
  },
};

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = "light" | "dark" | "auto" | "high-contrast";
export type EffectiveTheme = "light" | "dark" | "high-contrast";

// ============================================================================
// THEME STATE INTERFACE
// ============================================================================

interface ThemeState {
  mode: ThemeMode;
  tokens: ThemeTokens;
  systemPreference: "light" | "dark";
  accentColor: string;
  isInitialized: boolean;

  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  setSystemPreference: (preference: "light" | "dark") => void;
  getEffectiveTheme: () => EffectiveTheme;
  initialize: () => void;
}

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "dark",
      tokens: darkTheme,
      systemPreference: "dark",
      accentColor: colorPalettes.blue[500],
      isInitialized: false,

      setMode: (mode: ThemeMode) => {
        const { systemPreference, accentColor } = get();
        let tokens: ThemeTokens;
        let effectiveTheme: EffectiveTheme;

        if (mode === "high-contrast") {
          tokens = JSON.parse(JSON.stringify(highContrastTheme));
          effectiveTheme = "high-contrast";
        } else if (mode === "auto") {
          tokens = JSON.parse(
            JSON.stringify(
              systemPreference === "dark" ? darkTheme : lightTheme,
            ),
          );
          effectiveTheme = systemPreference;
        } else {
          tokens = JSON.parse(
            JSON.stringify(mode === "dark" ? darkTheme : lightTheme),
          );
          effectiveTheme = mode;
        }

        if (mode !== "high-contrast") {
          tokens.colors.accent = accentColor;
          tokens.colors.accentHover = adjustBrightness(accentColor, -10);
          tokens.colors.accentActive = adjustBrightness(accentColor, -20);
          tokens.colors.buttonBg = accentColor;
          tokens.colors.inputFocus = accentColor;
          tokens.colors.borderFocus = accentColor;
        }

        set({ mode, tokens, isInitialized: true });
        applyThemeToCSSVariables(tokens);
        updateDocumentClasses(mode, effectiveTheme);
      },

      setAccentColor: (color: string) => {
        const { mode } = get();

        if (mode === "high-contrast") {
          return;
        }

        set((state) => {
          const newTokens = JSON.parse(JSON.stringify(state.tokens));
          newTokens.colors.accent = color;
          newTokens.colors.accentHover = adjustBrightness(color, -10);
          newTokens.colors.accentActive = adjustBrightness(color, -20);
          newTokens.colors.buttonBg = color;
          newTokens.colors.inputFocus = color;
          newTokens.colors.borderFocus = color;

          applyThemeToCSSVariables(newTokens);

          return {
            accentColor: color,
            tokens: newTokens,
          };
        });
      },

      setSystemPreference: (preference: "light" | "dark") => {
        const { mode } = get();

        set({ systemPreference: preference });

        if (mode === "auto") {
          get().setMode("auto");
        }
      },

      getEffectiveTheme: (): EffectiveTheme => {
        const { mode, systemPreference } = get();

        if (mode === "high-contrast") {
          return "high-contrast";
        }

        if (mode === "auto") {
          return systemPreference;
        }

        return mode;
      },

      initialize: () => {
        const { mode } = get();
        get().setMode(mode);
      },
    }),
    {
      name: "gstudio-theme-v2",
      partialize: (state) => ({
        mode: state.mode,
        accentColor: state.accentColor,
      }),
      version: 1,
    },
  ),
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function adjustBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

function applyThemeToCSSVariables(tokens: ThemeTokens) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  Object.entries(tokens.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${kebabCase(key)}`, value);
  });

  Object.entries(tokens.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });

  root.style.setProperty("--font-sans", tokens.typography.fontFamilySans);
  root.style.setProperty("--font-mono", tokens.typography.fontFamilyMono);
  root.style.setProperty("--font-display", tokens.typography.fontFamilyDisplay);

  Object.entries(tokens.typography).forEach(([key, value]) => {
    if (
      key.startsWith("fontSize") ||
      key.startsWith("fontWeight") ||
      key.startsWith("lineHeight")
    ) {
      root.style.setProperty(`--${kebabCase(key)}`, value.toString());
    }
  });

  Object.entries(tokens.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });

  Object.entries(tokens.radius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  Object.entries(tokens.animation).forEach(([key, value]) => {
    root.style.setProperty(`--animation-${kebabCase(key)}`, value);
  });

  Object.entries(tokens.breakpoints).forEach(([key, value]) => {
    root.style.setProperty(`--breakpoint-${key}`, value);
  });

  Object.entries(tokens.zIndex).forEach(([key, value]) => {
    root.style.setProperty(`--z-${kebabCase(key)}`, value);
  });
}

function updateDocumentClasses(
  mode: ThemeMode,
  effectiveTheme: EffectiveTheme,
) {
  if (typeof document === "undefined") return;

  const classList = document.documentElement.classList;

  classList.remove("light", "dark", "high-contrast", "auto");
  classList.add(effectiveTheme);

  if (mode === "auto") {
    classList.add("auto");
  }

  document.documentElement.setAttribute("data-theme", effectiveTheme);
  document.documentElement.setAttribute("data-theme-mode", mode);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeThemeSystem() {
  if (typeof window === "undefined") return;

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const systemPref = mediaQuery.matches ? "dark" : "light";

  useThemeStore.setState({ systemPreference: systemPref });

  const handleChange = (e: MediaQueryListEvent) => {
    const newPref = e.matches ? "dark" : "light";
    useThemeStore.getState().setSystemPreference(newPref);
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handleChange);
  } else {
    (mediaQuery as any).addListener(handleChange);
  }

  useThemeStore.getState().initialize();

  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener("change", handleChange);
    } else {
      (mediaQuery as any).removeListener(handleChange);
    }
  };
}

// ============================================================================
// HOOKS
// ============================================================================

export function useTheme() {
  const { tokens, mode, setMode, getEffectiveTheme } = useThemeStore();
  return {
    tokens,
    mode,
    setMode,
    effectiveTheme: getEffectiveTheme(),
  };
}

export function useColors() {
  return useThemeStore((state) => state.tokens.colors);
}

export function useSpacing() {
  return useThemeStore((state) => state.tokens.spacing);
}

export function useTypography() {
  return useThemeStore((state) => state.tokens.typography);
}

export function useAnimation() {
  return useThemeStore((state) => state.tokens.animation);
}

export function useIsDarkMode() {
  const theme = useThemeStore((state) => state.getEffectiveTheme());
  return theme === "dark" || theme === "high-contrast";
}

export function useIsHighContrast() {
  return useThemeStore(
    (state) => state.getEffectiveTheme() === "high-contrast",
  );
}

export function useThemeMode() {
  const { mode, setMode } = useThemeStore();
  return { mode, setMode };
}

export function useAccentColor() {
  const { accentColor, setAccentColor } = useThemeStore();
  return { accentColor, setAccentColor };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { darkTheme, lightTheme, highContrastTheme, colorPalettes };

export default useThemeStore;
