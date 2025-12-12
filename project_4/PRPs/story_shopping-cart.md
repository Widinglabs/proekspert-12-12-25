---
name: "Shopping Cart - Fullstack Implementation"
description: "Add-to-cart functionality with cart icon, item count badge, cart drawer/page, quantity adjustment, and total calculation"
---

## Original Story

```
Shopping Cart Feature

Add-to-cart functionality with cart icon showing item count, cart drawer/page,
quantity adjustment, and cart total calculation.

Requirements:
- Add to cart button on product cards
- Cart icon in header with badge showing total item count
- Cart drawer/page to view cart contents
- Quantity adjustment controls (increase/decrease)
- Cart total calculation displaying subtotal
- Remove item from cart functionality
- Clear cart option
- Persist cart state during session
```

## Story Metadata

**Story Type**: Feature (Fullstack)
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- Backend: `app/models/`, `app/services/`, `app/api/`
- Frontend: `src/types/`, `src/lib/`, `src/components/`, `src/App.tsx`

---

## CONTEXT REFERENCES

### Backend References
- `app/models/product.py` - Product model structure, use `product_id` for cart items
- `app/models/error.py` - ErrorResponse model for validation errors
- `app/services/product_service.py` - Service layer pattern, access `_PRODUCTS_DATABASE`
- `app/api/products.py` - API endpoint pattern with structured logging
- `app/core/logging_config.py` - StructuredLogger usage pattern
- `tests/conftest.py` - TestClient fixture pattern
- `tests/test_products_basic.py` - Test structure and naming conventions

### Frontend References
- `src/types/product.ts` - Product interface for cart items
- `src/types/error.ts` - ApiError class for error handling
- `src/lib/api-client.ts` - API client pattern for backend communication
- `src/lib/logger.ts` - Structured logging pattern (snake_case events)
- `src/components/ProductCard.tsx` - Card component pattern, add "Add to Cart" button
- `src/components/ui/button.tsx` - Button component styling
- `src/components/ui/card.tsx` - Card component for cart items
- `src/components/ui/input.tsx` - Number input for quantity
- `src/App.tsx` - State management pattern (useState + useCallback)

### Naming Conventions (CRITICAL)
- Backend: `cart_id`, `cart_item_id`, `cart_total_usd`, `item_quantity`
- Frontend: `cartItemId`, `cartTotalUsd`, `itemQuantity` (camelCase)
- All money fields use `_usd` suffix and Decimal type (backend) or string (frontend)
- Cart operations: `add_item_to_cart`, `remove_item_from_cart`, `update_cart_item_quantity`

### Cart State Management Strategy
- **Frontend-only state** (no backend persistence for this exercise)
- Use React Context or local state in App.tsx
- Cart stored as array of cart items: `{ product_id, quantity }`
- Calculate totals on frontend using product prices
- Cart persists during session only (no localStorage initially)

---

## IMPLEMENTATION TASKS

### Phase 1: Backend Implementation (Optional Validation Endpoints)

#### TASK 1.1: CREATE app/models/cart.py - Cart data models

- CREATE: New file `app/models/cart.py`
- ADD: CartItem Pydantic model
  ```python
  class CartItem(BaseModel):
      product_id: int = Field(..., gt=0, description="Product ID in cart")
      item_quantity: int = Field(..., gt=0, le=99, description="Quantity of item in cart")
  ```
- ADD: Cart Pydantic model
  ```python
  class Cart(BaseModel):
      cart_items: list[CartItem] = Field(default_factory=list, description="List of items in cart")
      cart_total_usd: Decimal = Field(..., ge=0, description="Total price of all items in USD")
      total_item_count: int = Field(..., ge=0, description="Total number of items (sum of quantities)")
  ```
- ADD: CartCalculationRequest model
  ```python
  class CartCalculationRequest(BaseModel):
      cart_items: list[CartItem] = Field(..., description="Cart items to calculate total for")
  ```
- IMPORTS: `from decimal import Decimal`, `from pydantic import BaseModel, Field`
- PATTERN: Follow existing Field() conventions with descriptions
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python -c "from app.models.cart import CartItem, Cart; print('Import OK')"`

#### TASK 1.2: CREATE app/services/cart_service.py - Cart calculation service

- CREATE: New file `app/services/cart_service.py`
- ADD: `calculate_cart_total()` function
  ```python
  def calculate_cart_total(cart_items: list[CartItem]) -> Cart:
      """
      Calculate cart total from product prices and quantities.

      Args:
          cart_items: List of cart items with product_id and quantity

      Returns:
          Cart object with items, total price, and item count

      Raises:
          ValueError: If product_id not found in database
      """
  ```
- IMPLEMENT:
  1. Log operation start with item count
  2. Loop through cart_items
  3. Find product in `_PRODUCTS_DATABASE` by product_id
  4. If not found, raise ValueError with product_id
  5. Calculate item_total = product.product_price_usd * item.item_quantity
  6. Sum all item_totals for cart_total_usd
  7. Sum all quantities for total_item_count
  8. Log operation completion with total
  9. Return Cart object
- IMPORTS: `from decimal import Decimal`, `from app.core.logging_config import StructuredLogger`, `from app.models.cart import CartItem, Cart`, `from app.services.product_service import _PRODUCTS_DATABASE`
- LOGGING PATTERN:
  ```python
  logger.info("calculating_cart_total_started",
      cart_items_count=len(cart_items),
      operation="calculate_cart_total")
  logger.info("calculating_cart_total_completed",
      cart_total_usd=str(cart_total_usd),
      total_item_count=total_item_count,
      operation="calculate_cart_total")
  ```
- GOTCHA: Handle missing products gracefully with descriptive error
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python -c "from app.services.cart_service import calculate_cart_total; print('Import OK')"`

#### TASK 1.3: CREATE app/api/cart.py - Cart calculation endpoint

- CREATE: New file `app/api/cart.py`
- ADD: POST /api/cart/calculate endpoint
  ```python
  @router.post("/calculate", response_model=Cart, responses={400: {"model": ErrorResponse}})
  async def calculate_cart(request: CartCalculationRequest) -> Cart | JSONResponse:
      """Calculate cart total from cart items."""
  ```
- IMPLEMENT:
  1. Log API request with cart items count
  2. Validate cart_items not empty, return 400 if empty
  3. Call cart_service.calculate_cart_total()
  4. Catch ValueError for invalid product_id, return 400
  5. Log response with total
  6. Return Cart object
- IMPORTS: `from fastapi import APIRouter`, `from fastapi.responses import JSONResponse`, `from app.core.logging_config import StructuredLogger`, `from app.models.cart import Cart, CartCalculationRequest`, `from app.models.error import ErrorResponse`, `from app.services import cart_service`
- ROUTER: `router = APIRouter(prefix="/api/cart", tags=["cart"])`
- ERROR HANDLING: Invalid product_id returns 400 with error_code="product_not_found"
- LOGGING: Log request and response with contextual fields
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python -c "from app.api.cart import router; print('Router OK')"`

#### TASK 1.4: UPDATE app/main.py - Register cart router

- UPDATE: Import cart router
  ```python
  from app.api import cart
  ```
- ADD: Include cart router in app
  ```python
  app.include_router(cart.router)
  ```
- FIND: Line with `app.include_router(products.router)`
- INSERT: After products router line
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python -c "from app.main import app; print('App OK')"`

#### TASK 1.5: CREATE tests/test_cart.py - Cart endpoint tests

- CREATE: New file `tests/test_cart.py`
- ADD: Test functions following naming pattern `test_<scenario>_<expected_result>`
- IMPLEMENT TEST CASES:
  1. `test_calculate_cart_with_single_item_returns_correct_total()` - One item
  2. `test_calculate_cart_with_multiple_items_returns_correct_total()` - Multiple items
  3. `test_calculate_cart_with_multiple_quantities_sums_correctly()` - Quantity > 1
  4. `test_calculate_cart_with_empty_items_returns_400()` - Empty cart validation
  5. `test_calculate_cart_with_invalid_product_id_returns_400()` - Product not found
- PATTERN: Use test_client fixture from conftest.py
- IMPORTS: `from fastapi.testclient import TestClient`, `from decimal import Decimal`
- STRUCTURE: Arrange-Act-Assert pattern with descriptive comments
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run pytest tests/test_cart.py -v`

#### TASK 1.6: VERIFY Backend - Run full test suite and linting

- RUN: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run pytest tests/ -v`
- RUN: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run ruff check . && uv run ruff format .`
- EXPECTED: All tests pass (including 5 new cart tests), no lint errors
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run pytest && uv run ruff check .`

---

### Phase 2: Frontend Implementation

#### TASK 2.1: CREATE src/types/cart.ts - Cart types

- CREATE: New file `src/types/cart.ts`
- ADD: CartItem interface
  ```typescript
  export interface CartItem {
    product_id: number;
    item_quantity: number;
  }
  ```
- ADD: CartItemWithProduct interface (for display)
  ```typescript
  export interface CartItemWithProduct {
    product: Product;
    item_quantity: number;
  }
  ```
- ADD: Cart interface
  ```typescript
  export interface Cart {
    cart_items: CartItem[];
    cart_total_usd: string;
    total_item_count: number;
  }
  ```
- IMPORTS: `import type { Product } from "./product";`
- COMMENT: Add JSDoc comments matching backend models
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.2: CREATE src/lib/cart-context.tsx - Cart state management

- CREATE: New file `src/lib/cart-context.tsx`
- IMPLEMENT: React Context for cart state
  ```typescript
  interface CartContextValue {
    cartItems: CartItemWithProduct[];
    totalItemCount: number;
    cartTotalUsd: string;
    addToCart: (product: Product) => void;
    removeFromCart: (productId: number) => void;
    updateQuantity: (productId: number, quantity: number) => void;
    clearCart: () => void;
  }
  ```
- IMPLEMENT: CartProvider component
  1. useState for cartItems: CartItemWithProduct[]
  2. useMemo for totalItemCount (sum of quantities)
  3. useMemo for cartTotalUsd (sum of price * quantity)
  4. addToCart: Check if exists, increment quantity, else add new
  5. removeFromCart: Filter out by product_id
  6. updateQuantity: Update quantity, remove if 0
  7. clearCart: Set cartItems to empty array
- LOGGING: Log all cart operations with structured JSON
  ```typescript
  logger.info("item_added_to_cart", {
    product_id: product.product_id,
    product_name: product.product_name,
    new_quantity: existingItem ? existingItem.item_quantity + 1 : 1,
    operation: "add_to_cart"
  });
  ```
- IMPORTS: `import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from "react"`, `import type { Product } from "@/types/product"`, `import type { CartItemWithProduct } from "@/types/cart"`, `import { logger } from "./logger"`
- PATTERN: Follow React Context best practices with custom hook
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.3: CREATE src/components/CartIcon.tsx - Header cart icon with badge

- CREATE: New file `src/components/CartIcon.tsx`
- PROPS INTERFACE:
  ```typescript
  interface CartIconProps {
    itemCount: number;
    onClick: () => void;
  }
  ```
- IMPLEMENT:
  1. Button with shopping cart icon (SVG)
  2. Badge showing itemCount (only show if > 0)
  3. onClick handler to open cart drawer
  4. Responsive styling with hover effects
  5. Accessible labels (aria-label)
- STYLING: Position badge absolutely on top-right of icon
- IMPORTS: `import { Button } from "@/components/ui/button"`
- ICON: Use simple SVG shopping cart icon
  ```tsx
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
  ```
- BADGE: Small red circle with white text
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.4: CREATE src/components/CartDrawer.tsx - Cart drawer/sidebar

- CREATE: New file `src/components/CartDrawer.tsx`
- PROPS INTERFACE:
  ```typescript
  interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItemWithProduct[];
    cartTotalUsd: string;
    onUpdateQuantity: (productId: number, quantity: number) => void;
    onRemoveItem: (productId: number) => void;
    onClearCart: () => void;
  }
  ```
- IMPLEMENT:
  1. Fixed overlay when open (backdrop)
  2. Slide-in drawer from right side
  3. Header with "Shopping Cart" title and close button
  4. Cart items list with CartItemRow components
  5. Empty state when no items ("Your cart is empty")
  6. Footer with total and "Clear Cart" button
  7. Close drawer on backdrop click or close button
- STYLING: Use Tailwind for slide animation, fixed positioning, z-index
- ANIMATION:
  ```typescript
  className={`transform transition-transform duration-300 ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`}
  ```
- IMPORTS: `import { Button } from "@/components/ui/button"`, `import { Card } from "@/components/ui/card"`, `import type { CartItemWithProduct } from "@/types/cart"`
- PATTERN: Three-state rendering (loading/empty/success) like ProductGrid
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.5: CREATE src/components/CartItemRow.tsx - Cart item display component

- CREATE: New file `src/components/CartItemRow.tsx`
- PROPS INTERFACE:
  ```typescript
  interface CartItemRowProps {
    cartItem: CartItemWithProduct;
    onUpdateQuantity: (productId: number, quantity: number) => void;
    onRemove: (productId: number) => void;
  }
  ```
- IMPLEMENT:
  1. Product name and category badge
  2. Unit price display
  3. Quantity controls: [-] [quantity] [+] buttons
  4. Line total (price * quantity)
  5. Remove button (X icon)
  6. Responsive grid layout
- QUANTITY CONTROLS:
  ```typescript
  <Button onClick={() => onUpdateQuantity(product_id, quantity - 1)} disabled={quantity <= 1}>-</Button>
  <span>{quantity}</span>
  <Button onClick={() => onUpdateQuantity(product_id, quantity + 1)} disabled={quantity >= 99}>+</Button>
  ```
- FORMATTING: Use Intl.NumberFormat for prices
- IMPORTS: `import { Button } from "@/components/ui/button"`, `import { Card, CardContent } from "@/components/ui/card"`, `import type { CartItemWithProduct } from "@/types/cart"`
- PATTERN: Follow ProductCard.tsx styling patterns
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.6: UPDATE src/components/ProductCard.tsx - Add "Add to Cart" button

- UPDATE: Add "Add to Cart" button to existing ProductCard
- PROPS ADD:
  ```typescript
  interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product) => void;  // Add this prop
  }
  ```
- ADD: Button below price/stock section
  ```tsx
  <Button
    onClick={() => onAddToCart(product)}
    className="w-full mt-4"
    disabled={!product.product_in_stock}
  >
    {product.product_in_stock ? "Add to Cart" : "Out of Stock"}
  </Button>
  ```
- IMPORTS ADD: `import { Button } from "@/components/ui/button"`
- STYLING: Full width button, primary color
- DISABLED STATE: Button disabled if not in stock
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.7: UPDATE src/components/ProductGrid.tsx - Pass addToCart handler

- UPDATE: Accept and pass onAddToCart prop to ProductCard
- PROPS ADD:
  ```typescript
  interface ProductGridProps {
    products: Product[];
    loading: boolean;
    onAddToCart: (product: Product) => void;  // Add this prop
  }
  ```
- UPDATE: ProductCard mapping to include onAddToCart
  ```tsx
  {products.map((product) => (
    <ProductCard
      key={product.product_id}
      product={product}
      onAddToCart={onAddToCart}  // Add this
    />
  ))}
  ```
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.8: UPDATE src/App.tsx - Integrate cart functionality

- UPDATE: Wrap app with CartProvider
- IMPORTS ADD:
  ```typescript
  import { CartProvider, useCart } from "@/lib/cart-context";
  import { CartIcon } from "@/components/CartIcon";
  import { CartDrawer } from "@/components/CartDrawer";
  ```
- ADD STATE: `const [isCartOpen, setIsCartOpen] = useState(false)`
- CREATE: Inner component to access cart context
  ```typescript
  function AppContent() {
    const { cartItems, totalItemCount, cartTotalUsd, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();
    // ... existing App logic
  }
  ```
- UPDATE: Header to include CartIcon
  ```tsx
  <div className="flex items-center justify-between">
    <h1>Product Catalog</h1>
    <CartIcon itemCount={totalItemCount} onClick={() => setIsCartOpen(true)} />
  </div>
  ```
- ADD: CartDrawer component
  ```tsx
  <CartDrawer
    isOpen={isCartOpen}
    onClose={() => setIsCartOpen(false)}
    cartItems={cartItems}
    cartTotalUsd={cartTotalUsd}
    onUpdateQuantity={updateQuantity}
    onRemoveItem={removeFromCart}
    onClearCart={clearCart}
  />
  ```
- UPDATE: ProductGrid to pass addToCart handler
  ```tsx
  <ProductGrid products={products} loading={loading} onAddToCart={addToCart} />
  ```
- STRUCTURE:
  ```typescript
  export function App() {
    return (
      <CartProvider>
        <AppContent />
      </CartProvider>
    );
  }
  ```
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.9: VERIFY Frontend - Run linting and type checking

- RUN: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`
- EXPECTED: No TypeScript errors, no Biome lint errors
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

---

### Phase 3: Integration Testing

#### TASK 3.1: Manual Integration Test - Backend API

- START BACKEND: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python run_api.py`
- TEST SCENARIOS (curl or API tester):
  1. POST /api/cart/calculate with single item
     ```bash
     curl -X POST http://localhost:8000/api/cart/calculate \
       -H "Content-Type: application/json" \
       -d '{"cart_items": [{"product_id": 1, "item_quantity": 2}]}' | jq
     ```
     Expected: Cart object with correct total
  2. POST /api/cart/calculate with multiple items
  3. POST /api/cart/calculate with empty items (should return 400)
  4. POST /api/cart/calculate with invalid product_id (should return 400)
- **VALIDATE**: All API responses match expected structure and status codes

#### TASK 3.2: Manual Integration Test - Frontend UI

- START BACKEND: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python run_api.py`
- START FRONTEND: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun dev`
- TEST SCENARIOS:
  1. Load page - cart icon shows 0 items
  2. Click "Add to Cart" on a product - badge updates to 1
  3. Click cart icon - drawer opens showing 1 item
  4. Increase quantity with [+] button - total updates
  5. Decrease quantity with [-] button - total updates
  6. Click [-] when quantity is 1 - button disabled
  7. Add same product again from grid - quantity increments
  8. Add different products - all show in cart
  9. Remove item with X button - item disappears
  10. Clear cart - all items removed, shows empty state
  11. Close drawer with close button or backdrop click
  12. Add product that's out of stock - button disabled
- VERIFY: Cart icon badge always matches total items
- VERIFY: Cart total always matches sum of (price * quantity)
- VERIFY: Console logs show structured JSON for cart operations
- **VALIDATE**: Manual verification in browser at http://localhost:3000

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Backend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run ruff check . --fix
uv run ruff format .

# Frontend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run check:fix
```

### Level 2: Unit Tests (Component Validation)

```bash
# Backend tests (must all pass)
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run pytest tests/ -v

# Expected: 17+ tests pass (12 existing + 5 cart tests)
```

### Level 3: Integration Testing (System Validation)

```bash
# Terminal 1: Start backend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run python run_api.py

# Terminal 2: Test cart API
curl -X POST http://localhost:8000/api/cart/calculate \
  -H "Content-Type: application/json" \
  -d '{"cart_items": [{"product_id": 1, "item_quantity": 2}]}' | jq

# Terminal 3: Start frontend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun dev
# Open http://localhost:3000 and test cart UI
```

---

## COMPLETION CHECKLIST

### Backend
- [ ] CartItem and Cart models created in app/models/cart.py
- [ ] calculate_cart_total() function implemented in app/services/cart_service.py
- [ ] POST /api/cart/calculate endpoint created in app/api/cart.py
- [ ] Cart router registered in app/main.py
- [ ] 5 cart tests created and passing in tests/test_cart.py
- [ ] Backend linting passes (ruff check)

### Frontend
- [ ] Cart types created in src/types/cart.ts
- [ ] CartProvider and context created in src/lib/cart-context.tsx
- [ ] CartIcon component created with badge
- [ ] CartDrawer component created with slide animation
- [ ] CartItemRow component created with quantity controls
- [ ] ProductCard updated with "Add to Cart" button
- [ ] ProductGrid updated to pass addToCart handler
- [ ] App.tsx integrated with cart provider and drawer
- [ ] Frontend linting passes (biome check)

### Integration Testing
- [ ] Backend API endpoints tested with curl
- [ ] Frontend UI tested in browser
- [ ] Cart badge updates correctly
- [ ] Cart total calculates correctly
- [ ] Quantity controls work as expected
- [ ] Empty state displays when cart is empty
- [ ] Console logs show structured cart operations

---

## Notes

### Key Implementation Decisions

1. **State Management**: Frontend-only cart state using React Context. No backend persistence for this exercise (can be added later).

2. **Cart Calculation**: Backend provides optional validation endpoint, but frontend calculates totals directly from product prices for better UX (no API call needed).

3. **Quantity Limits**: Min=1, Max=99 per item. Quantities below 1 trigger item removal.

4. **Drawer vs Modal**: Using slide-in drawer from right side (better UX for cart). Could be replaced with Sheet component if available.

5. **Empty Cart State**: Friendly message "Your cart is empty" with call-to-action to browse products.

6. **Badge Display**: Only show badge when itemCount > 0 to avoid clutter.

7. **Price Formatting**: Consistent use of Intl.NumberFormat for currency display across all components.

8. **Accessibility**: All interactive elements have proper aria-labels and keyboard support.

### Future Enhancements (Not Required)

- Persist cart to localStorage across sessions
- Add checkout flow
- Support for product variants (size, color)
- Promo codes and discounts
- Stock quantity validation
- Cart item thumbnails
- Toast notifications for cart actions

### Structured Logging Events

Backend:
- `calculating_cart_total_started`
- `calculating_cart_total_completed`
- `cart_calculation_failed`

Frontend:
- `item_added_to_cart`
- `item_removed_from_cart`
- `item_quantity_updated`
- `cart_cleared`
- `cart_drawer_opened`
- `cart_drawer_closed`
