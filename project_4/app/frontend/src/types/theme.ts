/**
 * Theme types for dark mode toggle functionality.
 *
 * Defines the theme system with three options:
 * - "light": Force light mode
 * - "dark": Force dark mode
 * - "system": Follow OS preference (prefers-color-scheme)
 *
 * Used by ThemeProvider and ThemeToggle components.
 */

/**
 * Theme options: light, dark, or system (follows OS preference).
 *
 * - "light": Always use light theme
 * - "dark": Always use dark theme
 * - "system": Automatically match OS/browser preference
 */
export type Theme = "light" | "dark" | "system";

/**
 * Resolved theme after system preference is applied.
 *
 * When Theme is "system", it resolves to either "light" or "dark"
 * based on the user's OS preference (prefers-color-scheme media query).
 */
export type ResolvedTheme = "light" | "dark";

/**
 * Theme context value with current theme and setter function.
 *
 * Provides access to:
 * - theme: The user's selected preference ("light", "dark", or "system")
 * - setTheme: Function to change the theme preference
 * - effectiveTheme: The resolved theme after system preference is applied
 *
 * Example usage:
 * ```typescript
 * const { theme, setTheme, effectiveTheme } = useTheme();
 *
 * // Check current preference
 * console.log(theme); // "system"
 *
 * // Check actual applied theme
 * console.log(effectiveTheme); // "dark" (if OS prefers dark)
 *
 * // Change theme
 * setTheme("light");
 * ```
 */
export interface ThemeContextValue {
  /** Current theme preference (light, dark, or system) */
  theme: Theme;

  /** Function to update the theme preference */
  setTheme: (theme: Theme) => void;

  /** Resolved theme after system preference is applied (light or dark) */
  effectiveTheme: ResolvedTheme;
}
