import { useState, useEffect } from "react";

/**
 * Match a media query. Updates on resize.
 * @param query - e.g. "(min-width: 1024px)"
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const m = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    m.addEventListener("change", handler);
    setMatches(m.matches);
    return () => m.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** Desktop: ≥1024px */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

/** Tablet: 768px–1023px */
export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

/** Mobile: ≤767px */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
