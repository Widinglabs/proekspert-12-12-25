---
name: "Product Filtering - Fullstack Implementation"
description: "Backend filtering API + Frontend filter UI for product catalog"
---

## Original Stories

### TASK1: Backend Filtering API

```
[FEAT-1234] Add Product Filtering to Catalog API

Users need to filter and search products in the catalog API. Currently GET /api/products
returns all 30 products without filtering capabilities.

Requirements:
- Price filtering: Support minimum and maximum price filters
- Category filtering: Allow filtering by product category
- Keyword search: Search product names and descriptions
- Sorting: Enable sorting by price or name (both directions)

All filters should be optional and work together when combined.
```

### TASK2: Frontend Filter UI

```
[FEAT-1235] Add Product Filtering UI to Frontend

Build a product filtering interface that connects to the backend filtering API:
- Price range controls: Allow users to set minimum and maximum price filters
- Category selector: Enable filtering by product category
- Search input: Provide keyword search for product names and descriptions
- Sort controls: Allow users to sort results by price or name
- Filter management: Provide ability to apply and clear filters
```

## Story Metadata

**Story Type**: Feature (Fullstack)
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- Backend: `app/models/`, `app/services/`, `app/api/`
- Frontend: `src/lib/`, `src/components/`, `src/App.tsx`

---

## CONTEXT REFERENCES

### Backend References
- `app/models/product.py` - Product model with `ProductCategory` type alias, use for filter params
- `app/models/error.py` - ErrorResponse model for validation errors (invalid_price_range)
- `app/services/product_service.py` - Service layer pattern, `_PRODUCTS_DATABASE` list to filter
- `app/api/products.py` - API endpoint pattern with structured logging
- `app/core/logging_config.py` - StructuredLogger usage pattern
- `tests/test_products_filtering.py` - **8 skipped tests define exact expected behavior**
- `app/data/seed_products.py` - 30 products across 5 categories, prices $5.99-$499.99

### Frontend References
- `src/types/product.ts` - `ProductFilterParams` interface already defined
- `src/types/error.ts` - `ApiError` class for error handling
- `src/lib/api-client.ts` - `fetchProducts()` function to extend
- `src/lib/logger.ts` - Structured logging pattern (snake_case events)
- `src/components/ui/select.tsx` - Category dropdown component
- `src/components/ui/input.tsx` - Price/search inputs
- `src/components/ui/button.tsx` - Apply/Clear filter buttons
- `src/components/ui/form.tsx` - React Hook Form integration
- `src/App.tsx` - State management pattern (useState + useCallback)
- `src/components/ProductGrid.tsx` - Three-state pattern (loading/empty/success)

### Naming Conventions (CRITICAL)
- Backend query params: `min_price_usd`, `max_price_usd`, `category`, `search_keyword`
- Frontend interface uses: `minimum_price_usd`, `maximum_price_usd` (verbose)
- All fields use intention-revealing names with prefixes

---

## IMPLEMENTATION TASKS

### Phase 1: Backend Implementation

#### TASK 1.1: CREATE app/models/product.py - Add ProductFilterParameters

- ADD: `ProductFilterParameters` Pydantic model after `ProductListResponse`
- FIELDS:
  ```python
  min_price_usd: Decimal | None = Field(default=None, ge=0, description="Minimum price filter")
  max_price_usd: Decimal | None = Field(default=None, ge=0, description="Maximum price filter")
  category: ProductCategory | None = Field(default=None, description="Category filter")
  search_keyword: str | None = Field(default=None, max_length=100, description="Search in name/description")
  ```
- IMPORTS: Already have `Decimal`, `Field`, `ProductCategory` in file
- PATTERN: Follow existing Field() conventions with descriptions and examples
- **VALIDATE**: `cd project_4/app/backend && uv run python -c "from app.models.product import ProductFilterParameters; print('Import OK')"`

#### TASK 1.2: UPDATE app/services/product_service.py - Add filter_products function

- ADD: New function `filter_products()` after `get_all_products()`
- SIGNATURE:
  ```python
  def filter_products(
      min_price_usd: Decimal | None = None,
      max_price_usd: Decimal | None = None,
      category: str | None = None,
      search_keyword: str | None = None,
  ) -> list[Product]:
  ```
- IMPLEMENT:
  1. Start with `_PRODUCTS_DATABASE` copy
  2. Apply price filters: `product.product_price_usd >= min_price_usd`
  3. Apply category filter: `product.product_category == category`
  4. Apply keyword search: case-insensitive match in `product_name` OR `product_description`
  5. Log operation start and completion with contextual fields
- LOGGING PATTERN:
  ```python
  logger.info("filtering_products_started",
      min_price_usd=str(min_price_usd) if min_price_usd else None,
      max_price_usd=str(max_price_usd) if max_price_usd else None,
      category=category,
      search_keyword=search_keyword)
  logger.info("filtering_products_completed", total_results=len(results))
  ```
- IMPORTS: Add `from decimal import Decimal`
- **VALIDATE**: `cd project_4/app/backend && uv run python -c "from app.services.product_service import filter_products; print('Import OK')"`

#### TASK 1.3: UPDATE app/api/products.py - Add query parameters to endpoint

- UPDATE: `get_products()` function signature to accept Query parameters
- IMPORTS ADD:
  ```python
  from decimal import Decimal
  from fastapi import APIRouter, HTTPException, Query
  from app.models.error import ErrorResponse
  ```
- NEW SIGNATURE:
  ```python
  @router.get("", response_model=ProductListResponse, responses={400: {"model": ErrorResponse}})
  async def get_products(
      min_price_usd: Decimal | None = Query(default=None, ge=0, description="Minimum price in USD"),
      max_price_usd: Decimal | None = Query(default=None, ge=0, description="Maximum price in USD"),
      category: str | None = Query(default=None, description="Product category filter"),
      search_keyword: str | None = Query(default=None, max_length=100, description="Search keyword"),
  ) -> ProductListResponse:
  ```
- ADD VALIDATION: Check `min_price_usd <= max_price_usd` if both provided
  ```python
  if min_price_usd is not None and max_price_usd is not None:
      if min_price_usd > max_price_usd:
          logger.error("validation_failed",
              error_type="invalid_price_range",
              min_price_usd=str(min_price_usd),
              max_price_usd=str(max_price_usd),
              fix_suggestion="Ensure min_price_usd <= max_price_usd")
          raise HTTPException(
              status_code=400,
              detail=ErrorResponse(
                  error_code="invalid_price_range",
                  error_message="Minimum price cannot exceed maximum price",
                  error_details={"min_price_usd": str(min_price_usd), "max_price_usd": str(max_price_usd)}
              ).model_dump()
          )
  ```
- CALL SERVICE: Replace `product_service.get_all_products()` with `product_service.filter_products(...)`
- UPDATE LOGGING: Include filter params in request/response logs
- **VALIDATE**: `cd project_4/app/backend && uv run python -c "from app.api.products import router; print('Router OK')"`

#### TASK 1.4: ENABLE tests/test_products_filtering.py - Remove skip decorators

- REMOVE: All `@pytest.mark.skip(reason="Not implemented yet - this is your exercise!")` decorators
- COUNT: 8 tests to enable
- DO NOT MODIFY: Test logic itself - tests define expected behavior
- **VALIDATE**: `cd project_4/app/backend && uv run pytest tests/test_products_filtering.py -v`

#### TASK 1.5: VERIFY Backend - Run full test suite and linting

- RUN: `cd project_4/app/backend && uv run pytest tests/ -v`
- RUN: `cd project_4/app/backend && uv run ruff check . && uv run ruff format .`
- EXPECTED: All 12+ tests pass (4 basic + 8 filtering), no lint errors
- **VALIDATE**: `cd project_4/app/backend && uv run pytest && uv run ruff check .`

---

### Phase 2: Frontend Implementation

#### TASK 2.1: UPDATE src/lib/api-client.ts - Add filter params to fetchProducts

- UPDATE: `fetchProducts()` function to accept optional `ProductFilterParams`
- IMPORT ADD: `import type { ProductFilterParams } from "@/types/product";`
- NEW SIGNATURE:
  ```typescript
  export async function fetchProducts(filters?: ProductFilterParams): Promise<ProductListResponse>
  ```
- BUILD QUERY STRING:
  ```typescript
  const params = new URLSearchParams();
  if (filters?.minimum_price_usd !== undefined) params.append("min_price_usd", filters.minimum_price_usd.toString());
  if (filters?.maximum_price_usd !== undefined) params.append("max_price_usd", filters.maximum_price_usd.toString());
  if (filters?.category) params.append("category", filters.category);
  if (filters?.search_keyword) params.append("search_keyword", filters.search_keyword);
  const queryString = params.toString();
  const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;
  ```
- UPDATE LOGGING: Include filter params in log context
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 2.2: CREATE src/components/ProductFilters.tsx - Filter UI component

- CREATE: New component file
- IMPORTS:
  ```typescript
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { z } from "zod";
  import type { ProductCategory, ProductFilterParams } from "@/types/product";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
  import { logger } from "@/lib/logger";
  ```
- DEFINE: Zod validation schema
  ```typescript
  const filterFormSchema = z.object({
    minimum_price_usd: z.coerce.number().min(0).optional().or(z.literal("")),
    maximum_price_usd: z.coerce.number().min(0).optional().or(z.literal("")),
    category: z.enum(["electronics", "clothing", "home", "sports", "books"]).optional().or(z.literal("")),
    search_keyword: z.string().max(100).optional(),
  }).refine(
    (data) => {
      if (data.minimum_price_usd && data.maximum_price_usd) {
        return data.minimum_price_usd <= data.maximum_price_usd;
      }
      return true;
    },
    { message: "Minimum price cannot exceed maximum price", path: ["maximum_price_usd"] }
  );
  ```
- PROPS INTERFACE:
  ```typescript
  interface ProductFiltersProps {
    onFilterChange: (filters: ProductFilterParams) => void;
    loading?: boolean;
  }
  ```
- IMPLEMENT:
  1. Form with React Hook Form + Zod resolver
  2. Category Select dropdown (5 categories + "All Categories" option)
  3. Min/Max price number inputs
  4. Search keyword text input
  5. Apply Filters button (type="submit")
  6. Clear Filters button (resets form and calls onFilterChange with empty object)
- LOGGING: Log filter changes with structured JSON
  ```typescript
  logger.info("filters_applied", {
    category: values.category || null,
    minimum_price_usd: values.minimum_price_usd || null,
    maximum_price_usd: values.maximum_price_usd || null,
    search_keyword: values.search_keyword || null,
    operation: "apply_filters"
  });
  ```
- LAYOUT: Use responsive grid (stack on mobile, row on desktop)
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 2.3: UPDATE src/App.tsx - Integrate filters with state management

- ADD STATE:
  ```typescript
  const [filters, setFilters] = useState<ProductFilterParams>({});
  ```
- UPDATE: `loadProducts` callback to accept and use filters
  ```typescript
  const loadProducts = useCallback(async (filterParams?: ProductFilterParams) => {
    // ... existing loading/error logic
    const data = await fetchProducts(filterParams);
    // ...
  }, []);
  ```
- ADD: `handleFilterChange` callback
  ```typescript
  const handleFilterChange = useCallback((newFilters: ProductFilterParams) => {
    setFilters(newFilters);
    loadProducts(newFilters);
  }, [loadProducts]);
  ```
- UPDATE: Initial useEffect to pass empty filters
- IMPORT: `ProductFilters` component and `ProductFilterParams` type
- ADD TO JSX: Place `<ProductFilters>` component above `<ProductGrid>` in main section
  ```tsx
  <ProductFilters onFilterChange={handleFilterChange} loading={loading} />
  ```
- UPDATE LOGGING: Include filters in load operation logs
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 2.4: VERIFY Frontend - Run linting and type checking

- RUN: `cd project_4/app/frontend && bun run check:fix`
- EXPECTED: No TypeScript errors, no Biome lint errors
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 3: Integration Testing

#### TASK 3.1: Manual Integration Test

- START BACKEND: `cd project_4/app/backend && uv run python run_api.py`
- START FRONTEND: `cd project_4/app/frontend && bun dev`
- TEST SCENARIOS:
  1. Load page - should show all 30 products
  2. Filter by category "electronics" - should show 8 products
  3. Filter by price range $25-$50 - verify price constraints
  4. Search "wireless" - verify name/description match
  5. Combine category + price - verify multiple filters work
  6. Invalid price range (min > max) - should show validation error
  7. Clear filters - should return to all 30 products
- **VALIDATE**: Manual verification in browser at http://localhost:3000

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Backend
cd project_4/app/backend
uv run ruff check . --fix
uv run ruff format .

# Frontend
cd project_4/app/frontend
bun run check:fix
```

### Level 2: Unit Tests (Component Validation)

```bash
# Backend tests (must all pass)
cd project_4/app/backend
uv run pytest tests/ -v

# Expected: 12+ tests pass (4 basic + 8 filtering)
```

### Level 3: Integration Testing (System Validation)

```bash
# Terminal 1: Start backend
cd project_4/app/backend
uv run python run_api.py

# Terminal 2: Test API directly
curl "http://localhost:8000/api/products?category=electronics" | jq '.total_count'
# Expected: 8

curl "http://localhost:8000/api/products?min_price_usd=100&max_price_usd=50" | jq '.error_code'
# Expected: "invalid_price_range"

# Terminal 3: Start frontend
cd project_4/app/frontend
bun dev
# Open http://localhost:3000 and test UI
```

---

## COMPLETION CHECKLIST

- [ ] ProductFilterParameters model created in app/models/product.py
- [ ] filter_products() function implemented in app/services/product_service.py
- [ ] API endpoint updated with query parameters and validation
- [ ] All 8 filtering tests enabled and passing
- [ ] Backend linting passes (ruff check)
- [ ] fetchProducts() updated to accept filter params
- [ ] ProductFilters component created with form validation
- [ ] App.tsx integrated with filter state management
- [ ] Frontend linting passes (biome check)
- [ ] Manual integration testing completed
- [ ] All acceptance criteria from TASK1.md and TASK2.md met

---

## Notes

### Key Implementation Decisions

1. **Query param naming**: Backend uses `min_price_usd`/`max_price_usd` (shorter), frontend interface uses `minimum_price_usd`/`maximum_price_usd` (verbose). API client handles mapping.

2. **Validation location**: Price range validation happens in both:
   - Frontend: Zod schema with `.refine()` for immediate user feedback
   - Backend: HTTPException for API contract enforcement

3. **Empty string handling**: Form inputs return empty strings, need to convert to undefined/null before API call.

4. **Category "All" option**: Use empty string or undefined to represent "no category filter" in Select component.

5. **Sorting**: `ProductFilterParams` includes `sort_by` but tests don't require it. Can be added as enhancement but not required for acceptance criteria.
