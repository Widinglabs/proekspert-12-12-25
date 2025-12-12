---
name: "Product Comparison Feature"
description: "Side-by-side comparison of 2-4 products with specs, prices, and features"
---

## Original Story

**Product Comparison**

Users need to select 2-4 products from the catalog and compare them side-by-side in a comparison table. The comparison should show product specifications, prices, and features in columns for easy evaluation.

## Story Metadata

**Story Type**: Feature (Fullstack)
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- Backend: `app/models/`, `app/api/` (minimal changes)
- Frontend: `src/components/`, `src/lib/`, `src/types/` (primary focus)

---

## CONTEXT REFERENCES

### Backend References
- `app/models/product.py` - Product model with all fields (product_id, product_name, product_description, product_price_usd, product_category, product_in_stock)
- `app/api/products.py` - Existing GET /api/products endpoint (no changes needed - can fetch by IDs via filter)
- `app/services/product_service.py` - Service layer pattern with structured logging
- `app/core/logging_config.py` - StructuredLogger usage pattern

### Frontend References
- `src/types/product.ts` - Product and ProductCategory types
- `src/components/ProductCard.tsx` - Product display component pattern
- `src/components/ProductGrid.tsx` - Three-state pattern (loading/empty/success)
- `src/components/ui/button.tsx` - Button component for actions
- `src/components/ui/card.tsx` - Card component for layout
- `src/lib/logger.ts` - Structured logging pattern (snake_case events)
- `src/App.tsx` - State management pattern (useState + useCallback)

### Naming Conventions (CRITICAL)
- Use verbose, intention-revealing names
- All fields prefixed: `product_id`, `product_name`, `product_price_usd`
- Events in snake_case: `comparison_product_added`, `comparison_cleared`
- React components: PascalCase
- Functions: camelCase

---

## IMPLEMENTATION TASKS

### Phase 1: Frontend Types and State Management

#### TASK 1.1: UPDATE src/types/product.ts - Add comparison types

- ADD: Interface for comparison state after existing interfaces
- NEW INTERFACES:
  ```typescript
  /**
   * Product comparison state for managing selected products.
   *
   * Allows users to select 2-4 products for side-by-side comparison.
   */
  export interface ProductComparisonState {
    /** Array of selected product IDs (2-4 products) */
    selected_product_ids: number[];

    /** Whether comparison view is active */
    is_comparison_active: boolean;
  }

  /**
   * Product comparison display data.
   *
   * Contains full product objects for comparison table rendering.
   */
  export interface ProductComparisonData {
    /** Array of products to compare (2-4 products) */
    comparison_products: Product[];

    /** Total number of products in comparison */
    comparison_count: number;
  }
  ```
- PATTERN: Follow existing type documentation style with JSDoc comments
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 2: Comparison Selection Component

#### TASK 2.1: CREATE src/components/ComparisonBar.tsx - Fixed bottom comparison bar

- CREATE: New component for managing product comparison selection
- IMPORTS:
  ```typescript
  import { Button } from "@/components/ui/button";
  import { Card } from "@/components/ui/card";
  import { logger } from "@/lib/logger";
  import type { Product } from "@/types/product";
  ```
- PROPS INTERFACE:
  ```typescript
  interface ComparisonBarProps {
    /** Array of selected product IDs for comparison */
    selected_product_ids: number[];

    /** Callback when comparison view is activated */
    on_view_comparison: () => void;

    /** Callback when product is removed from comparison */
    on_remove_product: (product_id: number) => void;

    /** Callback when all products are cleared from comparison */
    on_clear_all: () => void;
  }
  ```
- IMPLEMENT:
  1. Fixed bottom bar (position: fixed, bottom: 0, z-index: 50)
  2. Show count of selected products (e.g., "2 products selected")
  3. List selected product IDs with remove button (X icon)
  4. "Compare" button - enabled when 2-4 products selected
  5. "Clear All" button - removes all selections
  6. Hide bar when no products selected (selected_product_ids.length === 0)
  7. Show warning when trying to add 5th product (max 4)
- STYLING:
  - Use Tailwind: bg-card border-t shadow-lg
  - Responsive: stack on mobile, row on desktop
  - Animate slide up/down with transition
- ACCESSIBILITY:
  - Button labels with aria-label
  - Keyboard navigation support
  - Focus management
- LOGGING:
  ```typescript
  logger.info("comparison_product_removed", {
    product_id: product_id,
    remaining_count: selected_product_ids.length - 1
  });
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 2.2: UPDATE src/components/ProductCard.tsx - Add comparison checkbox

- UPDATE: Import Button component if not already imported
- ADD: Props field:
  ```typescript
  interface ProductCardProps {
    product: Product;
    /** Whether product is selected for comparison */
    is_selected_for_comparison?: boolean;
    /** Callback when comparison selection changes */
    on_comparison_toggle?: (product_id: number, is_selected: boolean) => void;
  }
  ```
- ADD: Checkbox/button in card header (top-right corner)
  - Visual indicator when selected (checkmark icon, colored border)
  - Click handler calls on_comparison_toggle
  - Disabled state when 4 products already selected (unless this product is selected)
- STYLING:
  - Absolute positioned in top-right corner
  - Selected state: border-2 border-primary
  - Checkbox appearance or toggle button with icon
- LOGGING:
  ```typescript
  logger.info("comparison_toggle_clicked", {
    product_id: product.product_id,
    product_name: product.product_name,
    new_state: is_selected ? "selected" : "deselected"
  });
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 3: Comparison Table Component

#### TASK 3.1: CREATE src/components/ComparisonTable.tsx - Product comparison table

- CREATE: New component for displaying comparison table
- IMPORTS:
  ```typescript
  import { Button } from "@/components/ui/button";
  import { Card } from "@/components/ui/card";
  import { logger } from "@/lib/logger";
  import type { Product } from "@/types/product";
  ```
- PROPS INTERFACE:
  ```typescript
  interface ComparisonTableProps {
    /** Array of products to compare (2-4 products) */
    comparison_products: Product[];

    /** Callback to close comparison view */
    on_close_comparison: () => void;

    /** Callback to remove specific product from comparison */
    on_remove_product: (product_id: number) => void;
  }
  ```
- IMPLEMENT:
  1. Full-page overlay (or main section replacement)
  2. Header with title "Product Comparison" and close button
  3. Responsive table/grid layout:
     - Mobile: Stack products vertically, one card per product
     - Desktop: Side-by-side columns (2-4 columns)
  4. Comparison rows:
     - **Product Image** (placeholder if not available)
     - **Product Name** (product_name)
     - **Category** (product_category)
     - **Price** (product_price_usd formatted as currency)
     - **Description** (product_description, truncate if long)
     - **Availability** (product_in_stock as badge: In Stock / Out of Stock)
     - **Remove Button** (X icon, removes from comparison)
  5. Empty state: Show message if comparison_products.length < 2
  6. Action buttons:
     - "Add More Products" - returns to catalog with selections
     - "Clear Comparison" - removes all and returns to catalog
- LAYOUT:
  - Desktop: CSS Grid with columns for each product
  - Mobile: Stack vertically with clear section dividers
  - Sticky header with close button
- STYLING:
  - Use Card components for structure
  - Price highlighted/bold
  - In Stock badge: green, Out of Stock: red
  - Responsive: table on desktop, cards on mobile
- ACCESSIBILITY:
  - Table semantic HTML (table, thead, tbody, tr, td) on desktop
  - Proper heading hierarchy
  - ARIA labels for remove buttons
- LOGGING:
  ```typescript
  logger.info("comparison_view_opened", {
    product_count: comparison_products.length,
    product_ids: comparison_products.map(p => p.product_id)
  });

  logger.info("comparison_product_removed_from_table", {
    product_id: product_id,
    remaining_count: comparison_products.length - 1
  });
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 4: App Integration and State Management

#### TASK 4.1: UPDATE src/App.tsx - Integrate comparison functionality

- ADD STATE:
  ```typescript
  // Comparison state
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isComparisonActive, setIsComparisonActive] = useState<boolean>(false);
  ```
- ADD: Helper function to get comparison products
  ```typescript
  const getComparisonProducts = useCallback((): Product[] => {
    return products.filter(product => selectedProductIds.includes(product.product_id));
  }, [products, selectedProductIds]);
  ```
- ADD: Comparison toggle handler
  ```typescript
  const handleComparisonToggle = useCallback((product_id: number, is_selected: boolean) => {
    setSelectedProductIds(prev => {
      if (is_selected) {
        // Add product (max 4)
        if (prev.length >= 4) {
          logger.warn("comparison_limit_reached", {
            attempted_product_id: product_id,
            max_products: 4,
            fix_suggestion: "Remove a product before adding another"
          });
          return prev; // Don't add if at limit
        }
        logger.info("comparison_product_added", {
          product_id: product_id,
          total_selected: prev.length + 1
        });
        return [...prev, product_id];
      } else {
        // Remove product
        logger.info("comparison_product_removed", {
          product_id: product_id,
          total_selected: prev.length - 1
        });
        return prev.filter(id => id !== product_id);
      }
    });
  }, []);
  ```
- ADD: Comparison view handlers
  ```typescript
  const handleViewComparison = useCallback(() => {
    if (selectedProductIds.length >= 2 && selectedProductIds.length <= 4) {
      logger.info("comparison_view_activated", {
        product_count: selectedProductIds.length,
        product_ids: selectedProductIds
      });
      setIsComparisonActive(true);
    }
  }, [selectedProductIds]);

  const handleCloseComparison = useCallback(() => {
    logger.info("comparison_view_closed", {
      product_count: selectedProductIds.length
    });
    setIsComparisonActive(false);
  }, [selectedProductIds]);

  const handleRemoveFromComparison = useCallback((product_id: number) => {
    setSelectedProductIds(prev => prev.filter(id => id !== product_id));

    // Close comparison if less than 2 products remain
    setSelectedProductIds(prev => {
      if (prev.length < 2) {
        setIsComparisonActive(false);
      }
      return prev;
    });
  }, []);

  const handleClearComparison = useCallback(() => {
    logger.info("comparison_cleared", {
      product_count: selectedProductIds.length
    });
    setSelectedProductIds([]);
    setIsComparisonActive(false);
  }, [selectedProductIds]);
  ```
- UPDATE: ProductCard rendering in ProductGrid
  - Pass is_selected_for_comparison prop
  - Pass on_comparison_toggle handler
- ADD TO JSX:
  1. Import ComparisonBar and ComparisonTable components
  2. Add ComparisonBar above footer (fixed position, always rendered)
  3. Conditionally render ComparisonTable when isComparisonActive
  4. When comparison active, hide main product grid and show table
- CONDITIONAL RENDERING:
  ```tsx
  {isComparisonActive ? (
    <ComparisonTable
      comparison_products={getComparisonProducts()}
      on_close_comparison={handleCloseComparison}
      on_remove_product={handleRemoveFromComparison}
    />
  ) : (
    <>
      <ProductFilters onFilterChange={handleFilterChange} loading={loading} />
      {error ? (
        // existing error UI
      ) : (
        <ProductGrid
          products={products}
          loading={loading}
          selected_product_ids={selectedProductIds}
          on_comparison_toggle={handleComparisonToggle}
        />
      )}
    </>
  )}

  {/* Fixed comparison bar - always visible when products selected */}
  <ComparisonBar
    selected_product_ids={selectedProductIds}
    on_view_comparison={handleViewComparison}
    on_remove_product={handleRemoveFromComparison}
    on_clear_all={handleClearComparison}
  />
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 4.2: UPDATE src/components/ProductGrid.tsx - Pass comparison props to cards

- UPDATE: Props interface
  ```typescript
  interface ProductGridProps {
    products: Product[];
    loading: boolean;
    /** Array of selected product IDs for comparison */
    selected_product_ids?: number[];
    /** Callback when comparison selection changes */
    on_comparison_toggle?: (product_id: number, is_selected: boolean) => void;
  }
  ```
- UPDATE: ProductCard rendering in map
  ```tsx
  <ProductCard
    key={product.product_id}
    product={product}
    is_selected_for_comparison={selected_product_ids?.includes(product.product_id)}
    on_comparison_toggle={on_comparison_toggle}
  />
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 5: Styling and Polish

#### TASK 5.1: ADD comparison-specific styles

- UPDATE: `src/index.css` if needed for custom comparison table styles
- ENSURE: Responsive breakpoints work correctly
- ADD: Smooth transitions for comparison bar slide-in/out
- ADD: Visual feedback for selection state (borders, checkmarks, colors)
- PATTERN: Use existing Tailwind utilities, avoid custom CSS where possible
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 5.2: ADD utility function for price formatting

- CREATE: `src/lib/format.ts` (if doesn't exist) or add to existing utils
- ADD: Price formatting function
  ```typescript
  /**
   * Format product price as USD currency string.
   *
   * @param price_usd - Price as string from backend (Decimal serialized)
   * @returns Formatted price string (e.g., "$29.99")
   */
  export function formatProductPrice(price_usd: string): string {
    const price_number = parseFloat(price_usd);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price_number);
  }
  ```
- USE: In ComparisonTable and ProductCard for consistent price display
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 6: Testing and Validation

#### TASK 6.1: Manual integration testing - Comparison workflow

- START: `cd project_4/app/backend && uv run python run_api.py`
- START: `cd project_4/app/frontend && bun dev`
- TEST SCENARIOS:
  1. **Basic Selection**:
     - Load catalog page
     - Select 2 products using checkboxes/buttons
     - Verify comparison bar appears with count
     - Click "Compare" button
     - Verify comparison table shows 2 products side-by-side

  2. **Add/Remove Products**:
     - In comparison view, remove 1 product
     - Verify table updates (should close if only 1 remains)
     - Return to catalog, select 3 more products (total 3-4)
     - Verify comparison bar shows correct count
     - View comparison with 4 products
     - Verify table layout with 4 columns

  3. **Max Limit (4 products)**:
     - Select 4 products
     - Try to select 5th product
     - Verify selection is blocked (UI feedback)
     - Verify warning logged to console

  4. **Clear All**:
     - Select multiple products
     - Click "Clear All" in comparison bar
     - Verify all selections removed
     - Verify comparison bar disappears

  5. **Responsive Design**:
     - Test comparison table on mobile viewport (< 768px)
     - Verify products stack vertically
     - Test on tablet (768-1024px)
     - Test on desktop (> 1024px)
     - Verify table columns layout

  6. **Accessibility**:
     - Navigate with keyboard only (Tab, Enter, Escape)
     - Test with screen reader (VoiceOver/NVDA)
     - Verify focus management in comparison view
     - Verify ARIA labels are present

  7. **State Persistence**:
     - Select products
     - Apply filters to product list
     - Verify selected products remain selected after filter
     - Open comparison, close, reopen
     - Verify state is maintained

  8. **Edge Cases**:
     - Try to compare with 0 products selected
     - Try to compare with only 1 product
     - Verify proper error messages/disabled states
     - Select products, refresh page
     - Verify state resets (expected behavior)

- **VALIDATE**: Manual verification in browser at http://localhost:3000

#### TASK 6.2: Verify frontend linting and types

- RUN: `cd project_4/app/frontend && bun run check:fix`
- EXPECTED: No TypeScript errors, no Biome lint errors
- FIX: Any issues found before proceeding
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

## COMPLETION CHECKLIST

### Types and State
- [ ] ProductComparisonState interface added to src/types/product.ts
- [ ] ProductComparisonData interface added to src/types/product.ts
- [ ] TypeScript strict mode passes with no errors

### Components
- [ ] ComparisonBar component created with fixed bottom positioning
- [ ] ComparisonBar shows selected count and product list
- [ ] ComparisonBar has Compare, Clear All buttons with proper states
- [ ] ProductCard updated with comparison checkbox/toggle
- [ ] ProductCard shows selected state visually
- [ ] ComparisonTable component created with responsive layout
- [ ] ComparisonTable displays all product fields in comparison rows
- [ ] ComparisonTable has remove and close functionality

### App Integration
- [ ] App.tsx manages comparison state (selectedProductIds, isComparisonActive)
- [ ] App.tsx has handlers for add/remove/clear comparison
- [ ] App.tsx conditionally renders comparison view vs catalog view
- [ ] ProductGrid passes comparison props to ProductCard
- [ ] Comparison limit enforced (max 4 products)
- [ ] Minimum enforced (2 products to view comparison)

### Styling and UX
- [ ] Comparison bar slides in/out smoothly
- [ ] Selected products have visual indicators (borders, checkmarks)
- [ ] Comparison table is responsive (stacks on mobile, columns on desktop)
- [ ] Price formatting is consistent and readable
- [ ] In Stock / Out of Stock badges are clear
- [ ] All transitions and animations work smoothly

### Logging
- [ ] All comparison actions logged with structured JSON
- [ ] Logs include contextual fields (product_id, product_count, etc.)
- [ ] Warning logged when attempting to exceed 4 product limit

### Testing
- [ ] Manual testing completed for all scenarios
- [ ] Responsive design verified on mobile, tablet, desktop
- [ ] Keyboard navigation works correctly
- [ ] Frontend linting passes (bun run check:fix)
- [ ] No console errors in browser

### Accessibility
- [ ] Keyboard navigation support (Tab, Enter, Escape)
- [ ] ARIA labels on interactive elements
- [ ] Focus management in comparison view
- [ ] Screen reader friendly

---

## VALIDATION COMMANDS

### Syntax & Style
```bash
cd project_4/app/frontend
bun run check:fix
```

### Type Checking
```bash
cd project_4/app/frontend
bunx tsc --noEmit
```

### Manual Testing
```bash
# Terminal 1: Start backend
cd project_4/app/backend
uv run python run_api.py

# Terminal 2: Start frontend
cd project_4/app/frontend
bun dev

# Open http://localhost:3000
# Follow test scenarios in TASK 6.1
```

---

## NOTES

### Key Implementation Decisions

1. **No Backend Changes Required**: The comparison feature is entirely frontend-based. The existing GET /api/products endpoint provides all needed data.

2. **State Management**: Using React useState for comparison state. For a larger app, consider Context API or state management library, but local state is sufficient here.

3. **Component Architecture**:
   - ComparisonBar: Fixed bottom bar for quick access to comparison
   - ComparisonTable: Full-page comparison view
   - ProductCard: Enhanced with selection capability
   - All components follow existing patterns in codebase

4. **Selection Limits**:
   - Minimum 2 products to view comparison (prevent useless comparison)
   - Maximum 4 products (UI/UX constraint, keeps table readable)

5. **Responsive Strategy**:
   - Desktop: Side-by-side table with columns
   - Mobile: Vertical stack with clear sections
   - Use Tailwind breakpoints: sm, md, lg

6. **Data Flow**:
   - App.tsx holds comparison state (source of truth)
   - ProductCard receives selection state and toggle handler (controlled component)
   - ComparisonBar displays selection count and controls
   - ComparisonTable receives filtered product array

7. **Price Formatting**: Create utility function for consistent USD formatting across components.

8. **Accessibility**: Follow WCAG 2.1 guidelines for keyboard navigation and screen readers.

9. **State Persistence**: Currently resets on page refresh. Could be enhanced with localStorage in future.

10. **Filtering Interaction**: When filters are applied, selected products remain selected even if filtered out of view. User can still access them via comparison bar.

---

## POTENTIAL ENHANCEMENTS (Out of Scope)

These are NOT required for the initial implementation but could be added later:

- Persist comparison selections in localStorage
- Share comparison via URL query parameters
- Print comparison table
- Export comparison as PDF or image
- Add more comparison fields (ratings, reviews, dimensions, etc.)
- Sorting within comparison table
- Drag-and-drop to reorder products in comparison
- Compare specific product features/attributes
- Add to cart directly from comparison table
- Comparison history (previously compared products)
