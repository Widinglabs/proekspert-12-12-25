---
name: "Product Sorting - Fullstack Implementation"
description: "Add sorting functionality to product catalog API and UI"
---

## Original Story

```
Product Sorting Feature

Add sorting options to the product catalog: price (low→high, high→low),
name (A-Z, Z-A), newest first. This requires a simple backend query
parameter and a frontend dropdown component.

Requirements:
- Sort by price: ascending (low to high) and descending (high to low)
- Sort by name: ascending (A-Z) and descending (Z-A)
- Sort by newest: newest products first (by product_id descending)
- Default sorting: newest first when no sort parameter provided
- Sorting should work independently and also combine with existing filters

All sorting options should be accessible via dropdown in the UI.
```

## Story Metadata

**Story Type**: Feature (Fullstack Enhancement)
**Estimated Complexity**: Low
**Primary Systems Affected**:
- Backend: `app/services/product_service.py`, `app/api/products.py`
- Frontend: `src/lib/api-client.ts`, `src/components/ProductFilters.tsx`, `src/App.tsx`

---

## CONTEXT REFERENCES

### Backend References
- `app/models/product.py` - Product model with sortable fields: `product_price_usd`, `product_name`, `product_id`
- `app/services/product_service.py` - `filter_products()` function to extend with sorting logic
- `app/api/products.py` - API endpoint to add `sort_by` query parameter
- `app/core/logging_config.py` - StructuredLogger usage pattern for logging sort operations
- `app/data/seed_products.py` - 30 products with IDs 1-30, various names and prices

### Frontend References
- `src/types/product.ts` - `ProductFilterParams` interface already has `sort_by` field defined
- `src/lib/api-client.ts` - `fetchProducts()` function to extend with sort_by parameter
- `src/components/ProductFilters.tsx` - Add sorting dropdown component
- `src/components/ui/select.tsx` - Select component for dropdown UI
- `src/App.tsx` - State management pattern for filters

### Existing Patterns
- Backend filtering implemented in `filter_products()` - extend with sorting
- Frontend `ProductFilterParams` already has `sort_by?: "price_asc" | "price_desc" | "name_asc" | "name_desc"`
- Need to add `"newest"` option to match requirements
- Structured JSON logging with contextual fields throughout
- Verbose naming convention: all fields prefixed (product_id, product_name, etc.)

### Key Insights
1. Filtering is already implemented - sorting is the missing piece
2. `ProductFilterParams.sort_by` type needs to include "newest" option
3. Backend service layer pattern: filter first, then sort results
4. Frontend form validation uses Zod schemas
5. All operations logged with structured JSON

---

## IMPLEMENTATION TASKS

### Phase 1: Backend Implementation

#### TASK 1.1: UPDATE app/services/product_service.py - Add sorting logic to filter_products

- LOCATE: `filter_products()` function (lines 49-116)
- ADD PARAMETER: `sort_by: str | None = None` to function signature after `search_keyword`
- ADD SORTING LOGIC: After all filtering is complete (after line 108), before final logging:
  ```python
  # Apply sorting if requested
  if sort_by == "price_asc":
      results.sort(key=lambda p: p.product_price_usd)
  elif sort_by == "price_desc":
      results.sort(key=lambda p: p.product_price_usd, reverse=True)
  elif sort_by == "name_asc":
      results.sort(key=lambda p: p.product_name.lower())
  elif sort_by == "name_desc":
      results.sort(key=lambda p: p.product_name.lower(), reverse=True)
  elif sort_by == "newest":
      results.sort(key=lambda p: p.product_id, reverse=True)
  # If sort_by is None or unrecognized, keep default order (newest first by insertion)
  ```
- UPDATE LOGGING: Add `sort_by` parameter to both logger.info calls
  ```python
  logger.info("filtering_products_started",
      min_price_usd=str(min_price_usd) if min_price_usd is not None else None,
      max_price_usd=str(max_price_usd) if max_price_usd is not None else None,
      category=category,
      search_keyword=search_keyword,
      sort_by=sort_by,  # ADD THIS
      operation="filter_products")

  logger.info("filtering_products_completed",
      total_results=len(results),
      sort_by=sort_by,  # ADD THIS
      operation="filter_products")
  ```
- UPDATE DOCSTRING: Add sort_by parameter documentation with examples
- PATTERN: Follow existing filter parameter pattern (optional, None default)
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python -c "from app.services.product_service import filter_products; from decimal import Decimal; products = filter_products(sort_by='price_asc'); print(f'Sorted {len(products)} products'); print(f'First: {products[0].product_name} - ${products[0].product_price_usd}')"`

#### TASK 1.2: UPDATE app/api/products.py - Add sort_by query parameter

- LOCATE: `get_products()` function signature (lines 25-31)
- ADD QUERY PARAMETER: After `search_keyword` parameter:
  ```python
  sort_by: str | None = Query(
      default=None,
      description="Sort order: price_asc, price_desc, name_asc, name_desc, newest",
      pattern="^(price_asc|price_desc|name_asc|name_desc|newest)$"
  )
  ```
- UPDATE SERVICE CALL: Add sort_by to `product_service.filter_products()` call (around line 97):
  ```python
  products = product_service.filter_products(
      min_price_usd=min_price_usd,
      max_price_usd=max_price_usd,
      category=category,
      search_keyword=search_keyword,
      sort_by=sort_by,  # ADD THIS
  )
  ```
- UPDATE LOGGING: Add sort_by to both logger calls (lines 67-76 and 104-109)
- UPDATE DOCSTRING: Add sort_by parameter to Args section with examples
- IMPORTS: Already have Query imported
- PATTERN: Follow existing query parameter pattern with validation
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python -c "from app.api.products import router; print('Router import OK')"`

#### TASK 1.3: VERIFY Backend - Run linting and manual API test

- RUN LINTING: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run ruff check . && uv run ruff format .`
- EXPECTED: No lint errors, all files formatted
- MANUAL TEST (if backend running):
  - Start backend: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python run_api.py`
  - Test endpoints:
    - `curl "http://localhost:8000/api/products?sort_by=price_asc" | jq '.products[0].product_price_usd'` (should show lowest price)
    - `curl "http://localhost:8000/api/products?sort_by=newest" | jq '.products[0].product_id'` (should show highest ID)
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run ruff check .`

---

### Phase 2: Frontend Implementation

#### TASK 2.1: UPDATE src/types/product.ts - Add newest to sort_by type

- LOCATE: `ProductFilterParams` interface (lines 80-95)
- UPDATE: `sort_by` type to include "newest" option:
  ```typescript
  /** Sort order for results */
  sort_by?: "price_asc" | "price_desc" | "name_asc" | "name_desc" | "newest";
  ```
- PATTERN: Type union with literal strings matching backend options
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.2: UPDATE src/lib/api-client.ts - Add sort_by to query string builder

- LOCATE: `fetchProducts()` function query string building logic
- FIND: URLSearchParams building section (around where category and search_keyword are appended)
- ADD: Sort parameter to query string:
  ```typescript
  if (filters?.sort_by) params.append("sort_by", filters.sort_by);
  ```
- UPDATE LOGGING: Include sort_by in log context where filters are logged
- PATTERN: Follow existing filter parameter appending pattern
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.3: UPDATE src/components/ProductFilters.tsx - Add sort dropdown to form

- LOCATE: Form schema definition (`filterFormSchema`)
- ADD FIELD: Add sort_by to Zod schema:
  ```typescript
  sort_by: z.enum(["price_asc", "price_desc", "name_asc", "name_desc", "newest"]).optional().or(z.literal("")),
  ```
- LOCATE: Form JSX (after search input or other form fields)
- ADD SELECT COMPONENT: Add sorting dropdown before Apply Filters button:
  ```tsx
  <FormField
    control={form.control}
    name="sort_by"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Sort By</FormLabel>
        <Select onValueChange={field.onChange} value={field.value || ""}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Default (Newest First)" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="">Default (Newest First)</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="name_asc">Name: A-Z</SelectItem>
            <SelectItem value="name_desc">Name: Z-A</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
  ```
- UPDATE LOGGING: Include sort_by in "filters_applied" log event
- UPDATE CLEAR FILTERS: Ensure sort_by is reset when clearing filters
- IMPORTS: Select components already imported
- PATTERN: Follow existing category Select pattern
- LAYOUT: Place in responsive grid with other filter controls
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

#### TASK 2.4: VERIFY Frontend - Run linting and type checking

- RUN: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`
- EXPECTED: No TypeScript errors, no Biome lint errors, all imports resolved
- **VALIDATE**: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun run check:fix`

---

### Phase 3: Integration Testing

#### TASK 3.1: Manual Integration Test

- START BACKEND: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend && uv run python run_api.py`
- START FRONTEND: `cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend && bun dev`
- TEST SCENARIOS:
  1. Load page - verify products appear (default newest first)
  2. Sort by "Price: Low to High" - verify first product has lowest price
  3. Sort by "Price: High to Low" - verify first product has highest price
  4. Sort by "Name: A-Z" - verify alphabetical ascending order
  5. Sort by "Name: Z-A" - verify alphabetical descending order
  6. Sort by "Newest First" - verify highest product_id appears first
  7. Combine with filter: Category "electronics" + "Price: Low to High" - verify both work
  8. Clear filters - verify sort resets to default
  9. Check browser console for structured JSON logs
- **VALIDATE**: Manual verification in browser at http://localhost:3000

#### TASK 3.2: API Direct Testing

- TEST BACKEND ENDPOINTS:
  ```bash
  # Test price ascending
  curl "http://localhost:8000/api/products?sort_by=price_asc" | jq '.products[0:3] | .[] | {name: .product_name, price: .product_price_usd}'

  # Test name descending
  curl "http://localhost:8000/api/products?sort_by=name_desc" | jq '.products[0:3] | .[] | .product_name'

  # Test newest
  curl "http://localhost:8000/api/products?sort_by=newest" | jq '.products[0:3] | .[] | .product_id'

  # Test combined: category + sort
  curl "http://localhost:8000/api/products?category=electronics&sort_by=price_asc" | jq '.total_count, .products[0].product_name'

  # Test invalid sort_by (should return 422 validation error)
  curl "http://localhost:8000/api/products?sort_by=invalid_sort" | jq '.detail'
  ```
- EXPECTED: Correct sorting order, proper validation, accurate total_count
- **VALIDATE**: Manual curl testing with jq verification

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Backend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run ruff check . --fix
uv run ruff format .

# Expected: Zero errors

# Frontend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run check:fix

# Expected: Zero TypeScript errors, zero Biome errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Backend tests (existing tests should still pass)
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run pytest tests/ -v

# Expected: All existing tests pass (filtering tests still work)
# Note: No new tests required for this simple feature unless requested
```

### Level 3: Integration Testing (System Validation)

```bash
# Terminal 1: Start backend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run python run_api.py

# Terminal 2: Test API sorting
curl "http://localhost:8000/api/products?sort_by=price_asc" | jq '.products[0].product_price_usd'
# Expected: Lowest price (should be "5.99" or similar)

curl "http://localhost:8000/api/products?sort_by=newest" | jq '.products[0].product_id'
# Expected: Highest ID (should be 30)

# Terminal 3: Start frontend
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun dev
# Open http://localhost:3000 and test sorting dropdown
```

---

## COMPLETION CHECKLIST

- [ ] sort_by parameter added to filter_products() with sorting logic
- [ ] sort_by query parameter added to API endpoint with validation
- [ ] Backend logging includes sort_by in all log events
- [ ] Backend linting passes (ruff check)
- [ ] ProductFilterParams.sort_by type updated to include "newest"
- [ ] fetchProducts() includes sort_by in query string
- [ ] ProductFilters component has sorting dropdown with all options
- [ ] Frontend linting passes (biome check)
- [ ] Manual integration testing completed successfully
- [ ] Sorting works independently and with existing filters
- [ ] Default behavior (no sort_by) maintains expected order

---

## Notes

### Key Implementation Decisions

1. **Sort order options**:
   - `price_asc` / `price_desc` - Sort by product_price_usd
   - `name_asc` / `name_desc` - Sort by product_name (case-insensitive with .lower())
   - `newest` - Sort by product_id descending (highest ID first)

2. **Default behavior**: When sort_by is None or empty, products maintain their insertion order (which is already newest first by ID in seed data)

3. **Validation**: Backend uses Query parameter with regex pattern to validate sort_by values, preventing invalid input

4. **Frontend UX**:
   - "Default (Newest First)" option with empty string value
   - User-friendly labels: "Price: Low to High" instead of "price_asc"
   - Sort dropdown integrated into existing ProductFilters component

5. **Sorting + Filtering**: Sorting is applied AFTER all filters, ensuring correct behavior when combined

6. **Logging**: All sort operations logged with structured JSON including sort_by parameter for debugging

7. **No breaking changes**: All parameters optional, existing functionality preserved, backward compatible

### Testing Considerations

- No new backend tests required unless specifically requested (feature is simple, existing tests validate filters still work)
- Focus on manual integration testing to verify UI/UX works correctly
- Test edge cases: empty results after filtering, all sort options, combined filter+sort

### Future Enhancements (Not in scope)

- Sort by product_in_stock (in-stock items first)
- Multi-field sorting (e.g., category then price)
- Custom sort order preservation in URL/localStorage
- Sort direction indicators in UI
