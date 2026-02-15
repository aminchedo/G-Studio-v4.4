/**
 * Phase 4 — Dynamic Theming & Runtime Skinning
 * Single source of truth for theme; all components rely on CSS variables
 * so theme changes are automatic via data-theme attribute.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeId = "dark" | "light" | string;

export interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const STORAGE_KEY = "gstudio-theme";

function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  const value = theme === "dark" ? "dark" : theme === "light" ? "light" : theme;
  root.setAttribute("data-theme", value);
  root.classList.toggle("dark", value === "dark");
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    },
  ),
);

export const useTheme = () => useThemeStore((s) => s.theme);
export const useSetTheme = () => useThemeStore((s) => s.setTheme);
export const useIsDarkMode = () => useThemeStore((s) => s.theme === "dark");

// Apply default theme on load so first paint is correct before rehydration
if (typeof document !== "undefined") {
  applyTheme("dark");
}
