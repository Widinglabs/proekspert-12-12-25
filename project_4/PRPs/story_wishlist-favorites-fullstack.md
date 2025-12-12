---
name: "Wishlist/Favorites - Fullstack Implementation"
description: "Backend favorites API + Frontend wishlist UI with localStorage persistence"
---

## Original Story

### TASK: Wishlist / Favorites Feature

```
[FEAT-WISHLIST] Add Wishlist/Favorites Functionality

Users need the ability to save products to a favorites/wishlist for later viewing.
This will help users keep track of products they're interested in purchasing.

Requirements:
- Heart icon on product cards: Add a toggleable heart icon to mark products as favorites
- Persistence: Save favorites to localStorage (frontend-only for now, optional backend later)
- Filter view: Add ability to filter products to show only favorited items
- Visual feedback: Clear indication of favorited vs unfavorited state
- State management: Favorites persist across page refreshes

User flow:
1. User clicks heart icon on a product card
2. Product is added to favorites list (stored in localStorage)
3. Heart icon changes to filled state
4. User can click "Show Favorites" filter to see only favorited products
5. User can click heart again to remove from favorites
6. Favorites persist when user refreshes the page
```

## Story Metadata

**Story Type**: Feature (Fullstack - Frontend Heavy)
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- Frontend: `src/lib/`, `src/components/`, `src/types/`, `src/App.tsx`
- Backend: Optional future enhancement (not required for initial implementation)

---

## CONTEXT REFERENCES

### Frontend References
- `src/types/product.ts` - Product interface, need to work with `product_id` for favorites tracking
- `src/components/ProductCard.tsx` - Add heart icon and favorite toggle functionality
- `src/components/ProductFilters.tsx` - Add "Show Favorites Only" toggle/checkbox
- `src/App.tsx` - State management pattern (useState + useCallback), need to add favorites state
- `src/lib/logger.ts` - Structured logging pattern (snake_case events) for favorites operations
- `src/components/ui/button.tsx` - Button component for heart icon
- `src/lib/utils.ts` - Utility functions (cn for className merging)

### Backend References (Optional Future Enhancement)
- `app/models/product.py` - Product model structure
- `app/services/product_service.py` - Service layer pattern for potential future backend
- `app/api/products.py` - API endpoint pattern for potential favorites endpoint
- `app/core/logging_config.py` - StructuredLogger usage pattern

### Storage Strategy
- **Phase 1 (This PRP)**: Frontend-only with localStorage
- **Phase 2 (Future)**: Optional backend API for user-specific favorites
- localStorage key: `product_favorites` (stores array of product_id numbers)

### Naming Conventions (CRITICAL)
- Frontend state: `favoritedProductIds` (Set<number> for O(1) lookup)
- localStorage key: `product_favorites` (matches product_ prefix convention)
- Event names: `favorite_added`, `favorite_removed`, `favorites_loaded`, `favorites_filter_applied`
- Props: `isFavorited`, `onToggleFavorite` (boolean + callback pattern)

---

## IMPLEMENTATION TASKS

### Phase 1: Frontend - Favorites Storage & Logic

#### TASK 1.1: CREATE src/lib/favorites.ts - Favorites localStorage management

- CREATE: New utility module for favorites persistence
- IMPORTS:
  ```typescript
  import { logger } from "@/lib/logger";
  ```
- CONSTANTS:
  ```typescript
  const FAVORITES_STORAGE_KEY = "product_favorites";
  ```
- IMPLEMENT FUNCTIONS:
  1. `loadFavorites(): Set<number>` - Load favorites from localStorage
     - Parse JSON array from localStorage
     - Convert to Set for O(1) lookup performance
     - Handle parsing errors gracefully
     - Log operation with structured logging
     - Return empty Set if no favorites or parse error
  2. `saveFavorites(favorites: Set<number>): void` - Save to localStorage
     - Convert Set to Array for JSON serialization
     - Use try-catch for quota exceeded errors
     - Log operation with count of favorites
  3. `toggleFavorite(productId: number, currentFavorites: Set<number>): Set<number>` - Toggle helper
     - Create new Set (immutable pattern)
     - Add or remove based on current state
     - Return new Set
- LOGGING PATTERN:
  ```typescript
  logger.info("favorites_loaded", {
    total_favorites: favorites.size,
    operation: "loadFavorites"
  });
  logger.info("favorite_toggled", {
    product_id: productId,
    action: favorites.has(productId) ? "removed" : "added",
    total_favorites: newFavorites.size,
    operation: "toggleFavorite"
  });
  ```
- ERROR HANDLING:
  - Catch JSON.parse errors (corrupted localStorage)
  - Catch localStorage quota exceeded errors
  - Include `fix_suggestion` in error logs
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 1.2: UPDATE src/App.tsx - Add favorites state management

- ADD STATE:
  ```typescript
  const [favoritedProductIds, setFavoritedProductIds] = useState<Set<number>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  ```
- IMPORT ADD:
  ```typescript
  import { loadFavorites, saveFavorites, toggleFavorite } from "@/lib/favorites";
  ```
- ADD useEffect: Load favorites on mount
  ```typescript
  useEffect(() => {
    const favorites = loadFavorites();
    setFavoritedProductIds(favorites);
  }, []);
  ```
- ADD: `handleToggleFavorite` callback
  ```typescript
  const handleToggleFavorite = useCallback((productId: number) => {
    setFavoritedProductIds((currentFavorites) => {
      const newFavorites = toggleFavorite(productId, currentFavorites);
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, []);
  ```
- ADD: `handleShowFavoritesToggle` callback
  ```typescript
  const handleShowFavoritesToggle = useCallback((showFavoritesOnly: boolean) => {
    setShowFavoritesOnly(showFavoritesOnly);
    logger.info("favorites_filter_toggled", {
      show_favorites_only: showFavoritesOnly,
      total_favorites: favoritedProductIds.size,
      operation: "toggle_favorites_filter"
    });
  }, [favoritedProductIds.size]);
  ```
- UPDATE: Product display logic to filter by favorites
  ```typescript
  // Filter products based on favorites toggle
  const displayedProducts = showFavoritesOnly
    ? products.filter(product => favoritedProductIds.has(product.product_id))
    : products;
  ```
- UPDATE: Pass favorites data to components
  - ProductFilters: `showFavoritesOnly`, `onShowFavoritesToggle`, `totalFavorites`
  - ProductGrid/ProductCard: `favoritedProductIds`, `onToggleFavorite`
- UPDATE LOGGING: Include favorites context in relevant logs
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 2: Frontend - UI Components

#### TASK 2.1: UPDATE src/components/ProductCard.tsx - Add favorite toggle button

- ADD IMPORTS:
  ```typescript
  import { Button } from "@/components/ui/button";
  import { logger } from "@/lib/logger";
  ```
- UPDATE ProductCardProps:
  ```typescript
  interface ProductCardProps {
    product: Product;
    isFavorited: boolean;
    onToggleFavorite: (productId: number) => void;
  }
  ```
- ADD: Heart icon click handler
  ```typescript
  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.preventDefault(); // Prevent card click if card becomes clickable later
    onToggleFavorite(product.product_id);
    logger.info(isFavorited ? "favorite_removed" : "favorite_added", {
      product_id: product.product_id,
      product_name: product.product_name,
      operation: "toggle_favorite_from_card"
    });
  };
  ```
- ADD: Heart icon button in CardHeader
  ```typescript
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8 flex-shrink-0"
    onClick={handleFavoriteClick}
    aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
  >
    {isFavorited ? (
      // Filled heart for favorited
      <svg className="w-5 h-5 fill-red-500 text-red-500" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
      </svg>
    ) : (
      // Outline heart for not favorited
      <svg className="w-5 h-5 text-gray-400 hover:text-red-500 transition-colors" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
      </svg>
    )}
  </Button>
  ```
- UPDATE: CardHeader layout to accommodate heart icon
  - Use flex layout with justify-between
  - Heart icon on the right side
  - Product name and category badge on left
- ACCESSIBILITY:
  - Add aria-label to button
  - Add aria-hidden to SVG icons
  - Ensure keyboard navigation works
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 2.2: UPDATE src/components/ProductGrid.tsx - Pass favorites props to cards

- UPDATE IMPORTS:
  ```typescript
  import type { Product } from "@/types/product";
  ```
- UPDATE ProductGridProps:
  ```typescript
  interface ProductGridProps {
    products: Product[];
    loading: boolean;
    favoritedProductIds: Set<number>;
    onToggleFavorite: (productId: number) => void;
  }
  ```
- UPDATE: ProductCard rendering in map function
  ```typescript
  {products.map((product) => (
    <ProductCard
      key={product.product_id}
      product={product}
      isFavorited={favoritedProductIds.has(product.product_id)}
      onToggleFavorite={onToggleFavorite}
    />
  ))}
  ```
- ADD: Empty state message for favorites filter
  ```typescript
  {!loading && products.length === 0 && (
    <div className="col-span-full text-center py-12">
      <p className="text-lg text-muted-foreground">No favorited products yet</p>
      <p className="text-sm text-muted-foreground mt-2">
        Click the heart icon on products to add them to your favorites
      </p>
    </div>
  )}
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 2.3: UPDATE src/components/ProductFilters.tsx - Add favorites filter toggle

- ADD IMPORTS:
  ```typescript
  import { Label } from "@/components/ui/label";
  import { logger } from "@/lib/logger";
  ```
- UPDATE ProductFiltersProps:
  ```typescript
  interface ProductFiltersProps {
    onFilterChange: (filters: ProductFilterParams) => void;
    loading?: boolean;
    showFavoritesOnly: boolean;
    onShowFavoritesToggle: (showFavoritesOnly: boolean) => void;
    totalFavorites: number;
  }
  ```
- ADD: Favorites toggle checkbox section
  ```typescript
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      id="show-favorites"
      checked={showFavoritesOnly}
      onChange={(e) => {
        onShowFavoritesToggle(e.target.checked);
        logger.info("favorites_filter_toggled", {
          show_favorites_only: e.target.checked,
          total_favorites: totalFavorites,
          operation: "toggle_favorites_filter"
        });
      }}
      className="h-4 w-4 rounded border-gray-300"
      disabled={loading}
    />
    <Label htmlFor="show-favorites" className="text-sm font-medium cursor-pointer">
      Show Favorites Only {totalFavorites > 0 && `(${totalFavorites})`}
    </Label>
  </div>
  ```
- LAYOUT: Add favorites toggle above or alongside existing filters
  - Use consistent spacing with other filter controls
  - Display favorites count badge when > 0
  - Disable checkbox when loading
- STYLING:
  - Match existing filter component styling
  - Use Tailwind utility classes
  - Ensure responsive layout
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 3: Integration & Polish

#### TASK 3.1: UPDATE src/App.tsx - Wire up all favorites components

- ENSURE: All new state and callbacks are properly connected
- UPDATE: ProductFilters component props
  ```typescript
  <ProductFilters
    onFilterChange={handleFilterChange}
    loading={loading}
    showFavoritesOnly={showFavoritesOnly}
    onShowFavoritesToggle={handleShowFavoritesToggle}
    totalFavorites={favoritedProductIds.size}
  />
  ```
- UPDATE: ProductGrid component props
  ```typescript
  <ProductGrid
    products={displayedProducts}
    loading={loading}
    favoritedProductIds={favoritedProductIds}
    onToggleFavorite={handleToggleFavorite}
  />
  ```
- UPDATE: Header subtitle to include favorites count
  ```typescript
  <p className="text-muted-foreground mt-1">
    {loading
      ? "Loading products..."
      : error
        ? "Error loading products"
        : showFavoritesOnly
          ? `Showing ${displayedProducts.length} favorite products`
          : `Browse our collection of ${products.length} products (${favoritedProductIds.size} favorites)`}
  </p>
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 3.2: VERIFY Frontend - Run linting and type checking

- RUN: `cd project_4/app/frontend && bun run check:fix`
- EXPECTED: No TypeScript errors, no Biome lint errors
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 4: Manual Testing

#### TASK 4.1: Manual Integration Test

- START BACKEND: `cd project_4/app/backend && uv run python run_api.py`
- START FRONTEND: `cd project_4/app/frontend && bun dev`
- TEST SCENARIOS:
  1. **Add to favorites**:
     - Load page with products
     - Click heart icon on a product
     - Verify heart fills with red color
     - Check console logs for `favorite_added` event
  2. **Remove from favorites**:
     - Click filled heart icon
     - Verify heart returns to outline state
     - Check console logs for `favorite_removed` event
  3. **Show favorites filter**:
     - Add 3-5 products to favorites
     - Toggle "Show Favorites Only" checkbox
     - Verify only favorited products are displayed
     - Verify header shows correct count
     - Toggle off and verify all products shown again
  4. **Persistence across refresh**:
     - Add products to favorites
     - Refresh page (hard refresh)
     - Verify favorites are still marked
     - Check console logs for `favorites_loaded` event
  5. **Empty favorites state**:
     - Remove all favorites
     - Toggle "Show Favorites Only"
     - Verify empty state message is shown
  6. **Favorites with existing filters**:
     - Apply category or price filter
     - Mark some filtered products as favorites
     - Toggle "Show Favorites Only"
     - Verify favorites from all categories shown (not just filtered)
     - Toggle off favorites filter
     - Verify original filters still applied
  7. **LocalStorage verification**:
     - Open browser DevTools > Application > Local Storage
     - Find `product_favorites` key
     - Verify it contains array of product IDs
     - Add/remove favorites and watch value update
- **VALIDATE**: Manual verification in browser at http://localhost:3000

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Frontend
cd project_4/app/frontend
bun run check:fix

# Expected: No TypeScript errors, no Biome errors
```

### Level 2: Unit Tests (Optional - Could Add Later)

```bash
# Future enhancement: Add tests for favorites utilities
# - Test loadFavorites() with valid/invalid localStorage data
# - Test saveFavorites() with Set data
# - Test toggleFavorite() add and remove logic
```

### Level 3: Integration Testing (Manual Validation)

```bash
# Terminal 1: Start backend
cd project_4/app/backend
uv run python run_api.py

# Terminal 2: Start frontend
cd project_4/app/frontend
bun dev
# → Open http://localhost:3000 and test UI

# Manual test checklist:
# ✓ Heart icons render on all product cards
# ✓ Click heart adds to favorites (fills heart)
# ✓ Click filled heart removes from favorites
# ✓ Favorites persist after page refresh
# ✓ "Show Favorites Only" filter works
# ✓ Empty state shows when no favorites
# ✓ Favorites count displays correctly
# ✓ Console logs show structured events
# ✓ localStorage contains favorites array
```

---

## COMPLETION CHECKLIST

### Frontend Tasks
- [ ] favorites.ts utility created with load/save/toggle functions
- [ ] App.tsx updated with favorites state management
- [ ] ProductCard.tsx updated with heart icon and toggle functionality
- [ ] ProductGrid.tsx updated to pass favorites props
- [ ] ProductFilters.tsx updated with "Show Favorites Only" toggle
- [ ] All components properly wired in App.tsx
- [ ] Frontend linting passes (biome check)
- [ ] TypeScript compilation succeeds with strict mode

### Functionality Tests
- [ ] Heart icon toggles between outline and filled states
- [ ] Favorites persist in localStorage
- [ ] Favorites load on page mount
- [ ] "Show Favorites Only" filter works correctly
- [ ] Empty state displays when filtering with no favorites
- [ ] Favorites count displays in UI
- [ ] Console logs show structured events for all operations
- [ ] localStorage key follows naming convention

### User Experience
- [ ] Heart icon is clearly visible on cards
- [ ] Visual feedback on hover (color change)
- [ ] Filled heart uses red color (#ef4444 or similar)
- [ ] Empty state has helpful message
- [ ] Favorites count badge shows in filter
- [ ] Smooth transitions and animations (optional enhancement)
- [ ] Keyboard accessible (heart button focusable)
- [ ] Proper ARIA labels for screen readers

---

## Notes

### Key Implementation Decisions

1. **Storage Strategy**: Using localStorage for Phase 1 keeps implementation simple and provides instant persistence without backend changes. Future backend API can sync with localStorage.

2. **Data Structure**: Using Set<number> for favorites provides O(1) lookup performance when checking if product is favorited. Convert to Array for localStorage JSON serialization.

3. **State Management**: Favorites state lives in App.tsx alongside other application state. Simple prop drilling is sufficient for this feature scope.

4. **Filter Interaction**: "Show Favorites Only" works independently of other filters. When toggled on, it shows ALL favorited products regardless of other active filters. When toggled off, previously applied filters remain active.

5. **Immutability**: Following React best practices, favorites state updates create new Set instances rather than mutating existing ones.

### Storage Schema

```typescript
// localStorage key: "product_favorites"
// Value: JSON stringified array of product IDs
// Example:
[1, 5, 12, 23, 30]
```

### Future Enhancements (Phase 2+)

**Backend API** (Optional):
- POST /api/favorites - Add product to favorites
- DELETE /api/favorites/{product_id} - Remove from favorites
- GET /api/favorites - Get all user favorites
- Requires user authentication
- Sync with localStorage on login/logout

**Additional Features**:
- Favorites count badge in header
- "Add all filtered to favorites" bulk action
- Share favorites list (generate shareable link)
- Product recommendations based on favorites
- Favorites categories/collections
- Export favorites as PDF/CSV

**Performance Optimizations**:
- Debounce localStorage writes for rapid toggling
- Virtual scrolling for large favorites lists
- Lazy load product data for favorites view

**Accessibility Enhancements**:
- Keyboard shortcuts (F key to favorite focused product)
- Screen reader announcements on favorite/unfavorite
- High contrast mode for heart icons
- Focus management for favorites filter

### Potential Edge Cases

1. **localStorage quota exceeded**: Handled with try-catch, log error with fix_suggestion
2. **Corrupted localStorage data**: JSON.parse wrapped in try-catch, fallback to empty Set
3. **Product deleted but in favorites**: Filter handles gracefully (product won't be in products array)
4. **Browser without localStorage**: Feature degrades gracefully (favorites won't persist)
5. **Multiple tabs**: Changes in one tab won't reflect in other tabs (could add storage event listener)

### Testing Recommendations

1. **Unit Tests** (Future):
   - `favorites.ts` functions with various inputs
   - Edge cases (malformed JSON, quota exceeded)

2. **Integration Tests** (Future):
   - Full user flow (add → refresh → verify → remove)
   - Favorites filter interaction with product filters

3. **E2E Tests** (Future):
   - Playwright/Cypress test for full user journey
   - Verify localStorage persistence
   - Test accessibility with screen reader

---

## Story Acceptance Criteria

**Must Have**:
- ✅ Heart icon visible on every product card
- ✅ Click heart to add/remove from favorites
- ✅ Visual distinction between favorited/not favorited (filled vs outline)
- ✅ Favorites persist in localStorage across page refreshes
- ✅ "Show Favorites Only" filter toggle in ProductFilters
- ✅ Display count of favorited products
- ✅ Empty state when no favorites exist
- ✅ Structured logging for all favorites operations
- ✅ TypeScript type safety throughout
- ✅ Responsive design (works on mobile and desktop)
- ✅ Accessibility (keyboard navigation, ARIA labels)

**Should Have**:
- ✅ Hover effects on heart icon
- ✅ Transition animations (optional, not blocking)
- ✅ Error handling for localStorage failures
- ✅ Console logs for debugging

**Nice to Have** (Future Enhancements):
- Backend API for user-specific favorites
- Favorites sync across devices
- Bulk favorites operations
- Favorites analytics

---

## Success Metrics

**Technical**:
- ✅ Zero TypeScript errors with strict mode
- ✅ Zero Biome linting errors
- ✅ All console logs use structured JSON format
- ✅ Naming conventions followed (verbose, intention-revealing)
- ✅ Code matches existing patterns in codebase

**Functional**:
- ✅ Favorites add/remove works reliably
- ✅ Persistence works across hard refresh
- ✅ Filter shows correct subset of products
- ✅ Empty states display properly
- ✅ All user interactions logged

**User Experience**:
- ✅ Heart icon is intuitive and discoverable
- ✅ Visual feedback is immediate
- ✅ Feature works on mobile devices
- ✅ No performance degradation with many favorites
- ✅ Accessible to keyboard and screen reader users
