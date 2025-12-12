---
name: "Product Detail Page - Fullstack Implementation"
description: "Backend product detail endpoint + Frontend detail page with routing for viewing individual products"
---

## Original Story

```
Product Detail Page

Click a product card to view a dedicated detail page with larger images, full description,
specifications, and related products section.
```

## Story Metadata

**Story Type**: Feature (Fullstack)
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- Backend: `app/api/`, `app/services/`
- Frontend: `src/components/`, `src/lib/`, `src/App.tsx` (routing), `src/types/`

---

## CONTEXT REFERENCES

### Backend References
- `app/models/product.py` - Product model with all fields, reuse for detail response
- `app/models/error.py` - ErrorResponse model for 404 not found errors
- `app/services/product_service.py` - Service layer pattern, `_PRODUCTS_DATABASE` to query by ID
- `app/api/products.py` - Existing router and endpoint patterns with structured logging
- `app/core/logging_config.py` - StructuredLogger usage for all operations
- `app/data/seed_products.py` - 30 products with IDs 1-30, categories for related products

### Frontend References
- `src/types/product.ts` - Product interface matching backend model exactly
- `src/types/error.ts` - ApiError class for 404 handling
- `src/lib/api-client.ts` - Existing fetchProducts pattern to extend for single product
- `src/lib/logger.ts` - Structured logging pattern (snake_case events)
- `src/components/ProductCard.tsx` - Product display patterns (price formatting, category colors)
- `src/components/ProductGrid.tsx` - Grid layout for related products
- `src/components/ui/card.tsx` - Card component for detail sections
- `src/components/ui/button.tsx` - Back button and action buttons
- `src/App.tsx` - App component structure, will need routing added
- `package.json` - No routing library currently installed, need to add one

### Naming Conventions (CRITICAL)
- Backend route: `/api/products/{product_id}` (path parameter)
- Service function: `get_product_by_id(product_id: int) -> Product | None`
- Frontend route: `/products/:productId` (React Router convention)
- All fields maintain verbose naming: `product_id`, `product_name`, etc.

### Key Architectural Decisions
- **Routing Library**: Use React Router v6 (industry standard, matches verbose naming)
- **Related Products Logic**: Same category, exclude current product, limit to 3-4 items
- **404 Handling**: Backend returns 404 with ErrorResponse, frontend shows friendly error page
- **Navigation**: Product cards become clickable links, detail page has back button
- **Image Handling**: No images in seed data, use placeholder with product category color

---

## IMPLEMENTATION TASKS

### Phase 1: Backend API Implementation

#### TASK 1.1: UPDATE app/services/product_service.py - Add get_product_by_id function

- ADD: New function `get_product_by_id()` after `filter_products()`
- SIGNATURE:
  ```python
  def get_product_by_id(product_id: int) -> Product | None:
      """
      Retrieve a single product by its ID.

      Args:
          product_id: Unique identifier of the product to retrieve

      Returns:
          Product object if found, None if product_id doesn't exist

      Example:
          >>> product = get_product_by_id(1)
          >>> product.product_name
          'Wireless Bluetooth Mouse'
      """
  ```
- IMPLEMENT:
  1. Log operation start with product_id
  2. Search `_PRODUCTS_DATABASE` for product with matching product_id
  3. Log result (found or not_found)
  4. Return Product or None
- LOGGING PATTERN:
  ```python
  logger.info("retrieving_product_by_id", product_id=product_id, operation="get_product_by_id")
  if product:
      logger.info("product_found", product_id=product_id, product_name=product.product_name)
  else:
      logger.warning("product_not_found", product_id=product_id)
  ```
- IMPORTS: No new imports needed
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python -c "from app.services.product_service import get_product_by_id; print('Import OK')"`

#### TASK 1.2: UPDATE app/services/product_service.py - Add get_related_products function

- ADD: New function `get_related_products()` after `get_product_by_id()`
- SIGNATURE:
  ```python
  def get_related_products(product_id: int, limit: int = 4) -> list[Product]:
      """
      Get related products based on category.

      Returns products from the same category as the specified product,
      excluding the product itself. Results are limited to avoid overwhelming UI.

      Args:
          product_id: ID of the product to find related items for
          limit: Maximum number of related products to return (default 4)

      Returns:
          List of Product objects from same category (excluding current product)

      Example:
          >>> related = get_related_products(1, limit=3)
          >>> all(p.product_category == "electronics" for p in related)
          True
          >>> all(p.product_id != 1 for p in related)
          True
      """
  ```
- IMPLEMENT:
  1. Get the current product using get_product_by_id
  2. If product not found, return empty list
  3. Filter products by same category, excluding current product_id
  4. Limit results to specified number
  5. Log operation with category and count
- LOGGING PATTERN:
  ```python
  logger.info("finding_related_products", product_id=product_id, limit=limit)
  logger.info("related_products_found", product_id=product_id, category=current_product.product_category, count=len(results))
  ```
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python -c "from app.services.product_service import get_related_products; print('Import OK')"`

#### TASK 1.3: UPDATE app/api/products.py - Add GET product by ID endpoint

- ADD: New endpoint function after existing `get_products()` function
- IMPORTS ADD:
  ```python
  from fastapi import APIRouter, HTTPException, Query
  from fastapi.responses import JSONResponse
  ```
- NEW ENDPOINT:
  ```python
  @router.get("/{product_id}", response_model=Product, responses={404: {"model": ErrorResponse}})
  async def get_product_by_id(
      product_id: int,
  ) -> Product | JSONResponse:
      """
      Get a single product by its ID.

      Args:
          product_id: Unique identifier of the product (must be positive integer)

      Returns:
          Product object with full details

      Raises:
          HTTPException: 404 error if product_id doesn't exist

      Example Response:
          {
              "product_id": 1,
              "product_name": "Wireless Bluetooth Mouse",
              "product_description": "Ergonomic wireless mouse...",
              "product_price_usd": "29.99",
              "product_category": "electronics",
              "product_in_stock": true
          }
      """
  ```
- IMPLEMENT:
  1. Log incoming request with product_id
  2. Call `product_service.get_product_by_id(product_id)`
  3. If None, raise HTTPException 404 with ErrorResponse
  4. Log success and return Product
- ERROR HANDLING:
  ```python
  if product is None:
      logger.warning("product_not_found_api", product_id=product_id, endpoint=f"/api/products/{product_id}")
      return JSONResponse(
          status_code=404,
          content=ErrorResponse(
              error_code="product_not_found",
              error_message=f"Product with ID {product_id} not found",
              error_details={"product_id": product_id}
          ).model_dump()
      )
  ```
- LOGGING:
  ```python
  logger.info("api_request_received", endpoint=f"/api/products/{product_id}", http_method="GET", product_id=product_id)
  logger.info("api_response_prepared", endpoint=f"/api/products/{product_id}", product_id=product_id, product_name=product.product_name)
  ```
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python -c "from app.api.products import router; print('Router OK')"`

#### TASK 1.4: UPDATE app/api/products.py - Add GET related products endpoint

- ADD: New endpoint function after `get_product_by_id()`
- NEW ENDPOINT:
  ```python
  @router.get("/{product_id}/related", response_model=ProductListResponse, responses={404: {"model": ErrorResponse}})
  async def get_related_products_endpoint(
      product_id: int,
      limit: int = Query(default=4, ge=1, le=10, description="Maximum number of related products to return"),
  ) -> ProductListResponse | JSONResponse:
      """
      Get related products for a specific product.

      Returns products from the same category as the specified product,
      excluding the product itself.

      Args:
          product_id: ID of the product to find related items for
          limit: Maximum number of related products (1-10, default 4)

      Returns:
          ProductListResponse with related products

      Raises:
          HTTPException: 404 if product_id doesn't exist
      """
  ```
- IMPLEMENT:
  1. Verify product exists (call get_product_by_id)
  2. If not found, return 404
  3. Call `product_service.get_related_products(product_id, limit)`
  4. Return ProductListResponse
- LOGGING: Log request, product verification, and response
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && curl http://localhost:8000/api/products/1/related | jq '.total_count'`

#### TASK 1.5: CREATE tests/test_products_detail.py - Add tests for detail endpoints

- CREATE: New test file
- IMPORTS:
  ```python
  import pytest
  from fastapi.testclient import TestClient
  from app.main import app
  ```
- TEST CASES:
  1. `test_get_product_by_id_returns_product` - Valid ID returns 200 and product
  2. `test_get_product_by_id_invalid_returns_404` - Invalid ID (999) returns 404
  3. `test_get_related_products_returns_same_category` - Related products same category
  4. `test_get_related_products_excludes_current` - Current product not in related
  5. `test_get_related_products_respects_limit` - Limit parameter works
  6. `test_get_related_products_invalid_id_returns_404` - Invalid ID returns 404
- PATTERN: Follow existing test structure in `tests/test_products_basic.py`
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run pytest tests/test_products_detail.py -v`

#### TASK 1.6: VERIFY Backend - Run all tests and linting

- RUN: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run pytest tests/ -v`
- RUN: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run ruff check . && uv run ruff format .`
- EXPECTED: All tests pass (basic + filtering + detail), no lint errors
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run pytest && uv run ruff check .`

---

### Phase 2: Frontend Routing Setup

#### TASK 2.1: ADD react-router-dom to frontend dependencies

- INSTALL: React Router v6
- COMMAND: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun add react-router-dom`
- VERIFY: Check package.json has react-router-dom dependency
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun install && grep react-router-dom package.json`

#### TASK 2.2: UPDATE src/lib/api-client.ts - Add fetchProductById function

- ADD: New function after `fetchProducts()`
- SIGNATURE:
  ```typescript
  /**
   * Fetch a single product by its ID.
   *
   * Backend endpoint: GET /api/products/{product_id}
   * Response model: Product
   *
   * @param productId - Unique identifier of the product to fetch
   * @returns Product object with full details
   * @throws ApiError if product not found (404) or other API error
   * @throws Error if network failure
   *
   * Example usage:
   * ```typescript
   * try {
   *   const product = await fetchProductById(1);
   *   console.log(product.product_name);
   * } catch (error) {
   *   if (error instanceof ApiError && error.statusCode === 404) {
   *     console.error('Product not found');
   *   }
   * }
   * ```
   */
  export async function fetchProductById(productId: number): Promise<Product>
  ```
- IMPLEMENT:
  1. Build URL with product_id path parameter
  2. Log operation with product_id
  3. Fetch from `/api/products/${productId}`
  4. Handle 404 specifically (product not found)
  5. Parse and return Product
- IMPORTS ADD: `import type { Product } from "@/types/product";`
- ERROR HANDLING: Distinguish 404 (not found) from other errors in logs
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.3: UPDATE src/lib/api-client.ts - Add fetchRelatedProducts function

- ADD: New function after `fetchProductById()`
- SIGNATURE:
  ```typescript
  /**
   * Fetch related products for a specific product.
   *
   * Backend endpoint: GET /api/products/{product_id}/related
   * Response model: ProductListResponse
   *
   * @param productId - ID of product to find related items for
   * @param limit - Maximum number of related products (default 4)
   * @returns ProductListResponse with related products
   * @throws ApiError if product not found or API error
   * @throws Error if network failure
   */
  export async function fetchRelatedProducts(
    productId: number,
    limit: number = 4
  ): Promise<ProductListResponse>
  ```
- IMPLEMENT:
  1. Build URL with product_id and limit query param
  2. Fetch from `/api/products/${productId}/related?limit=${limit}`
  3. Parse and return ProductListResponse
- LOGGING: Log request and response
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

---

### Phase 3: Frontend Components Implementation

#### TASK 3.1: CREATE src/pages/ProductListPage.tsx - Extract list view to separate component

- CREATE: New page component
- PURPOSE: Move current App.tsx main content to dedicated list page component
- IMPORTS:
  ```typescript
  import { useCallback, useEffect, useState } from "react";
  import { ProductFilters } from "@/components/ProductFilters";
  import { ProductGrid } from "@/components/ProductGrid";
  import { fetchProducts } from "@/lib/api-client";
  import { logger } from "@/lib/logger";
  import { ApiError } from "@/types/error";
  import type { Product, ProductFilterParams } from "@/types/product";
  ```
- COMPONENT STRUCTURE:
  ```typescript
  export function ProductListPage() {
    // Same state management as current App.tsx
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<ProductFilterParams>({});

    // Same loadProducts and handleFilterChange logic
    // ...

    return (
      <div className="container mx-auto px-4 py-8">
        <ProductFilters onFilterChange={handleFilterChange} loading={loading} />
        {error ? (/* error UI */) : <ProductGrid products={products} loading={loading} />}
      </div>
    );
  }
  ```
- PATTERN: Mirror existing App.tsx state management exactly
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 3.2: CREATE src/pages/ProductDetailPage.tsx - Product detail page component

- CREATE: New page component for individual product view
- IMPORTS:
  ```typescript
  import { useEffect, useState } from "react";
  import { useParams, useNavigate, Link } from "react-router-dom";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { ProductGrid } from "@/components/ProductGrid";
  import { fetchProductById, fetchRelatedProducts } from "@/lib/api-client";
  import { logger } from "@/lib/logger";
  import { ApiError } from "@/types/error";
  import type { Product } from "@/types/product";
  ```
- COMPONENT STRUCTURE:
  ```typescript
  export function ProductDetailPage() {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Load product and related products on mount/productId change
    useEffect(() => {
      // Fetch logic
    }, [productId]);

    return (/* detail layout */);
  }
  ```
- LAYOUT SECTIONS:
  1. Back button (navigate to "/")
  2. Product details card with:
     - Product name (h1)
     - Category badge (reuse ProductCard color logic)
     - Large price display
     - Stock status
     - Full description
     - Placeholder image area (colored div based on category)
  3. Related products section with ProductGrid
- LOADING STATE: Show spinner while fetching
- ERROR STATE:
  - 404: "Product not found" with link back to catalog
  - Other errors: Generic error with retry button
- LOGGING: Log page view, product load, related products load
- ACCESSIBILITY: Use semantic HTML, proper heading hierarchy
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 3.3: UPDATE src/components/ProductCard.tsx - Make cards clickable links

- UPDATE: Wrap card content in React Router Link
- IMPORTS ADD: `import { Link } from "react-router-dom";`
- CHANGE:
  ```typescript
  return (
    <Link to={`/products/${product.product_id}`} className="block h-full">
      <Card className="h-full flex flex-col transition-shadow hover:shadow-lg cursor-pointer">
        {/* existing card content */}
      </Card>
    </Link>
  );
  ```
- STYLING: Ensure link doesn't override card styles, add cursor-pointer
- ACCESSIBILITY: Link wraps entire card for keyboard navigation
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 3.4: UPDATE src/App.tsx - Add routing with BrowserRouter

- UPDATE: Replace current structure with React Router setup
- IMPORTS REPLACE:
  ```typescript
  import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
  import { ProductListPage } from "@/pages/ProductListPage";
  import { ProductDetailPage } from "@/pages/ProductDetailPage";
  import "./index.css";
  ```
- NEW STRUCTURE:
  ```typescript
  export function App() {
    return (
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          {/* Header with Link to home */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 py-6">
              <Link to="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-3xl font-bold">Product Catalog</h1>
              </Link>
            </div>
          </header>

          <main>
            <Routes>
              <Route path="/" element={<ProductListPage />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {/* Footer stays same */}
          <footer className="border-t mt-12 py-6">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>Product Catalog API - Module 1 Exercise</p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    );
  }
  ```
- ADD: Simple NotFoundPage inline component for 404 route
- PATTERN: Keep header and footer consistent across routes
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 3.5: CREATE src/pages/NotFoundPage.tsx - 404 page component

- CREATE: Simple 404 page
- COMPONENT:
  ```typescript
  import { Link } from "react-router-dom";

  export function NotFoundPage() {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="text-primary hover:underline">
          Return to Product Catalog
        </Link>
      </div>
    );
  }
  ```
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 3.6: VERIFY Frontend - Run linting and type checking

- RUN: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`
- EXPECTED: No TypeScript errors, no Biome lint errors
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

---

### Phase 4: Integration Testing

#### TASK 4.1: Manual Integration Test

- START BACKEND: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python run_api.py`
- START FRONTEND: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun dev`
- TEST SCENARIOS:
  1. **Product List Page (/)**:
     - Loads all 30 products
     - Product cards are clickable
     - Filters still work
  2. **Navigate to Detail Page**:
     - Click on product card
     - URL changes to `/products/1`
     - Detail page loads with product info
  3. **Detail Page Content**:
     - Product name, price, description displayed
     - Category badge shows correct color
     - Stock status visible
     - Back button navigates to home
  4. **Related Products**:
     - Shows 3-4 related products from same category
     - Current product not in related list
     - Related products are clickable
  5. **Navigation Between Details**:
     - Click related product
     - URL and content update to new product
     - Related products refresh for new product
  6. **Invalid Product ID**:
     - Navigate to `/products/999`
     - Shows 404 error message
     - Provides link back to catalog
  7. **Browser Navigation**:
     - Back button works correctly
     - Forward button works
     - Direct URL entry works
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

# Expected: All tests pass (basic + filtering + detail)
```

### Level 3: Integration Testing (System Validation)

```bash
# Terminal 1: Start backend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run python run_api.py

# Terminal 2: Test API directly
curl "http://localhost:8000/api/products/1" | jq '.product_name'
# Expected: "Wireless Bluetooth Mouse"

curl "http://localhost:8000/api/products/999" | jq '.error_code'
# Expected: "product_not_found"

curl "http://localhost:8000/api/products/1/related" | jq '.total_count'
# Expected: 3-7 (other electronics)

# Terminal 3: Start frontend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun dev
# Open http://localhost:3000 and test UI
```

---

## COMPLETION CHECKLIST

### Backend
- [ ] get_product_by_id() function implemented in product_service.py
- [ ] get_related_products() function implemented in product_service.py
- [ ] GET /api/products/{product_id} endpoint created
- [ ] GET /api/products/{product_id}/related endpoint created
- [ ] test_products_detail.py created with 6 tests
- [ ] All backend tests passing
- [ ] Backend linting passes (ruff check)

### Frontend
- [ ] react-router-dom installed
- [ ] fetchProductById() added to api-client.ts
- [ ] fetchRelatedProducts() added to api-client.ts
- [ ] ProductListPage component created
- [ ] ProductDetailPage component created
- [ ] NotFoundPage component created
- [ ] ProductCard updated with Link wrapper
- [ ] App.tsx updated with BrowserRouter and Routes
- [ ] Frontend linting passes (biome check)

### Integration
- [ ] Product list page displays and filters work
- [ ] Clicking product navigates to detail page
- [ ] Detail page shows full product information
- [ ] Related products section displays correctly
- [ ] Navigation between products works
- [ ] Invalid product ID shows 404 error
- [ ] Browser back/forward navigation works
- [ ] Manual integration testing completed

---

## Notes

### Key Implementation Decisions

1. **Routing Library Choice**: React Router v6 chosen for:
   - Industry standard, widely used
   - Good TypeScript support
   - Simple API for basic routing needs
   - No alternatives currently installed

2. **URL Structure**:
   - List page: `/` (home route)
   - Detail page: `/products/:productId` (RESTful convention)
   - 404 fallback: `*` wildcard route

3. **Related Products Logic**:
   - Filter by same category as current product
   - Exclude current product from results
   - Limit to 4 products to avoid UI clutter
   - Use existing ProductGrid component for consistency

4. **Image Placeholders**:
   - No images in seed data
   - Use colored div with category color
   - Could display product_id or first letter of name

5. **Error Handling**:
   - Backend: 404 with ErrorResponse model for not found
   - Frontend: Distinguish 404 (product not found) from network errors
   - Provide clear user feedback with recovery options

6. **State Management**:
   - No need for global state (Redux, etc.)
   - Each page manages its own loading/error state
   - React Router handles navigation state

7. **Component Reuse**:
   - ProductCard: Used in list and related products
   - ProductGrid: Used in list page and detail page (related)
   - Card, Button: Reuse existing shadcn components

8. **Backwards Compatibility**:
   - Existing filter functionality preserved
   - List page maintains all current features
   - Only adds new detail page route
