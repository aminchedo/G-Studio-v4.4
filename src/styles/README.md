# G Studio – `src/styles` folder

This folder is the single place for design tokens, theme, and shared animation/utility styles. **Do not** define theme colors in `index.css`; keep them here so there’s no gap between tokens and the rest of the app.

## Files and roles

| File                  | Purpose                                                                                                                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **design-tokens.css** | Spacing, typography scale, radius, shadows, semantic color scales (e.g. `--color-primary-500`). No theme-specific surface colors.                                                                                                                                       |
| **theme-gemini.css**  | **Theme colors only.** Default dark palette (Gemini Studio look), plus `[data-theme="light"]` overrides. Defines both `--color-*` and bridge tokens (`--bg-primary`, `--accent-primary`, etc.) so `App.tsx`, `animations.css`, and `index.css` all use the same values. |
| **animations.css**    | Keyframes and animation/transition utility classes. Uses `--bg-primary`, `--accent-primary`, etc.; those come from `theme-gemini.css`.                                                                                                                                  |
| **welcome.css**       | Welcome screen–specific styles and effects.                                                                                                                                                                                                                             |

## Load order (in `index.css`)

1. `design-tokens.css`
2. `theme-gemini.css`
3. `animations.css`
4. `@tailwind base/components/utilities`
5. Rest of `index.css` (fonts, body, scrollbar, component utilities).

## Adding new theme-aware styles

- Use **CSS variables** from `theme-gemini.css` (e.g. `var(--color-surface)`, `var(--accent-primary)`), or Tailwind classes that use the same palette.
- Do **not** introduce new token names (e.g. `--bg-foo`) without adding them in `theme-gemini.css` for both default and `[data-theme="light"]`, or some parts of the app will look unstyled.
