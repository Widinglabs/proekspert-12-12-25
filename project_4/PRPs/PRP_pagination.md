---
name: "Pagination with Page Size Control"
description: "Replace load-all pattern with paginated results (10/25/50 per page) for scalability"
---

## Problem Statement

### Current Behavior
The application currently loads and displays all products at once:
- Backend returns all matching products in a single response
- Frontend displays all results simultaneously
- No pagination controls or page navigation
- Performance degrades with large result sets
- Poor UX for browsing large catalogs

### Business Impact
- **Scalability**: Cannot handle large product catalogs efficiently
- **Performance**: Slow page loads with many products
- **UX**: Overwhelming to view 30+ products at once
- **Network**: Large response payloads waste bandwidth

### User Pain Points
- Users must scroll through entire product list
- No way to control results per page
- Cannot navigate to specific pages
- No indication of total pages or current position

---

## Requirements

### Functional Requirements

#### Backend Requirements
1. **Pagination Parameters**
   - Accept `page_number` query parameter (1-based indexing, default: 1)
   - Accept `page_size` query parameter (values: 10, 25, 50, default: 10)
   - Validate page_number >= 1
   - Validate page_size is one of allowed values

2. **Pagination Logic**
   - Calculate offset: `(page_number - 1) * page_size`
   - Slice results: `results[offset:offset + page_size]`
   - Return only requested page of products

3. **Pagination Metadata**
   - Return `total_count` (total matching products across all pages)
   - Return `page_number` (current page)
   - Return `page_size` (items per page)
   - Return `total_pages` (calculated: `ceil(total_count / page_size)`)
   - Return `has_previous_page` (boolean)
   - Return `has_next_page` (boolean)

4. **Edge Cases**
   - Empty results: Return valid pagination metadata with empty products array
   - Page beyond range: Return empty array with valid metadata
   - Invalid page_size: Return 400 error

#### Frontend Requirements
1. **Page Size Control**
   - Dropdown selector with options: 10, 25, 50
   - Display current selection
   - Reset to page 1 when page size changes

2. **Pagination Navigation**
   - Display "Page X of Y" indicator
   - Previous button (disabled on first page)
   - Next button (disabled on last page)
   - Show "Showing 1-10 of 30 products" text

3. **State Management**
   - Track current page number
   - Track current page size
   - Reset to page 1 when filters change
   - Preserve page size across filter changes

4. **Accessibility**
   - Buttons have proper ARIA labels
   - Disabled state clearly indicated
   - Keyboard navigation support

### Non-Functional Requirements
- Backend response time: < 100ms for paginated queries
- Type safety: Full TypeScript/Pydantic validation
- Logging: Structured logs for pagination operations
- Testing: Unit tests for pagination logic
- Code quality: Pass linting (Ruff, Biome)

### Out of Scope
- Jump to specific page number input
- First/Last page buttons
- Infinite scroll
- URL-based pagination state
- Server-side sorting with pagination

---

## Plan

### Phase 1: Backend Pagination

#### TASK 1.1: UPDATE app/models/product.py - Add pagination models

**File**: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend/app/models/product.py`

**Changes**:
1. Update `ProductListResponse` to include pagination metadata:
   ```python
   class PaginationMetadata(BaseModel):
       """Pagination metadata for paginated responses."""
       page_number: int = Field(..., description="Current page number (1-based)", ge=1)
       page_size: int = Field(..., description="Number of items per page", ge=1)
       total_count: int = Field(..., description="Total number of items across all pages", ge=0)
       total_pages: int = Field(..., description="Total number of pages", ge=0)
       has_previous_page: bool = Field(..., description="Whether a previous page exists")
       has_next_page: bool = Field(..., description="Whether a next page exists")

   class ProductListResponse(BaseModel):
       """Response model for endpoints that return a paginated list of products."""
       products: list[Product] = Field(..., description="List of products for current page")
       total_count: int = Field(..., description="Total number of products matching criteria", ge=0)
       pagination: PaginationMetadata = Field(..., description="Pagination metadata")
   ```

**Validation**:
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run python -c "from app.models.product import PaginationMetadata, ProductListResponse; print('Models OK')"
```

#### TASK 1.2: UPDATE app/services/product_service.py - Add pagination logic

**File**: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend/app/services/product_service.py`

**Changes**:
1. Update `filter_products()` function signature to accept pagination parameters:
   ```python
   def filter_products(
       min_price_usd: Decimal | None = None,
       max_price_usd: Decimal | None = None,
       category: str | None = None,
       search_keyword: str | None = None,
       page_number: int = 1,
       page_size: int = 10,
   ) -> tuple[list[Product], int]:
       """
       Filter products with pagination support.

       Args:
           min_price_usd: Minimum price filter (inclusive)
           max_price_usd: Maximum price filter (inclusive)
           category: Product category filter
           search_keyword: Search keyword for name/description
           page_number: Page number (1-based, default: 1)
           page_size: Items per page (default: 10)

       Returns:
           Tuple of (paginated_products, total_count)
       """
   ```

2. Implement pagination logic:
   - Filter products as before (keep existing logic)
   - Calculate `total_count = len(filtered_results)`
   - Calculate `offset = (page_number - 1) * page_size`
   - Slice results: `paginated = filtered_results[offset:offset + page_size]`
   - Return `(paginated, total_count)`

3. Add structured logging:
   ```python
   logger.info("pagination_applied",
       page_number=page_number,
       page_size=page_size,
       total_count=total_count,
       returned_count=len(paginated),
       operation="filter_products")
   ```

**Validation**:
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run python -c "from app.services.product_service import filter_products; products, count = filter_products(page_number=1, page_size=10); print(f'Got {len(products)} products, {count} total')"
```

#### TASK 1.3: UPDATE app/api/products.py - Add pagination query parameters

**File**: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend/app/api/products.py`

**Changes**:
1. Add pagination query parameters:
   ```python
   from math import ceil

   @router.get("", response_model=ProductListResponse, responses={400: {"model": ErrorResponse}})
   async def get_products(
       min_price_usd: Decimal | None = Query(default=None, ge=0, description="Minimum price in USD (inclusive)"),
       max_price_usd: Decimal | None = Query(default=None, ge=0, description="Maximum price in USD (inclusive)"),
       category: str | None = Query(default=None, description="Filter by product category"),
       search_keyword: str | None = Query(default=None, max_length=100, description="Search in name and description"),
       page_number: int = Query(default=1, ge=1, description="Page number (1-based)"),
       page_size: int = Query(default=10, ge=1, le=100, description="Items per page (10, 25, or 50)"),
   ) -> ProductListResponse | JSONResponse:
   ```

2. Validate page_size (must be 10, 25, or 50):
   ```python
   if page_size not in [10, 25, 50]:
       logger.error("validation_failed",
           error_type="invalid_page_size",
           page_size=page_size,
           fix_suggestion="page_size must be one of: 10, 25, 50")
       return JSONResponse(
           status_code=400,
           content=ErrorResponse(
               error_code="invalid_page_size",
               error_message="Page size must be one of: 10, 25, 50",
               error_details={"page_size": page_size, "allowed_values": [10, 25, 50]},
           ).model_dump(),
       )
   ```

3. Call service with pagination parameters:
   ```python
   products, total_count = product_service.filter_products(
       min_price_usd=min_price_usd,
       max_price_usd=max_price_usd,
       category=category,
       search_keyword=search_keyword,
       page_number=page_number,
       page_size=page_size,
   )
   ```

4. Build pagination metadata:
   ```python
   from app.models.product import PaginationMetadata

   total_pages = ceil(total_count / page_size) if total_count > 0 else 0
   pagination_metadata = PaginationMetadata(
       page_number=page_number,
       page_size=page_size,
       total_count=total_count,
       total_pages=total_pages,
       has_previous_page=page_number > 1,
       has_next_page=page_number < total_pages,
   )
   ```

5. Return updated response:
   ```python
   return ProductListResponse(
       products=products,
       total_count=total_count,
       pagination=pagination_metadata,
   )
   ```

6. Update logging to include pagination info

**Validation**:
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run python -c "from app.api.products import router; print('Router OK')"
```

#### TASK 1.4: CREATE tests/test_products_pagination.py - Add pagination tests

**File**: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend/tests/test_products_pagination.py`

**Tests to create**:
1. `test_get_products_page_1_with_default_page_size_returns_10_products`
2. `test_get_products_page_2_returns_next_10_products`
3. `test_get_products_with_page_size_25_returns_25_products`
4. `test_get_products_with_page_size_50_returns_50_products`
5. `test_get_products_pagination_metadata_correct`
6. `test_get_products_last_page_has_remaining_items`
7. `test_get_products_page_beyond_range_returns_empty`
8. `test_get_products_invalid_page_size_returns_400`
9. `test_get_products_pagination_with_filters`
10. `test_pagination_metadata_has_previous_and_next_flags`

**Validation**:
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run pytest tests/test_products_pagination.py -v
```

#### TASK 1.5: VERIFY Backend - Run tests and linting

**Commands**:
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run pytest tests/ -v
uv run ruff check . && uv run ruff format .
```

**Expected**: All tests pass (including existing filtering tests), no lint errors

---

### Phase 2: Frontend Pagination

#### TASK 2.1: UPDATE src/types/product.ts - Add pagination types

**File**: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend/src/types/product.ts`

**Changes**:
1. Add pagination interfaces matching backend:
   ```typescript
   export interface PaginationMetadata {
     page_number: number;
     page_size: number;
     total_count: number;
     total_pages: number;
     has_previous_page: boolean;
     has_next_page: boolean;
   }

   export interface ProductListResponse {
     products: Product[];
     total_count: number;
     pagination: PaginationMetadata;
   }
   ```

2. Add pagination parameters to filter params:
   ```typescript
   export interface ProductFilterParams {
     minimum_price_usd?: number;
     maximum_price_usd?: number;
     category?: ProductCategory;
     search_keyword?: string;
     page_number?: number;
     page_size?: number;
   }
   ```

**Validation**:
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run check:fix
```

#### TASK 2.2: UPDATE src/lib/api-client.ts - Add pagination params

**File**: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend/src/lib/api-client.ts`

**Changes**:
1. Update `fetchProducts()` to include pagination params:
   ```typescript
   if (filters?.page_number !== undefined) {
     params.append("page_number", filters.page_number.toString());
   }
   if (filters?.page_size !== undefined) {
     params.append("page_size", filters.page_size.toString());
   }
   ```

2. Update logging to include pagination info

**Validation**:
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run check:fix
```

#### TASK 2.3: CREATE src/components/PaginationControls.tsx - Pagination UI

**File**: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend/src/components/PaginationControls.tsx`

**Component structure**:
```typescript
interface PaginationControlsProps {
  pagination: PaginationMetadata;
  onPageChange: (page_number: number) => void;
  onPageSizeChange: (page_size: number) => void;
  disabled?: boolean;
}

export function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: PaginationControlsProps) {
  // Component implementation
}
```

**UI Elements**:
1. **Page Size Selector**:
   - Select dropdown with options: 10, 25, 50
   - Label: "Items per page"
   - Calls `onPageSizeChange` on change

2. **Pagination Info**:
   - Display: "Showing X-Y of Z products"
   - Calculate: `start = (page_number - 1) * page_size + 1`
   - Calculate: `end = min(start + page_size - 1, total_count)`

3. **Navigation Buttons**:
   - Previous button: disabled if `!has_previous_page`
   - Page indicator: "Page X of Y"
   - Next button: disabled if `!has_next_page`

4. **Styling**:
   - Use Tailwind + shadcn/ui components
   - Responsive layout (stack on mobile, row on desktop)
   - Clear disabled states

5. **Accessibility**:
   - ARIA labels: "Previous page", "Next page"
   - Keyboard navigation
   - Focus management

6. **Logging**:
   ```typescript
   logger.info("pagination_changed", {
     page_number,
     page_size,
     operation: "pagination_change"
   });
   ```

**Validation**:
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run check:fix
```

#### TASK 2.4: UPDATE src/App.tsx - Integrate pagination state

**File**: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend/src/App.tsx`

**Changes**:
1. Add pagination state:
   ```typescript
   const [pageNumber, setPageNumber] = useState<number>(1);
   const [pageSize, setPageSize] = useState<number>(10);
   const [paginationMetadata, setPaginationMetadata] = useState<PaginationMetadata | null>(null);
   ```

2. Update `loadProducts` to include pagination:
   ```typescript
   const loadProducts = useCallback(async (filterParams?: ProductFilterParams) => {
     const response = await fetchProducts({
       ...filterParams,
       page_number: filterParams?.page_number ?? pageNumber,
       page_size: filterParams?.page_size ?? pageSize,
     });
     setProducts(response.products);
     setPaginationMetadata(response.pagination);
   }, [pageNumber, pageSize]);
   ```

3. Add pagination handlers:
   ```typescript
   const handlePageChange = useCallback((newPage: number) => {
     setPageNumber(newPage);
     loadProducts({ ...filters, page_number: newPage, page_size: pageSize });
   }, [filters, pageSize, loadProducts]);

   const handlePageSizeChange = useCallback((newPageSize: number) => {
     setPageSize(newPageSize);
     setPageNumber(1); // Reset to page 1
     loadProducts({ ...filters, page_number: 1, page_size: newPageSize });
   }, [filters, loadProducts]);
   ```

4. Reset to page 1 when filters change:
   ```typescript
   const handleFilterChange = useCallback((newFilters: ProductFilterParams) => {
     setFilters(newFilters);
     setPageNumber(1); // Reset to first page
     loadProducts({ ...newFilters, page_number: 1, page_size: pageSize });
   }, [pageSize, loadProducts]);
   ```

5. Add PaginationControls to JSX:
   ```tsx
   {paginationMetadata && !error && (
     <PaginationControls
       pagination={paginationMetadata}
       onPageChange={handlePageChange}
       onPageSizeChange={handlePageSizeChange}
       disabled={loading}
     />
   )}
   ```

6. Update header text to use pagination info:
   ```tsx
   {!loading && !error && paginationMetadata && (
     <p>Showing {startItem}-{endItem} of {paginationMetadata.total_count} products</p>
   )}
   ```

**Validation**:
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run check:fix
```

#### TASK 2.5: VERIFY Frontend - Run linting and type checking

**Commands**:
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun run check:fix
```

**Expected**: No TypeScript errors, no Biome lint errors

---

### Phase 3: Integration Testing

#### TASK 3.1: Backend API Testing

**Terminal 1**: Start backend
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend
uv run python run_api.py
```

**Terminal 2**: Test pagination endpoints
```bash
# Test default pagination (page 1, size 10)
curl "http://localhost:8000/api/products" | jq '.pagination'

# Test page 2
curl "http://localhost:8000/api/products?page_number=2&page_size=10" | jq '.pagination'

# Test page size 25
curl "http://localhost:8000/api/products?page_size=25" | jq '.pagination'

# Test with filters and pagination
curl "http://localhost:8000/api/products?category=electronics&page_size=10" | jq '.pagination'

# Test invalid page size
curl "http://localhost:8000/api/products?page_size=15" | jq '.error_code'
# Expected: "invalid_page_size"
```

#### TASK 3.2: Manual Frontend Testing

**Terminal 1**: Backend running (from 3.1)

**Terminal 2**: Start frontend
```bash
cd /Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend
bun dev
```

**Test Scenarios** (in browser at http://localhost:3000):
1. **Initial Load**:
   - Should show first 10 products
   - Page indicator: "Page 1 of 3"
   - Previous button disabled
   - Next button enabled

2. **Page Navigation**:
   - Click Next → shows products 11-20
   - Page indicator: "Page 2 of 3"
   - Both buttons enabled
   - Click Next again → shows products 21-30
   - Page indicator: "Page 3 of 3"
   - Next button disabled

3. **Page Size Change**:
   - Select "25" from page size dropdown
   - Should reset to page 1
   - Shows 25 products
   - Page indicator: "Page 1 of 2"

4. **Pagination with Filters**:
   - Filter by category "electronics" (8 products)
   - Should reset to page 1
   - With page size 10: "Page 1 of 1"
   - All 8 products visible

5. **Empty Results**:
   - Apply filters with no matches
   - Should show "No products found"
   - Pagination controls hidden or disabled

6. **Showing Range Text**:
   - Page 1, size 10: "Showing 1-10 of 30 products"
   - Page 2, size 10: "Showing 11-20 of 30 products"
   - Last page: "Showing 21-30 of 30 products"

7. **Accessibility**:
   - Tab through pagination controls
   - Previous/Next buttons have clear focus
   - Disabled state is keyboard accessible
   - Screen reader labels are correct

---

## Acceptance Criteria

### Backend
- [ ] PaginationMetadata model created with all required fields
- [ ] filter_products() returns tuple of (products, total_count)
- [ ] API endpoint accepts page_number and page_size parameters
- [ ] API validates page_size is 10, 25, or 50
- [ ] API returns 400 error for invalid page_size
- [ ] Pagination metadata calculated correctly (total_pages, has_previous, has_next)
- [ ] All pagination tests pass (10+ tests)
- [ ] Backend linting passes (Ruff)
- [ ] Structured logging includes pagination info

### Frontend
- [ ] PaginationMetadata interface matches backend
- [ ] ProductListResponse includes pagination field
- [ ] PaginationControls component created
- [ ] Page size selector with 10, 25, 50 options
- [ ] Previous/Next navigation buttons
- [ ] "Page X of Y" indicator
- [ ] "Showing X-Y of Z products" text
- [ ] Disabled state for buttons at page boundaries
- [ ] Page resets to 1 when filters change
- [ ] Page resets to 1 when page size changes
- [ ] Frontend linting passes (Biome)
- [ ] ARIA labels for accessibility

### Integration
- [ ] API returns correct paginated results
- [ ] Frontend displays correct page of products
- [ ] Navigation buttons work correctly
- [ ] Page size changes work correctly
- [ ] Filters + pagination work together
- [ ] No console errors
- [ ] Responsive layout works on mobile
- [ ] Structured logs show pagination operations

---

## Implementation Notes

### Key Design Decisions

1. **1-based indexing**: Page numbers start at 1 (more user-friendly than 0-based)

2. **Fixed page sizes**: Only allow 10, 25, 50 to prevent abuse and ensure consistent UX

3. **Reset behavior**: Reset to page 1 when:
   - Filters change
   - Page size changes
   - This prevents "page 5 of 2" scenarios

4. **Empty page handling**: Pages beyond range return empty array with valid metadata

5. **Response structure**: Keep total_count at top level for backwards compatibility, add pagination object

6. **State management**: Use separate state for page_number and page_size (not in filters object) for clarity

### Common Pitfalls to Avoid

1. **Off-by-one errors**: Remember page_number is 1-based, but array slicing is 0-based
2. **Division by zero**: Handle total_count=0 case when calculating total_pages
3. **Filter reset**: Don't forget to reset page to 1 when filters change
4. **Type mismatch**: Page params are integers, not strings
5. **Disabled button state**: Ensure buttons are properly disabled at boundaries

### Testing Strategy

1. **Unit tests**: Test pagination logic in isolation (service layer)
2. **Integration tests**: Test full request/response cycle (API layer)
3. **Edge cases**: Empty results, last page, page beyond range, invalid params
4. **Manual testing**: Verify UX flows in browser

---

## File Changes Summary

### Backend Files Modified
- `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend/app/models/product.py` - Add PaginationMetadata model
- `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend/app/services/product_service.py` - Update filter_products() with pagination
- `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend/app/api/products.py` - Add pagination query params and metadata

### Backend Files Created
- `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend/tests/test_products_pagination.py` - Pagination tests

### Frontend Files Modified
- `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend/src/types/product.ts` - Add pagination types
- `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend/src/lib/api-client.ts` - Add pagination params
- `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend/src/App.tsx` - Add pagination state and handlers

### Frontend Files Created
- `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend/src/components/PaginationControls.tsx` - Pagination UI component

---

## Timeline Estimate

- **Phase 1 (Backend)**: 2-3 hours
  - Models: 30 min
  - Service logic: 45 min
  - API endpoint: 45 min
  - Tests: 1 hour

- **Phase 2 (Frontend)**: 2-3 hours
  - Types: 15 min
  - API client: 15 min
  - PaginationControls: 1.5 hours
  - App integration: 45 min

- **Phase 3 (Testing)**: 1 hour
  - Backend API testing: 30 min
  - Frontend manual testing: 30 min

**Total**: 5-7 hours

---

## References

### Architecture Documents
- `/Users/rasmus/Projects/tmp/proekspert-12-12-25/CLAUDE.md` - Global development rules
- `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/PRPs/story_product-filtering-fullstack.md` - Filtering implementation pattern

### Code References
- Backend filtering: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend/app/services/product_service.py`
- Frontend state management: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/frontend/src/App.tsx`
- API patterns: `/Users/rasmus/Projects/tmp/proekspert-12-12-25/project_4/app/backend/app/api/products.py`

### External Resources
- FastAPI Query parameters: https://fastapi.tiangolo.com/tutorial/query-params/
- React Hook patterns: https://react.dev/reference/react/hooks
- Pagination best practices: REST API pagination patterns
