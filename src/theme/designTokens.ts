/**
 * G Studio v2.3.0 – Design Tokens
 * Single source of truth for visual consistency
 * بازنویسی شده برای بهینه‌سازی و تکمیل
 */

// ============================================================================
// TYPES
// ============================================================================

export type ThemeVariant = 'light' | 'dark' | 'high-contrast';

export type ColorScale = {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500?: string;
  600?: string;
  700?: string;
  800?: string;
  900?: string;
  950?: string;
};

// ============================================================================
// COLOR PALETTES (Base Colors)
// ============================================================================

const colorPalettes = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  emerald: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#145231',
    950: '#052e16',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#4f0713',
  },
  cyan: {
    50: '#ecf0ff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#082f49',
  },
  violet: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3f0f5c',
  },
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#0d3331',
  },
};

// ============================================================================
// DESIGN TOKENS
// ============================================================================

export const designTokens = {
  colors: {
    dark: {
      // Background
      bg: {
        primary: colorPalettes.slate[900],      // '#0f172a'
        secondary: colorPalettes.slate[800],    // '#1e293b'
        tertiary: colorPalettes.slate[700],     // '#334155'
        elevated: colorPalettes.slate[800],     // '#1e293b'
        hover: colorPalettes.slate[700],        // '#334155'
        active: colorPalettes.slate[600],       // '#475569'
        overlay: 'rgba(15, 23, 42, 0.6)',
        disabled: colorPalettes.slate[800],
      },

      // Text
      text: {
        primary: colorPalettes.slate[50],       // '#f8fafc'
        secondary: colorPalettes.slate[300],    // '#cbd5e1'
        muted: colorPalettes.slate[400],        // '#94a3b8'
        inverse: colorPalettes.slate[900],      // '#0f172a'
        disabled: colorPalettes.slate[500],
        hint: colorPalettes.slate[400],
      },

      // Border
      border: {
        primary: colorPalettes.slate[700],      // '#334155'
        secondary: colorPalettes.slate[600],    // '#475569'
        focus: colorPalettes.blue[500],         // '#3b82f6'
        divider: colorPalettes.slate[700],
        disabled: colorPalettes.slate[800],
      },

      // Accent Colors
      accent: {
        primary: colorPalettes.blue[500],       // '#3b82f6'
        primaryHover: colorPalettes.blue[600],  // '#2563eb'
        primaryActive: colorPalettes.blue[700], // '#1d4ed8'
        success: colorPalettes.emerald[500],    // '#22c55e'
        successHover: colorPalettes.emerald[600],
        warning: colorPalettes.amber[500],      // '#f59e0b'
        warningHover: colorPalettes.amber[600],
        error: colorPalettes.red[500],          // '#ef4444'
        errorHover: colorPalettes.red[600],
        info: colorPalettes.cyan[500],          // '#06b6d4'
        infoHover: colorPalettes.cyan[600],
      },

      // Syntax Highlighting
      syntax: {
        keyword: colorPalettes.violet[400],     // '#c084fc'
        string: colorPalettes.emerald[400],     // '#86efac'
        number: colorPalettes.amber[300],       // '#fcd34d'
        comment: colorPalettes.slate[600],      // '#64748b'
        function: colorPalettes.blue[400],      // '#60a5fa'
        variable: colorPalettes.slate[50],      // '#f8fafc'
        type: colorPalettes.teal[400],          // '#2dd4bf'
        operator: colorPalettes.red[400],       // '#f472b6'
        punctuation: colorPalettes.slate[400],
        property: colorPalettes.blue[300],
        tag: colorPalettes.violet[300],
      },
    },

    light: {
      // Background
      bg: {
        primary: colorPalettes.slate[50],       // '#ffffff' (nearly white)
        secondary: colorPalettes.slate[100],    // '#f8fafc'
        tertiary: colorPalettes.slate[200],     // '#f1f5f9'
        elevated: colorPalettes.slate[50],      // '#ffffff'
        hover: colorPalettes.slate[200],        // '#f1f5f9'
        active: colorPalettes.slate[300],       // '#e2e8f0'
        overlay: 'rgba(15, 23, 42, 0.4)',
        disabled: colorPalettes.slate[100],
      },

      // Text
      text: {
        primary: colorPalettes.slate[900],      // '#0f172a'
        secondary: colorPalettes.slate[600],    // '#475569'
        muted: colorPalettes.slate[500],        // '#64748b'
        inverse: colorPalettes.slate[50],       // '#ffffff'
        disabled: colorPalettes.slate[400],
        hint: colorPalettes.slate[500],
      },

      // Border
      border: {
        primary: colorPalettes.slate[300],      // '#e2e8f0'
        secondary: colorPalettes.slate[400],    // '#cbd5e1'
        focus: colorPalettes.blue[600],         // '#2563eb'
        divider: colorPalettes.slate[200],
        disabled: colorPalettes.slate[200],
      },

      // Accent Colors
      accent: {
        primary: colorPalettes.blue[600],       // '#2563eb'
        primaryHover: colorPalettes.blue[700],  // '#1d4ed8'
        primaryActive: colorPalettes.blue[800], // '#1e40af'
        success: colorPalettes.emerald[600],    // '#16a34a'
        successHover: colorPalettes.emerald[700],
        warning: colorPalettes.amber[600],      // '#d97706'
        warningHover: colorPalettes.amber[700],
        error: colorPalettes.red[600],          // '#dc2626'
        errorHover: colorPalettes.red[700],
        info: colorPalettes.cyan[600],          // '#0891b2'
        infoHover: colorPalettes.cyan[700],
      },

      // Syntax Highlighting
      syntax: {
        keyword: colorPalettes.violet[600],     // '#7c3aed'
        string: colorPalettes.emerald[600],     // '#16a34a'
        number: colorPalettes.amber[600],       // '#d97706'
        comment: colorPalettes.slate[400],      // '#94a3b8'
        function: colorPalettes.blue[600],      // '#2563eb'
        variable: colorPalettes.slate[900],     // '#0f172a'
        type: colorPalettes.teal[600],          // '#0d9488'
        operator: colorPalettes.red[600],       // '#db2777'
        punctuation: colorPalettes.slate[600],
        property: colorPalettes.blue[600],
        tag: colorPalettes.violet[600],
      },
    },

    'high-contrast': {
      // Background
      bg: {
        primary: '#000000',
        secondary: '#1a1a1a',
        tertiary: '#333333',
        elevated: '#1a1a1a',
        hover: '#444444',
        active: '#555555',
        overlay: 'rgba(0, 0, 0, 0.8)',
        disabled: '#1a1a1a',
      },

      // Text
      text: {
        primary: '#ffffff',
        secondary: '#e5e5e5',
        muted: '#cccccc',
        inverse: '#000000',
        disabled: '#999999',
        hint: '#cccccc',
      },

      // Border
      border: {
        primary: '#ffffff',
        secondary: '#ffffff',
        focus: '#ffff00',
        divider: '#ffffff',
        disabled: '#666666',
      },

      // Accent Colors
      accent: {
        primary: '#00ffff',
        primaryHover: '#00cccc',
        primaryActive: '#009999',
        success: '#00ff00',
        successHover: '#00cc00',
        warning: '#ffff00',
        warningHover: '#cccc00',
        error: '#ff0000',
        errorHover: '#cc0000',
        info: '#00ffff',
        infoHover: '#00cccc',
      },

      // Syntax Highlighting
      syntax: {
        keyword: '#ffff00',
        string: '#00ff00',
        number: '#ff00ff',
        comment: '#cccccc',
        function: '#00ffff',
        variable: '#ffffff',
        type: '#ff9900',
        operator: '#ff0000',
        punctuation: '#ffffff',
        property: '#00ffff',
        tag: '#ffff00',
      },
    },
  },

  // ============================================================================
  // SPACING SCALE (8px base)
  // ============================================================================
  spacing: {
    0: '0',
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
    '4xl': '6rem',   // 96px
  },

  // ============================================================================
  // BORDER RADIUS
  // ============================================================================
  radius: {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },

  // ============================================================================
  // TYPOGRAPHY
  // ============================================================================
  typography: {
    fontFamily: {
      sans: `'Inter','Vazir',system-ui,-apple-system,'Segoe UI',sans-serif`,
      mono: `'JetBrains Mono','Fira Code','Courier New',monospace`,
      display: `'Inter','Vazir',system-ui,sans-serif`,
    },
    size: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      md: '1rem',      // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    weight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },

  // ============================================================================
  // SHADOWS
  // ============================================================================
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgb(0 0 0 / 0.05)',
    md: '0 4px 6px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px rgb(0 0 0 / 0.15)',
    xl: '0 20px 25px rgb(0 0 0 / 0.2)',
    inner: 'inset 0 2px 4px rgb(0 0 0 / 0.05)',
  },

  // ============================================================================
  // MOTION / ANIMATION
  // ============================================================================
  motion: {
    duration: {
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },

  // ============================================================================
  // BREAKPOINTS (Responsive Design)
  // ============================================================================
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ============================================================================
  // Z-INDEX SCALE
  // ============================================================================
  zIndex: {
    hide: '-1',
    base: '0',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    backdrop: '1040',
    offcanvas: '1050',
    modal: '1060',
    popover: '1070',
    tooltip: '1080',
  },

  // ============================================================================
  // SEMANTIC TOKENS (Context-aware)
  // ============================================================================
  semantic: {
    dark: {
      bg: {
        default: colorPalettes.slate[900],
        surface: colorPalettes.slate[800],
        interactive: colorPalettes.slate[700],
        interactive_hover: colorPalettes.slate[600],
        interactive_active: colorPalettes.slate[500],
        success: colorPalettes.emerald[900],
        warning: colorPalettes.amber[900],
        error: colorPalettes.red[900],
        info: colorPalettes.cyan[900],
      },
      text: {
        default: colorPalettes.slate[50],
        secondary: colorPalettes.slate[300],
        tertiary: colorPalettes.slate[400],
        success: colorPalettes.emerald[400],
        warning: colorPalettes.amber[400],
        error: colorPalettes.red[400],
        info: colorPalettes.cyan[400],
      },
    },
    light: {
      bg: {
        default: colorPalettes.slate[50],
        surface: colorPalettes.slate[100],
        interactive: colorPalettes.slate[200],
        interactive_hover: colorPalettes.slate[300],
        interactive_active: colorPalettes.slate[400],
        success: colorPalettes.emerald[50],
        warning: colorPalettes.amber[50],
        error: colorPalettes.red[50],
        info: colorPalettes.cyan[50],
      },
      text: {
        default: colorPalettes.slate[900],
        secondary: colorPalettes.slate[600],
        tertiary: colorPalettes.slate[500],
        success: colorPalettes.emerald[700],
        warning: colorPalettes.amber[700],
        error: colorPalettes.red[700],
        info: colorPalettes.cyan[700],
      },
    },
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DesignTokens = typeof designTokens;
export type ColorPalette = typeof colorPalettes;

/**
 * Helper type for accessing theme colors
 * Usage: ColorToken<'dark', 'accent', 'primary'>
 */
export type ColorToken<
  V extends ThemeVariant = ThemeVariant,
  K extends keyof (typeof designTokens.colors.dark) = keyof (typeof designTokens.colors.dark),
  S extends keyof (typeof designTokens.colors.dark[K]) = keyof (typeof designTokens.colors.dark[K]),
> = (typeof designTokens.colors)[V][K][S];

/**
 * Utility function to get color by theme
 */
export const getThemeColor = (
  variant: ThemeVariant,
  category: keyof (typeof designTokens.colors.dark),
  key: string,
): string => {
  const colors = designTokens.colors[variant];
  const categoryColors = colors[category as keyof typeof colors] as Record<string, string>;
  return categoryColors?.[key] ?? '#000000';
};

/**
 * Utility function to get semantic token
 */
export const getSemanticToken = (
  variant: ThemeVariant,
  context: 'bg' | 'text',
  type: string,
): string => {
  const semantic = designTokens.semantic[variant];
  const contextTokens = semantic[context as keyof typeof semantic] as Record<string, string>;
  return contextTokens?.[type] ?? '#000000';
};