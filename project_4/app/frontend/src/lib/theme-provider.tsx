/**
 * Theme provider for dark mode management.
 *
 * Provides theme context with:
 * - Persistence to localStorage (key: "product-catalog-theme")
 * - System theme detection via prefers-color-scheme
 * - .dark class management on document root
 *
 * Usage:
 * ```tsx
 * // In App.tsx
 * import { ThemeProvider } from "@/lib/theme-provider";
 *
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 *
 * // In components
 * import { useTheme } from "@/lib/theme-provider";
 *
 * function ThemeToggle() {
 *   const { theme, setTheme, effectiveTheme } = useTheme();
 *   // ...
 * }
 * ```
 */

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import type { ResolvedTheme, Theme, ThemeContextValue } from "@/types/theme";

/** localStorage key for persisting theme preference */
const THEME_STORAGE_KEY = "product-catalog-theme";

/** Default theme when no preference is stored */
const DEFAULT_THEME: Theme = "system";

/** Theme context - undefined when used outside provider */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Props for ThemeProvider component.
 */
interface ThemeProviderProps {
  /** Child components that will have access to theme context */
  children: ReactNode;
}

/**
 * Get the system's preferred color scheme.
 *
 * Uses window.matchMedia to detect OS preference.
 * Returns "dark" if prefers-color-scheme: dark, otherwise "light".
 *
 * @returns The system's preferred theme ("light" or "dark")
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Resolve the effective theme from user preference.
 *
 * If theme is "system", returns the OS preference.
 * Otherwise returns the theme directly.
 *
 * @param theme - User's theme preference
 * @returns The resolved theme to apply
 */
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Get initial theme from localStorage or default.
 *
 * Validates stored value is a valid Theme type.
 *
 * @returns The initial theme preference
 */
function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);

  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return DEFAULT_THEME;
}

/**
 * Apply theme to document by toggling .dark class.
 *
 * Adds .dark class to document.documentElement when effectiveTheme is "dark".
 * Removes .dark class when effectiveTheme is "light".
 *
 * @param effectiveTheme - The resolved theme to apply
 */
function applyThemeToDocument(effectiveTheme: ResolvedTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  if (effectiveTheme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

/**
 * Theme provider component.
 *
 * Wraps children with theme context, providing:
 * - Current theme preference
 * - Theme setter function
 * - Resolved effective theme
 *
 * Handles:
 * - localStorage persistence
 * - System theme detection and changes
 * - .dark class management on document root
 *
 * @param children - Child components to wrap
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize theme from localStorage (or default)
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  // Track the effective (resolved) theme
  const [effectiveTheme, setEffectiveTheme] = useState<ResolvedTheme>(() => resolveTheme(getStoredTheme()));

  /**
   * Update theme preference and persist to localStorage.
   */
  function setTheme(newTheme: Theme): void {
    const previousTheme = theme;

    // Update state
    setThemeState(newTheme);

    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }

    logger.info("theme_changed", {
      previous_theme: previousTheme,
      new_theme: newTheme,
      persisted: true,
    });
  }

  // Apply theme changes to document and track effective theme
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setEffectiveTheme(resolved);
    applyThemeToDocument(resolved);

    logger.info("theme_initialized", {
      theme,
      effective_theme: resolved,
    });
  }, [theme]);

  // Listen for system theme changes when theme is "system"
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemThemeChange(event: MediaQueryListEvent): void {
      const systemPrefersDark = event.matches;

      logger.info("system_theme_detected", {
        system_prefers_dark: systemPrefersDark,
      });

      // Only update if user preference is "system"
      if (theme === "system") {
        const newEffective: ResolvedTheme = systemPrefersDark ? "dark" : "light";
        setEffectiveTheme(newEffective);
        applyThemeToDocument(newEffective);
      }
    }

    // Add listener for system theme changes
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    // Cleanup listener on unmount or theme change
    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme]);

  const contextValue: ThemeContextValue = {
    theme,
    setTheme,
    effectiveTheme,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context.
 *
 * Must be used within a ThemeProvider.
 * Throws an error if used outside provider.
 *
 * @returns Theme context value with theme, setTheme, and effectiveTheme
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, setTheme, effectiveTheme } = useTheme();
 *
 *   return (
 *     <button onClick={() => setTheme("dark")}>
 *       Current: {effectiveTheme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
