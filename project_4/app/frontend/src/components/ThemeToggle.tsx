/**
 * Theme toggle component for switching between light, dark, and system themes.
 *
 * Displays a dropdown selector with three options:
 * - Light: Sun icon - Force light mode
 * - Dark: Moon icon - Force dark mode
 * - System: Monitor icon - Follow OS preference
 *
 * Uses shadcn/ui Select component for accessible dropdown.
 * Persists theme preference via ThemeProvider context.
 */

import { Monitor, Moon, Sun } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logger } from "@/lib/logger";
import { useTheme } from "@/lib/theme-provider";
import type { Theme } from "@/types/theme";

/**
 * Theme option configuration for dropdown items.
 */
interface ThemeOption {
  /** Theme value */
  value: Theme;
  /** Display label */
  label: string;
  /** Icon component to render */
  icon: typeof Sun;
}

/** Available theme options with their icons and labels */
const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Get the icon component for the current theme.
 *
 * @param theme - Current theme value
 * @returns The icon component to render
 */
function getThemeIcon(theme: Theme): typeof Sun {
  const option = THEME_OPTIONS.find((opt) => opt.value === theme);
  return option?.icon ?? Monitor;
}

/**
 * Theme toggle dropdown component.
 *
 * Renders a Select dropdown with theme options.
 * Each option displays an icon and label.
 * Current theme is shown in the trigger button.
 *
 * Accessibility:
 * - Keyboard navigable (Tab, Enter, Arrow keys, Esc)
 * - Screen reader friendly with aria-label
 * - Focus indicators for visibility
 *
 * @example
 * ```tsx
 * // In your header component
 * import { ThemeToggle } from "@/components/ThemeToggle";
 *
 * function Header() {
 *   return (
 *     <header>
 *       <h1>My App</h1>
 *       <ThemeToggle />
 *     </header>
 *   );
 * }
 * ```
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const CurrentIcon = getThemeIcon(theme);

  /**
   * Handle theme selection change.
   */
  function handleThemeChange(newTheme: string): void {
    if (newTheme === "light" || newTheme === "dark" || newTheme === "system") {
      logger.info("theme_toggle_clicked", {
        selected_theme: newTheme,
        previous_theme: theme,
      });

      setTheme(newTheme);
    }
  }

  return (
    <Select value={theme} onValueChange={handleThemeChange}>
      <SelectTrigger className="w-[140px]" aria-label="Theme switcher">
        <SelectValue>
          <span className="flex items-center gap-2">
            <CurrentIcon className="size-4" />
            <span>{THEME_OPTIONS.find((opt) => opt.value === theme)?.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                <Icon className="size-4" />
                <span>{option.label}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
