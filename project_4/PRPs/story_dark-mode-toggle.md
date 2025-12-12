---
name: "Dark Mode Toggle - Theme Switcher Implementation"
description: "Add theme switcher (light/dark/system) with localStorage persistence and Tailwind dark mode support"
---

## Original Story

```
Dark Mode Toggle
Theme switcher (light/dark/system). Persist preference to localStorage. Update Tailwind config for dark variants across all components.
```

## Story Metadata

**Story Type**: Feature (Frontend)
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- Frontend: `src/lib/`, `src/components/`, `src/App.tsx`, `styles/globals.css`

---

## CONTEXT REFERENCES

### Existing Dark Mode Infrastructure

- `styles/globals.css` - **Already has `.dark` class CSS variables defined** (lines 43-76)
- `styles/globals.css` - **Dark mode custom variant already configured**: `@custom-variant dark (&:is(.dark *));` (line 5)
- `src/components/ProductCard.tsx` - Example of dark mode usage: `dark:bg-blue-900 dark:text-blue-200`
- `src/components/ui/button.tsx` - Example of dark mode in components: `dark:ring-ring/20 dark:outline-ring/40`
- `src/index.html` - Root HTML element where `.dark` class will be applied

### Component Patterns

- `src/components/ui/button.tsx` - shadcn/ui button component pattern with variants
- `src/components/ui/select.tsx` - Radix UI dropdown pattern for theme selector
- `src/lib/logger.ts` - StructuredLogger for consistent logging
- `src/lib/utils.ts` - Utility functions (cn for classNames)
- `src/App.tsx` - Top-level component for theme provider integration

### TypeScript Patterns

- `src/types/product.ts` - Type definition pattern to follow
- `src/types/error.ts` - Error handling pattern
- All components use explicit Props interfaces with JSDoc comments

### Storage and State

- localStorage available in browser for theme persistence
- React Context pattern for global state management
- Hook pattern for consuming context (useContext)

### Icon Library

- `lucide-react` already installed in package.json (line 29)
- Use Moon, Sun, Monitor icons for theme toggle

### Critical Tailwind 4.0 Configuration

- Tailwind 4.0 uses `@custom-variant dark (&:is(.dark *));` (NOT `darkMode: 'class'`)
- Dark mode activated by `.dark` class on root element (class-based strategy)
- CSS variables already defined for both light and dark themes
- All components use Tailwind's semantic color tokens (background, foreground, etc.)

---

## IMPLEMENTATION TASKS

### Phase 1: Theme Management Infrastructure

#### TASK 1.1: CREATE src/types/theme.ts

- CREATE: TypeScript type definitions for theme system
- TYPES:
  ```typescript
  /** Theme options: light, dark, or system (follows OS preference) */
  export type Theme = "light" | "dark" | "system";

  /** Theme context value with current theme and setter function */
  export interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    effectiveTheme: "light" | "dark"; // Resolved theme (system -> light/dark)
  }
  ```
- IMPORTS: None required (pure type definitions)
- PATTERN: Follow `src/types/product.ts` structure with JSDoc comments
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bunx tsc --noEmit`

#### TASK 1.2: CREATE src/lib/theme-provider.tsx

- CREATE: React Context provider for theme management
- IMPLEMENT: ThemeProvider component with:
  - localStorage persistence key: `"product-catalog-theme"`
  - System theme detection via `window.matchMedia("(prefers-color-scheme: dark)")`
  - Effect to apply `.dark` class to `document.documentElement`
  - Event listener for system theme changes
  - Initial theme from localStorage or default to "system"
- IMPORTS:
  ```typescript
  import { createContext, useContext, useEffect, useState } from "react";
  import type { Theme, ThemeContextValue } from "@/types/theme";
  import { logger } from "@/lib/logger";
  ```
- PATTERN: Follow React Context best practices with custom hook `useTheme()`
- LOGGING:
  ```typescript
  logger.info("theme_initialized", { theme, effective_theme: effectiveTheme });
  logger.info("theme_changed", { previous_theme, new_theme, persisted: true });
  logger.info("system_theme_detected", { system_prefers_dark: boolean });
  ```
- GOTCHA: Must handle SSR-safe initialization (check `typeof window !== "undefined"`)
- GOTCHA: Remove `.dark` class when theme is "light", add when "dark" or system is dark
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bunx tsc --noEmit`

#### TASK 1.3: CREATE src/components/ThemeToggle.tsx

- CREATE: Theme toggle dropdown component using shadcn/ui Select
- IMPLEMENT: ThemeToggle component with:
  - Three theme options: Light (Sun icon), Dark (Moon icon), System (Monitor icon)
  - Use `lucide-react` icons: `Sun`, `Moon`, `Monitor`
  - shadcn/ui Select component for dropdown
  - Display current theme with appropriate icon
  - Accessible labels and ARIA attributes
- IMPORTS:
  ```typescript
  import { Moon, Sun, Monitor } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { useTheme } from "@/lib/theme-provider";
  import { logger } from "@/lib/logger";
  ```
- PATTERN: Follow `src/components/ProductFilters.tsx` component structure
- STYLING:
  - Use Tailwind semantic colors (background, foreground, etc.)
  - Ensure contrast in both light and dark modes
  - Add hover states: `hover:bg-accent hover:text-accent-foreground`
- LOGGING:
  ```typescript
  logger.info("theme_toggle_clicked", { selected_theme: theme });
  ```
- ACCESSIBILITY:
  - Add `aria-label="Theme switcher"` to select
  - Use semantic `<select>` element via Radix UI
  - Keyboard navigation support (built into Radix)
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bunx tsc --noEmit && bun run check`

### Phase 2: Integration

#### TASK 2.1: UPDATE src/App.tsx - Wrap with ThemeProvider

- FIND: `export function App()` component definition
- WRAP: Entire component return with `<ThemeProvider>`
- IMPORTS:
  ```typescript
  import { ThemeProvider } from "@/lib/theme-provider";
  ```
- PATTERN: Provider wraps at top level, before existing `<div className="min-h-screen">`
- STRUCTURE:
  ```typescript
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        {/* existing content */}
      </div>
    </ThemeProvider>
  );
  ```
- GOTCHA: Ensure all existing children remain unchanged
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bunx tsc --noEmit`

#### TASK 2.2: UPDATE src/App.tsx - Add ThemeToggle to header

- FIND: `<header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">`
- ADD: ThemeToggle component to header, positioned to the right
- IMPORTS:
  ```typescript
  import { ThemeToggle } from "@/components/ThemeToggle";
  ```
- STRUCTURE:
  ```typescript
  <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground mt-1">
            {/* existing subtitle */}
          </p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  </header>
  ```
- PATTERN: Use flexbox for header layout with space-between
- GOTCHA: Ensure existing header content moves into left div
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bunx tsc --noEmit && bun run check`

### Phase 3: Dark Mode Enhancements

#### TASK 3.1: AUDIT existing components for dark mode support

- REVIEW: All components in `src/components/` for dark mode class usage
- COMPONENTS TO CHECK:
  - `ProductCard.tsx` - Already has dark variants (verified)
  - `ProductGrid.tsx` - Check loading/empty states
  - `ProductFilters.tsx` - Check form inputs
  - `ui/button.tsx` - Already has dark variants (verified)
  - `ui/card.tsx` - Check card backgrounds
  - `ui/input.tsx` - Check input borders
  - `ui/select.tsx` - Check dropdown styling
- PATTERN: All color classes should have dark: variants where needed
- EXAMPLE: `text-gray-600 dark:text-gray-400`, `bg-white dark:bg-gray-900`
- **VALIDATE**: Manual visual testing in browser (toggle between light/dark)

#### TASK 3.2: UPDATE components with missing dark mode variants (if needed)

- CONDITIONAL: Only if TASK 3.1 reveals missing dark variants
- PATTERN: Add dark: prefixed classes for:
  - Text colors: `text-{color} dark:text-{color}`
  - Backgrounds: `bg-{color} dark:bg-{color}`
  - Borders: `border-{color} dark:border-{color}`
- PRIORITY: Focus on components that use non-semantic colors
- GOTCHA: Prefer semantic tokens (background, foreground) over hard-coded colors
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

---

## Validation Loop

### Level 1: Type Safety & Linting

```bash
# TypeScript type checking
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bunx tsc --noEmit

# Biome linting and formatting
bun run check:fix

# Expected: Zero errors, all files formatted correctly
```

### Level 2: Build Verification

```bash
# Build the frontend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run build

# Expected: Build succeeds without errors
```

### Level 3: Runtime Testing (Manual)

```bash
# Start development server
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run dev

# Manual test checklist:
# 1. Open http://localhost:3000 in browser
# 2. Verify theme toggle appears in header (top right)
# 3. Click theme toggle - select "Dark" - verify dark mode activates
# 4. Refresh page - verify dark mode persists (localStorage)
# 5. Click theme toggle - select "Light" - verify light mode activates
# 6. Click theme toggle - select "System" - verify follows OS preference
# 7. Open DevTools > Application > Local Storage - verify key "product-catalog-theme"
# 8. Open DevTools > Console - verify structured logs for theme changes
# 9. Test all components in both themes:
#    - Product cards readable in both modes
#    - Filters usable in both modes
#    - Error states visible in both modes
#    - Loading states visible in both modes
# 10. Test keyboard navigation - Tab to theme toggle, Enter to open, Arrow keys to select

# Expected: All UI elements readable and functional in both light and dark modes
```

### Level 4: Accessibility Validation

```bash
# Run Lighthouse accessibility audit in Chrome DevTools
# 1. Open DevTools > Lighthouse tab
# 2. Select "Accessibility" category
# 3. Run audit in both light and dark modes
# 4. Verify score >= 95

# Keyboard navigation test:
# - Tab through all interactive elements
# - Theme toggle should be focusable
# - Enter/Space should activate toggle
# - Arrow keys should navigate options
# - Esc should close dropdown

# Screen reader test (if available):
# - Use VoiceOver (Mac) or NVDA (Windows)
# - Verify theme toggle announces current theme
# - Verify theme options are announced correctly

# Expected: Full keyboard accessibility, clear focus indicators, proper ARIA labels
```

### Level 5: Browser Compatibility

```bash
# Test in multiple browsers:
# 1. Chrome/Edge (Chromium)
# 2. Firefox
# 3. Safari

# Verify for each browser:
# - Theme toggle renders correctly
# - Dark mode activates properly
# - localStorage persistence works
# - System theme detection works

# Expected: Consistent behavior across modern browsers
```

---

## COMPLETION CHECKLIST

- [ ] All TypeScript files created with proper types
- [ ] ThemeProvider implemented with localStorage persistence
- [ ] ThemeToggle component integrated in header
- [ ] System theme detection working (follows OS preference)
- [ ] Dark mode activates/deactivates correctly
- [ ] Theme preference persists across page refreshes
- [ ] All existing components readable in both themes
- [ ] No TypeScript errors (`bunx tsc --noEmit`)
- [ ] No linting errors (`bun run check`)
- [ ] Build succeeds (`bun run build`)
- [ ] Manual testing passed in both light and dark modes
- [ ] Keyboard navigation working
- [ ] Accessible to screen readers
- [ ] Structured logging events present in console
- [ ] Cross-browser compatibility verified

---

## Notes

### Design Decisions

1. **Theme Storage**: Using localStorage with key `"product-catalog-theme"` for persistence
2. **Theme Strategy**: Class-based (`.dark` on document root) to match Tailwind 4.0 configuration
3. **Default Theme**: "system" to respect user OS preference by default
4. **Icon Library**: Using lucide-react (already installed) for theme icons
5. **Component Pattern**: Radix UI Select for dropdown (consistent with existing components)

### Implementation Details

1. **Effective Theme Resolution**:
   - "light" -> light mode (remove .dark class)
   - "dark" -> dark mode (add .dark class)
   - "system" -> detect OS preference and apply accordingly

2. **System Theme Detection**:
   ```typescript
   const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
   const systemTheme = mediaQuery.matches ? "dark" : "light";
   ```

3. **Class Application**:
   ```typescript
   if (effectiveTheme === "dark") {
     document.documentElement.classList.add("dark");
   } else {
     document.documentElement.classList.remove("dark");
   }
   ```

4. **Logging Events**:
   - `theme_initialized`: When provider mounts
   - `theme_changed`: When user selects new theme
   - `system_theme_detected`: When system preference is detected
   - `theme_toggle_clicked`: When user interacts with toggle

### Tailwind 4.0 Compatibility

This implementation uses Tailwind 4.0's custom variant syntax:
```css
@custom-variant dark (&:is(.dark *));
```

This is **different** from Tailwind 3.x which used:
```js
// DON'T use this - Tailwind 3.x syntax
darkMode: 'class'
```

The Tailwind 4.0 approach is already configured in `styles/globals.css`, so no additional configuration needed.

### Future Enhancements

- Add transition animations when switching themes
- Add theme preview in dropdown
- Support for additional custom themes
- Sync theme across browser tabs using storage events
