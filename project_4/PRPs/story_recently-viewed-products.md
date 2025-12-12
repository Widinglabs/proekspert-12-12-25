---
name: "Recently Viewed Products - Frontend Implementation"
description: "Track product views in localStorage and display 'Recently Viewed' section on homepage"
---

## Original Story

```
**Recently Viewed Products**
Track viewed products in localStorage. Show "Recently Viewed" section on homepage.
Helps users find products they looked at before.
```

## Story Metadata

**Story Type**: Feature (Frontend-only)
**Estimated Complexity**: Low
**Primary Systems Affected**:
- Frontend: `src/lib/`, `src/components/`, `src/App.tsx`

---

## CONTEXT REFERENCES

### Frontend References
- `src/types/product.ts` - Product interface definition for type safety
- `src/lib/logger.ts` - Structured logging pattern (snake_case events)
- `src/lib/api-client.ts` - API client pattern for consistency
- `src/components/ProductCard.tsx` - Product display component to reuse
- `src/components/ProductGrid.tsx` - Grid layout pattern with three states (loading/empty/success)
- `src/App.tsx` - Main app component and state management pattern
- `package.json` - React 19 with TypeScript strict mode, Bun runtime

### Naming Conventions (CRITICAL)
- Use verbose, intention-revealing names with prefixes
- TypeScript interfaces: PascalCase (e.g., `RecentlyViewedProductsProps`)
- Functions: camelCase with descriptive names (e.g., `trackProductView`, `getRecentlyViewedProducts`)
- All fields use intention-revealing names (e.g., `product_id`, `viewed_timestamp_iso`)

### Patterns to Follow
- **Component Structure**: Props interface with explicit types, JSDoc comments
- **State Management**: Three-state pattern (loading/empty/success)
- **Logging**: Structured JSON logging with contextual fields
- **LocalStorage**: Use utility functions with error handling and logging
- **Type Safety**: No `any` types, strict TypeScript mode

---

## IMPLEMENTATION TASKS

### TASK 1: CREATE src/lib/recently-viewed-storage.ts - LocalStorage utility

- **PURPOSE**: Centralized localStorage management for recently viewed products
- **IMPLEMENT**: RecentlyViewedStorage utility class with type-safe methods
- **KEY FEATURES**:
  - Store product_id and viewed_timestamp_iso for each view
  - Limit to maximum 10 recently viewed products
  - Most recent products appear first
  - Prevent duplicate entries (update timestamp if product already viewed)
  - Handle localStorage errors gracefully with logging
- **INTERFACE DEFINITION**:
  ```typescript
  interface RecentlyViewedProduct {
    product_id: number;
    viewed_timestamp_iso: string;
  }
  ```
- **METHODS TO IMPLEMENT**:
  ```typescript
  // Add or update a product view
  function trackProductView(product_id: number): void

  // Get list of recently viewed product IDs (most recent first)
  function getRecentlyViewedProductIds(): number[]

  // Clear all recently viewed products
  function clearRecentlyViewedProducts(): void
  ```
- **STORAGE KEY**: Use `"product_catalog_recently_viewed"` as localStorage key
- **MAX ITEMS**: Limit to 10 most recent products
- **ERROR HANDLING**:
  - Catch and log localStorage quota exceeded errors
  - Catch and log JSON parse errors for corrupted data
  - Return empty array on errors instead of throwing
- **LOGGING PATTERN**:
  ```typescript
  logger.info("tracking_product_view", {
    product_id: product_id,
    operation: "trackProductView",
    total_recently_viewed: updated_count
  });

  logger.error("localStorage_error", {
    error_message: error.message,
    operation: "trackProductView",
    fix_suggestion: "Check browser localStorage quota and permissions"
  });
  ```
- **PATTERN**: Follow `src/lib/api-client.ts` module structure with exported functions
- **IMPORTS**: `import { logger } from "./logger";`
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

---

### TASK 2: CREATE src/components/RecentlyViewedProducts.tsx - Display component

- **PURPOSE**: Display recently viewed products in a horizontal scrolling section
- **PROPS INTERFACE**:
  ```typescript
  interface RecentlyViewedProductsProps {
    recently_viewed_product_ids: number[];
    all_products: Product[];
  }
  ```
- **COMPONENT STRUCTURE**:
  1. Filter `all_products` to get only products in `recently_viewed_product_ids`
  2. Maintain order from `recently_viewed_product_ids` (most recent first)
  3. Handle empty state when no products have been viewed
  4. Display in horizontal scrolling grid
- **LAYOUT**:
  - Horizontal scroll container with gap between cards
  - Each product uses `ProductCard` component
  - Hide section entirely if `recently_viewed_product_ids` is empty
  - Responsive: 1 card visible on mobile, 2 on tablet, 3 on desktop
- **EMPTY STATE**: Return `null` if no recently viewed products (section hidden)
- **JSX STRUCTURE**:
  ```tsx
  <section className="mb-8">
    <h2 className="text-2xl font-bold mb-4">Recently Viewed</h2>
    <div className="flex gap-4 overflow-x-auto pb-4">
      {/* Map over products and render ProductCard */}
    </div>
  </section>
  ```
- **LOGGING**:
  ```typescript
  logger.info("rendering_recently_viewed", {
    recently_viewed_count: filteredProducts.length,
    component: "RecentlyViewedProducts"
  });
  ```
- **PATTERN**: Follow `src/components/ProductGrid.tsx` structure
- **IMPORTS**:
  ```typescript
  import { ProductCard } from "./ProductCard";
  import { logger } from "@/lib/logger";
  import type { Product } from "@/types/product";
  ```
- **GOTCHA**: Maintain product order from `recently_viewed_product_ids`, not from `all_products`
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

---

### TASK 3: UPDATE src/components/ProductCard.tsx - Add click tracking

- **PURPOSE**: Track product views when user clicks on a product card
- **ADD**: Click handler to track product views in localStorage
- **IMPLEMENTATION**:
  1. Import `trackProductView` function from recently-viewed-storage
  2. Add `onClick` handler to the Card component
  3. Call `trackProductView(product.product_id)` on card click
  4. Add hover cursor styling to indicate clickability
- **LOGGING**:
  ```typescript
  logger.info("product_card_clicked", {
    product_id: product.product_id,
    product_name: product.product_name,
    component: "ProductCard"
  });
  ```
- **FIND**: `<Card className="h-full flex flex-col transition-shadow hover:shadow-lg">`
- **UPDATE TO**:
  ```tsx
  <Card
    className="h-full flex flex-col transition-shadow hover:shadow-lg cursor-pointer"
    onClick={() => handleProductClick()}
  >
  ```
- **ADD HANDLER FUNCTION**:
  ```typescript
  const handleProductClick = () => {
    logger.info("product_card_clicked", {
      product_id: product.product_id,
      product_name: product.product_name,
      component: "ProductCard"
    });
    trackProductView(product.product_id);
  };
  ```
- **IMPORTS ADD**:
  ```typescript
  import { trackProductView } from "@/lib/recently-viewed-storage";
  import { logger } from "@/lib/logger";
  ```
- **GOTCHA**: Add `cursor-pointer` class to indicate the card is clickable
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

---

### TASK 4: UPDATE src/App.tsx - Integrate recently viewed section

- **PURPOSE**: Display RecentlyViewedProducts section above ProductGrid
- **ADD STATE**: Track recently viewed product IDs
  ```typescript
  const [recentlyViewedProductIds, setRecentlyViewedProductIds] = useState<number[]>([]);
  ```
- **ADD EFFECT**: Load recently viewed IDs on component mount
  ```typescript
  useEffect(() => {
    const viewedIds = getRecentlyViewedProductIds();
    setRecentlyViewedProductIds(viewedIds);
    logger.info("recently_viewed_loaded", {
      recently_viewed_count: viewedIds.length,
      component: "App"
    });
  }, []);
  ```
- **ADD REFRESH LOGIC**: Listen for storage changes to update recently viewed list
  ```typescript
  useEffect(() => {
    const handleStorageChange = () => {
      const viewedIds = getRecentlyViewedProductIds();
      setRecentlyViewedProductIds(viewedIds);
    };

    // Refresh when window regains focus (user might have clicked products)
    window.addEventListener("focus", handleStorageChange);

    return () => {
      window.removeEventListener("focus", handleStorageChange);
    };
  }, []);
  ```
- **UPDATE JSX**: Add RecentlyViewedProducts component after ProductFilters and before error/grid section
- **PLACEMENT**: Insert between `<ProductFilters />` and the error/grid conditional rendering
  ```tsx
  {/* Recently Viewed Section - only show if products loaded and has viewed items */}
  {!loading && !error && recentlyViewedProductIds.length > 0 && (
    <RecentlyViewedProducts
      recently_viewed_product_ids={recentlyViewedProductIds}
      all_products={products}
    />
  )}
  ```
- **IMPORTS ADD**:
  ```typescript
  import { RecentlyViewedProducts } from "@/components/RecentlyViewedProducts";
  import { getRecentlyViewedProductIds } from "@/lib/recently-viewed-storage";
  ```
- **GOTCHA**: Only show RecentlyViewedProducts after initial products load (not during loading state)
- **PATTERN**: Follow existing state management pattern in App.tsx (useState + useEffect)
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

---

### TASK 5: MANUAL TESTING - Verify feature works end-to-end

- **PURPOSE**: Validate that recently viewed tracking works correctly in browser
- **START BACKEND**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python run_api.py`
- **START FRONTEND**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun dev`
- **TEST SCENARIOS**:
  1. **Initial Load**: Open http://localhost:3000 - "Recently Viewed" section should NOT appear
  2. **First Click**: Click on any product card - check browser console for tracking logs
  3. **Recently Viewed Appears**: "Recently Viewed" section should appear with 1 product
  4. **Multiple Clicks**: Click on 3-4 more products - verify section updates with new products
  5. **Order Verification**: Most recently clicked product should appear first
  6. **Duplicate Click**: Click same product twice - should update timestamp, not duplicate
  7. **Limit Test**: Click on 12+ different products - verify only 10 most recent show
  8. **Persistence**: Refresh page - recently viewed products should persist
  9. **Clear Browser Storage**: Open DevTools → Application → Local Storage → Clear - section should disappear
  10. **Console Logs**: Verify structured JSON logs appear for all operations
- **BROWSER DEVTOOLS CHECKS**:
  - Application tab → Local Storage → Check `product_catalog_recently_viewed` key exists
  - Console tab → Verify structured JSON logs for tracking, rendering, clicks
  - Network tab → Verify no unnecessary API calls on product clicks
- **EXPECTED BEHAVIOR**:
  - Section only appears after at least one product clicked
  - Products appear in most-recent-first order
  - No duplicate products in the list
  - Maximum 10 products shown
  - Survives page refresh (localStorage persistence)
  - All operations logged with structured JSON
- **VALIDATE**: Manual verification in browser

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run check:fix

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Type Checking (Component Validation)

```bash
# TypeScript type checking
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run check:fix

# Expected: No TypeScript errors, all types resolve correctly
```

### Level 3: Integration Testing (System Validation)

```bash
# Terminal 1: Start backend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run python run_api.py

# Terminal 2: Start frontend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun dev

# Open browser at http://localhost:3000
# Follow manual testing scenarios from TASK 5
```

### Level 4: Browser DevTools Validation

```bash
# Check localStorage in Browser DevTools
# 1. Open DevTools (F12 or Cmd+Opt+I)
# 2. Go to Application tab → Local Storage → http://localhost:3000
# 3. Verify "product_catalog_recently_viewed" key exists after clicking products
# 4. Verify JSON structure matches RecentlyViewedProduct interface
# 5. Check Console for structured JSON logs (INFO level)
```

---

## COMPLETION CHECKLIST

- [ ] `src/lib/recently-viewed-storage.ts` created with localStorage utilities
- [ ] `trackProductView()`, `getRecentlyViewedProductIds()`, `clearRecentlyViewedProducts()` implemented
- [ ] LocalStorage error handling with logging in place
- [ ] `src/components/RecentlyViewedProducts.tsx` created with horizontal scroll layout
- [ ] Empty state handled (component returns null when no products)
- [ ] `src/components/ProductCard.tsx` updated with click tracking
- [ ] Click handler logs and calls `trackProductView()`
- [ ] Cursor styling updated to show clickability
- [ ] `src/App.tsx` updated with recently viewed state and component
- [ ] Recently viewed section appears only when products exist
- [ ] Frontend linting passes (biome check)
- [ ] TypeScript type checking passes (no errors)
- [ ] Manual testing completed for all 10 scenarios
- [ ] LocalStorage persistence verified in browser DevTools
- [ ] Structured logging verified in browser console
- [ ] Maximum 10 products limit enforced
- [ ] Most-recent-first ordering working correctly
- [ ] No duplicate products in recently viewed list

---

## Notes

### Key Implementation Decisions

1. **Frontend-Only Feature**: No backend changes required. All data stored in browser localStorage.

2. **Storage Schema**: Store minimal data in localStorage (product_id + timestamp), fetch full product details from existing products list to avoid data duplication.

3. **Component Visibility**: RecentlyViewedProducts component returns `null` instead of rendering empty state, allowing it to be completely hidden from the layout when not needed.

4. **Click Target**: Entire ProductCard is clickable (not just a button) for better UX. This is a view-tracking action, not a navigation.

5. **Performance**: No additional API calls. Recently viewed products are filtered from the already-loaded products list.

6. **Ordering**: Products stored with timestamp, allowing easy sorting and duplicate detection.

7. **Limit Enforcement**: Always keep only 10 most recent products to avoid localStorage bloat.

8. **Error Resilience**: All localStorage operations wrapped in try-catch with fallback behavior (empty array) to handle quota exceeded, permissions, or corrupted data.

9. **State Updates**: Use window focus event to refresh recently viewed list, ensuring updates when user returns to tab after clicking products.

10. **Accessibility**: ProductCard gets `cursor-pointer` to indicate interactivity, maintaining good UX principles.

### Future Enhancements (Out of Scope)

- Individual product detail pages that show full product information
- "Remove from recently viewed" button
- Analytics tracking for product view frequency
- Server-side recently viewed tracking for logged-in users
- Recently viewed section on category/search results pages
