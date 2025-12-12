---
name: "Stock Quantity & Low Stock Alerts"
description: "Replace boolean stock flag with quantity tracking and add low stock warnings"
---

## Original Story

```
[FEAT-1236] Stock Quantity & Low Stock Alerts

Replace the current boolean product_in_stock field with a numeric product_stock_quantity field.
Display low stock warnings when quantity is low (e.g., "Only 3 left!"). Add filtering option
for "In Stock Only" to show products with stock_quantity > 0.

Requirements:
- Replace product_in_stock: bool with product_stock_quantity: int (>= 0)
- Show visual alert when stock quantity is 1-5 items (e.g., "Only 3 left!")
- Show "Out of Stock" when quantity is 0
- Add "In Stock Only" filter checkbox to hide out-of-stock products
- Update all backend models, services, tests, and seed data
- Update frontend types, components, and API client to match
```

## Story Metadata

**Story Type**: Enhancement (Fullstack)
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- Backend: `app/models/`, `app/services/`, `app/api/`, `app/data/`, `tests/`
- Frontend: `src/types/`, `src/lib/`, `src/components/`

---

## CONTEXT REFERENCES

### Backend References
- `app/models/product.py` - Product model with `product_in_stock: bool` to replace
- `app/data/seed_products.py` - 30 products with boolean stock status to convert
- `app/services/product_service.py` - Service layer with filtering logic
- `app/api/products.py` - API endpoint with query parameters
- `tests/test_products_basic.py` - Basic tests checking product model
- `tests/test_products_filtering.py` - Filtering tests to update for new field
- `app/core/logging_config.py` - StructuredLogger for operation logging

### Frontend References
- `src/types/product.ts` - Product interface with `product_in_stock: boolean`
- `src/types/product.ts` - ProductFilterParams interface to extend
- `src/components/ProductCard.tsx` - Stock status display logic (lines 78-100)
- `src/components/ProductFilters.tsx` - Filter form to add stock checkbox
- `src/lib/api-client.ts` - API client with filter parameters
- `src/lib/logger.ts` - Structured logging pattern

### Data Migration Context
- Current: 4 products out of stock (IDs: 4, 12, 19, 27)
- Current: 26 products in stock
- New approach: Assign realistic stock quantities (0-50 range)
- Low stock threshold: 1-5 items triggers warning
- Zero stock: Shows "Out of Stock"

---

## IMPLEMENTATION TASKS

### Phase 1: Backend Model & Data Changes

#### TASK 1.1: UPDATE app/models/product.py - Replace boolean with quantity field

**Context**: The Product model currently uses `product_in_stock: bool` which only indicates availability. We need to replace this with `product_stock_quantity: int` to track actual inventory levels.

**Changes Required**:
- REMOVE: Line 70 - `product_in_stock: bool = Field(default=True, ...)`
- ADD: New field after `product_category` field
  ```python
  product_stock_quantity: int = Field(
      ...,
      description="Current stock quantity available for purchase (0 = out of stock)",
      ge=0,
      examples=[0, 3, 15, 42, 100],
  )
  ```
- UPDATE: Class docstring to replace `product_in_stock` with `product_stock_quantity` in Attributes section
- UPDATE: Example in docstring (lines 28-35) to use `product_stock_quantity=15` instead of `product_in_stock=True`

**Imports**: No new imports needed (Field and int already available)

**Validation Logic**: Field constraint `ge=0` ensures non-negative quantities

**Validation Command**:
```bash
cd project_4/app/backend && uv run python -c "from app.models.product import Product; p = Product(product_id=1, product_name='Test', product_description='Test desc', product_price_usd='29.99', product_category='electronics', product_stock_quantity=10); print('Model OK:', p.product_stock_quantity)"
```

---

#### TASK 1.2: UPDATE app/data/seed_products.py - Convert stock data to quantities

**Context**: The seed data currently uses boolean `product_in_stock` for 30 products. We need to convert this to realistic stock quantities that demonstrate all scenarios: out of stock (0), low stock (1-5), and normal stock (6+).

**Strategy**:
- Products currently `product_in_stock=False` → `product_stock_quantity=0` (4 products: IDs 4, 12, 19, 27)
- Some in-stock products → low stock `product_stock_quantity=1-5` (assign to ~6 products for variety)
- Remaining in-stock products → normal stock `product_stock_quantity=6-50` (realistic range)

**Suggested Stock Distribution** (modify lines 32-277):
```python
# Electronics (8 products)
Product(product_id=1, ..., product_stock_quantity=23),  # Normal stock
Product(product_id=2, ..., product_stock_quantity=8),   # Normal stock
Product(product_id=3, ..., product_stock_quantity=3),   # LOW STOCK - triggers warning
Product(product_id=4, ..., product_stock_quantity=0),   # OUT OF STOCK
Product(product_id=5, ..., product_stock_quantity=12),  # Normal stock
Product(product_id=6, ..., product_stock_quantity=5),   # LOW STOCK - triggers warning
Product(product_id=7, ..., product_stock_quantity=45),  # Normal stock
Product(product_id=8, ..., product_stock_quantity=18),  # Normal stock

# Clothing (7 products)
Product(product_id=9, ..., product_stock_quantity=34),  # Normal stock
Product(product_id=10, ..., product_stock_quantity=1),  # LOW STOCK - triggers warning
Product(product_id=11, ..., product_stock_quantity=16), # Normal stock
Product(product_id=12, ..., product_stock_quantity=0),  # OUT OF STOCK
Product(product_id=13, ..., product_stock_quantity=28), # Normal stock
Product(product_id=14, ..., product_stock_quantity=2),  # LOW STOCK - triggers warning
Product(product_id=15, ..., product_stock_quantity=7),  # Normal stock

# Home (7 products)
Product(product_id=16, ..., product_stock_quantity=14), # Normal stock
Product(product_id=17, ..., product_stock_quantity=9),  # Normal stock
Product(product_id=18, ..., product_stock_quantity=11), # Normal stock
Product(product_id=19, ..., product_stock_quantity=0),  # OUT OF STOCK
Product(product_id=20, ..., product_stock_quantity=25), # Normal stock
Product(product_id=21, ..., product_stock_quantity=4),  # LOW STOCK - triggers warning
Product(product_id=22, ..., product_stock_quantity=6),  # Normal stock

# Sports (5 products)
Product(product_id=23, ..., product_stock_quantity=19), # Normal stock
Product(product_id=24, ..., product_stock_quantity=3),  # LOW STOCK - triggers warning
Product(product_id=25, ..., product_stock_quantity=42), # Normal stock
Product(product_id=26, ..., product_stock_quantity=31), # Normal stock
Product(product_id=27, ..., product_stock_quantity=0),  # OUT OF STOCK

# Books (3 products)
Product(product_id=28, ..., product_stock_quantity=8),  # Normal stock
Product(product_id=29, ..., product_stock_quantity=50), # Normal stock
Product(product_id=30, ..., product_stock_quantity=12), # Normal stock
```

**Final Distribution**:
- Out of stock (0): 4 products
- Low stock (1-5): 6 products (will show "Only X left!" warnings)
- Normal stock (6+): 20 products

**Changes Required**:
- REPLACE: All instances of `product_in_stock=True` with `product_stock_quantity=<value>`
- REPLACE: All instances of `product_in_stock=False` with `product_stock_quantity=0`
- UPDATE: Function docstring (lines 18-19) to mention stock quantities instead of boolean flags

**Validation Command**:
```bash
cd project_4/app/backend && uv run python -c "from app.data.seed_products import get_seed_products; products = get_seed_products(); print(f'Total: {len(products)}'); print(f'Out of stock: {sum(1 for p in products if p.product_stock_quantity == 0)}'); print(f'Low stock (1-5): {sum(1 for p in products if 1 <= p.product_stock_quantity <= 5)}'); print(f'Normal stock (6+): {sum(1 for p in products if p.product_stock_quantity >= 6)}')"
```

---

#### TASK 1.3: UPDATE app/models/product.py - Add in_stock_only filter parameter

**Context**: The ProductFilterParameters model needs a new boolean field to allow filtering for only products with stock_quantity > 0.

**Changes Required**:
- ADD: New field after `search_keyword` field (after line 143)
  ```python
  in_stock_only: bool = Field(
      default=False,
      description="Filter to show only products with stock_quantity > 0",
      examples=[True, False],
  )
  ```
- UPDATE: Class docstring (lines 98-116) to add `in_stock_only` to the Attributes section:
  ```python
  """
  ...
  Attributes:
      min_price_usd: Minimum price filter (inclusive)
      max_price_usd: Maximum price filter (inclusive)
      category: Filter by product category
      search_keyword: Search in product name and description (case-insensitive)
      in_stock_only: Show only products with stock available (stock_quantity > 0)
  ...
  """
  ```

**Imports**: No new imports needed

**Validation Command**:
```bash
cd project_4/app/backend && uv run python -c "from app.models.product import ProductFilterParameters; params = ProductFilterParameters(in_stock_only=True); print('Filter params OK:', params.in_stock_only)"
```

---

#### TASK 1.4: UPDATE app/services/product_service.py - Add in_stock_only filter logic

**Context**: The filter_products service function needs to handle the new in_stock_only parameter.

**Changes Required**:
- UPDATE: Function signature of `filter_products()` to add new parameter:
  ```python
  def filter_products(
      min_price_usd: Decimal | None = None,
      max_price_usd: Decimal | None = None,
      category: str | None = None,
      search_keyword: str | None = None,
      in_stock_only: bool = False,
  ) -> list[Product]:
  ```
- UPDATE: Function docstring to include new parameter in Args section:
  ```python
  """
  Filter products based on price, category, search keyword, and stock availability.

  Args:
      ...
      in_stock_only: If True, filter to products with stock_quantity > 0

  Returns:
      ...
  """
  ```
- ADD: Filter logic after existing filters (before final return):
  ```python
  # Filter by stock availability if requested
  if in_stock_only:
      filtered_products = [
          product for product in filtered_products
          if product.product_stock_quantity > 0
      ]
  ```
- UPDATE: Logging to include in_stock_only parameter:
  ```python
  logger.info("filtering_products_started",
      min_price_usd=str(min_price_usd) if min_price_usd else None,
      max_price_usd=str(max_price_usd) if max_price_usd else None,
      category=category,
      search_keyword=search_keyword,
      in_stock_only=in_stock_only)
  ```

**Imports**: No new imports needed

**Validation Command**:
```bash
cd project_4/app/backend && uv run python -c "from app.services.product_service import filter_products; results = filter_products(in_stock_only=True); print(f'In-stock products: {len(results)}'); assert all(p.product_stock_quantity > 0 for p in results), 'Filter failed'; print('Service filter OK')"
```

---

#### TASK 1.5: UPDATE app/api/products.py - Add in_stock_only query parameter

**Context**: The API endpoint needs to accept and pass through the in_stock_only parameter.

**Changes Required**:
- UPDATE: Function signature of `get_products()` to add new Query parameter:
  ```python
  async def get_products(
      min_price_usd: Decimal | None = Query(default=None, ge=0, description="Minimum price in USD"),
      max_price_usd: Decimal | None = Query(default=None, ge=0, description="Maximum price in USD"),
      category: str | None = Query(default=None, description="Product category filter"),
      search_keyword: str | None = Query(default=None, max_length=100, description="Search keyword"),
      in_stock_only: bool = Query(default=False, description="Show only products with stock available"),
  ) -> ProductListResponse:
  ```
- UPDATE: Service call to pass new parameter:
  ```python
  products = product_service.filter_products(
      min_price_usd=min_price_usd,
      max_price_usd=max_price_usd,
      category=category,
      search_keyword=search_keyword,
      in_stock_only=in_stock_only,
  )
  ```
- UPDATE: Logging to include in_stock_only parameter in both request and response logs

**Imports**: No new imports needed (Query already imported)

**Validation Command**:
```bash
cd project_4/app/backend && uv run python -c "from app.api.products import router; print('Router import OK')"
```

---

### Phase 2: Backend Testing Updates

#### TASK 2.1: UPDATE tests/test_products_basic.py - Fix field name in tests

**Context**: Basic tests reference `product_in_stock` which no longer exists. Need to update to use `product_stock_quantity`.

**Changes Required**:
- SEARCH: Find all instances of `product_in_stock` in test file
- REPLACE: Update assertions to check `product_stock_quantity` instead
- EXAMPLE: Line checking `assert "product_in_stock" in product_dict` → `assert "product_stock_quantity" in product_dict`
- EXAMPLE: Assertions checking boolean values → Check for integer values instead

**Expected Changes**: ~2-4 lines that reference the old field name

**Validation Command**:
```bash
cd project_4/app/backend && uv run pytest tests/test_products_basic.py -v
```

---

#### TASK 2.2: UPDATE tests/test_products_filtering.py - Add in_stock_only test cases

**Context**: Filtering tests need new test cases for the in_stock_only parameter.

**Changes Required**:
- ADD: New test function after existing filter tests:
  ```python
  def test_filter_products_in_stock_only_returns_available_products(test_client: TestClient) -> None:
      """Test that in_stock_only=true filters out products with zero stock."""
      # Get all products to establish baseline
      response_all = test_client.get("/api/products")
      assert response_all.status_code == 200
      all_products = response_all.json()["products"]

      # Get only in-stock products
      response_in_stock = test_client.get("/api/products?in_stock_only=true")
      assert response_in_stock.status_code == 200

      data = response_in_stock.json()
      in_stock_products = data["products"]

      # Verify all returned products have stock_quantity > 0
      for product in in_stock_products:
          assert product["product_stock_quantity"] > 0, f"Product {product['product_id']} has zero stock but was returned"

      # Verify count is less than total (since some products are out of stock)
      assert len(in_stock_products) < len(all_products), "In-stock filter should return fewer products"
      assert data["total_count"] == len(in_stock_products)

      logger.info("test_completed",
                  test_name="in_stock_only_filter",
                  in_stock_count=len(in_stock_products),
                  total_count=len(all_products))


  def test_filter_products_in_stock_only_false_returns_all_products(test_client: TestClient) -> None:
      """Test that in_stock_only=false returns all products including out of stock."""
      response = test_client.get("/api/products?in_stock_only=false")
      assert response.status_code == 200

      data = response.json()
      products = data["products"]

      # Should return all 30 products
      assert len(products) == 30
      assert data["total_count"] == 30

      # Should include products with zero stock
      out_of_stock_count = sum(1 for p in products if p["product_stock_quantity"] == 0)
      assert out_of_stock_count > 0, "Should include out-of-stock products"

      logger.info("test_completed",
                  test_name="in_stock_only_false",
                  out_of_stock_count=out_of_stock_count)


  def test_filter_products_combines_in_stock_only_with_other_filters(test_client: TestClient) -> None:
      """Test that in_stock_only works with other filters like category."""
      response = test_client.get("/api/products?category=electronics&in_stock_only=true")
      assert response.status_code == 200

      data = response.json()
      products = data["products"]

      # All products should be electronics AND have stock
      for product in products:
          assert product["product_category"] == "electronics"
          assert product["product_stock_quantity"] > 0

      # Should be fewer than 8 (total electronics) since ID 4 is out of stock
      assert len(products) < 8, "Should exclude out-of-stock electronics"
      assert data["total_count"] == len(products)
  ```

**Imports**: Test client and logger already imported

**Validation Command**:
```bash
cd project_4/app/backend && uv run pytest tests/test_products_filtering.py::test_filter_products_in_stock_only_returns_available_products -v
cd project_4/app/backend && uv run pytest tests/test_products_filtering.py::test_filter_products_in_stock_only_false_returns_all_products -v
cd project_4/app/backend && uv run pytest tests/test_products_filtering.py::test_filter_products_combines_in_stock_only_with_other_filters -v
```

---

#### TASK 2.3: VERIFY Backend - Run full test suite and linting

**Validation Steps**:
```bash
# Run all tests
cd project_4/app/backend && uv run pytest tests/ -v

# Expected: All tests pass (basic + filtering + new stock tests)
# Expected: 15+ tests total

# Run linting
cd project_4/app/backend && uv run ruff check . && uv run ruff format .

# Expected: No errors, code formatted
```

**Success Criteria**:
- All existing tests still pass
- 3 new stock filtering tests pass
- No lint or type errors
- Backend server can start without errors

---

### Phase 3: Frontend Type & API Updates

#### TASK 3.1: UPDATE src/types/product.ts - Replace boolean with quantity field

**Context**: Frontend Product interface must match backend model exactly. Replace boolean stock field with integer quantity.

**Changes Required**:
- REPLACE: Lines 52-53
  ```typescript
  // OLD:
  /** Whether product is currently available for purchase */
  product_in_stock: boolean;

  // NEW:
  /** Current stock quantity available (0 = out of stock, 1-5 = low stock) */
  product_stock_quantity: number;
  ```
- UPDATE: Interface docstring comments (lines 23-31) to replace `product_in_stock: bool` with `product_stock_quantity: int`
- UPDATE: Backend model reference comment (lines 26-31) to match new field

**Imports**: No new imports needed

**Validation Command**:
```bash
cd project_4/app/frontend && bun run check:fix
```

---

#### TASK 3.2: UPDATE src/types/product.ts - Add in_stock_only filter parameter

**Context**: ProductFilterParams interface needs new field for stock filtering.

**Changes Required**:
- ADD: New field in ProductFilterParams interface after `search_keyword` (after line 91):
  ```typescript
  /** Filter to show only products with stock available (stock_quantity > 0) */
  in_stock_only?: boolean;
  ```
- UPDATE: Interface docstring to mention this parameter in the description

**Imports**: No new imports needed

**Validation Command**:
```bash
cd project_4/app/frontend && bun run check:fix
```

---

#### TASK 3.3: UPDATE src/lib/api-client.ts - Add in_stock_only to query params

**Context**: API client needs to include the new filter parameter in requests.

**Changes Required**:
- UPDATE: Query string building logic in `fetchProducts()` function to add new parameter:
  ```typescript
  export async function fetchProducts(filters?: ProductFilterParams): Promise<ProductListResponse> {
    logger.info("fetching_products", { endpoint, filters });

    const params = new URLSearchParams();
    if (filters?.minimum_price_usd !== undefined) {
      params.append("min_price_usd", filters.minimum_price_usd.toString());
    }
    if (filters?.maximum_price_usd !== undefined) {
      params.append("max_price_usd", filters.maximum_price_usd.toString());
    }
    if (filters?.category) {
      params.append("category", filters.category);
    }
    if (filters?.search_keyword) {
      params.append("search_keyword", filters.search_keyword);
    }
    // ADD THIS:
    if (filters?.in_stock_only) {
      params.append("in_stock_only", "true");
    }

    // ... rest of function
  }
  ```

**Imports**: No new imports needed

**Validation Command**:
```bash
cd project_4/app/frontend && bun run check:fix
```

---

### Phase 4: Frontend Component Updates

#### TASK 4.1: UPDATE src/components/ProductCard.tsx - Replace stock badge with quantity display

**Context**: ProductCard currently shows "In Stock" / "Out of Stock" badges. Need to replace with quantity-based display including low stock warnings.

**Changes Required**:
- REPLACE: Stock status section (lines 78-100) with new logic:
  ```typescript
  {/* Stock status with quantity-based display */}
  {product.product_stock_quantity === 0 ? (
    // Out of stock
    <span className="text-sm text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" role="img" aria-label="Out of stock">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      Out of Stock
    </span>
  ) : product.product_stock_quantity <= 5 ? (
    // Low stock warning (1-5 items)
    <span className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" role="img" aria-label="Low stock warning">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      Only {product.product_stock_quantity} left!
    </span>
  ) : (
    // Normal stock (6+ items)
    <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" role="img" aria-label="In stock">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      In Stock
    </span>
  )}
  ```

**Visual States**:
- 0 items: Red badge, X icon, "Out of Stock"
- 1-5 items: Amber/yellow badge, warning triangle icon, "Only X left!"
- 6+ items: Green badge, checkmark icon, "In Stock"

**Accessibility**: All icons include role="img" and aria-label

**Validation Command**:
```bash
cd project_4/app/frontend && bun run check:fix
```

---

#### TASK 4.2: UPDATE src/components/ProductFilters.tsx - Add in_stock_only checkbox

**Context**: Filter form needs a checkbox to enable/disable the "In Stock Only" filter.

**Changes Required**:
- UPDATE: Zod schema to include new field:
  ```typescript
  const filterFormSchema = z.object({
    minimum_price_usd: z.coerce.number().min(0).optional().or(z.literal("")),
    maximum_price_usd: z.coerce.number().min(0).optional().or(z.literal("")),
    category: z.enum(["electronics", "clothing", "home", "sports", "books"]).optional().or(z.literal("")),
    search_keyword: z.string().max(100).optional(),
    in_stock_only: z.boolean().default(false),  // ADD THIS
  }).refine(/* ... existing refine logic ... */);
  ```
- ADD: Import Checkbox component:
  ```typescript
  import { Checkbox } from "@/components/ui/checkbox";
  ```
- ADD: Checkbox field in form JSX (after search keyword field):
  ```tsx
  <FormField
    control={form.control}
    name="in_stock_only"
    render={({ field }) => (
      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
        <FormControl>
          <Checkbox
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={loading}
          />
        </FormControl>
        <div className="space-y-1 leading-none">
          <FormLabel className="cursor-pointer">
            In Stock Only
          </FormLabel>
          <p className="text-sm text-muted-foreground">
            Hide out-of-stock products
          </p>
        </div>
      </FormItem>
    )}
  />
  ```
- UPDATE: Default values in form initialization:
  ```typescript
  const form = useForm<z.infer<typeof filterFormSchema>>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: {
      minimum_price_usd: "",
      maximum_price_usd: "",
      category: "",
      search_keyword: "",
      in_stock_only: false,  // ADD THIS
    },
  });
  ```
- UPDATE: Clear filters function to reset checkbox:
  ```typescript
  const handleClearFilters = () => {
    form.reset({
      minimum_price_usd: "",
      maximum_price_usd: "",
      category: "",
      search_keyword: "",
      in_stock_only: false,  // ADD THIS
    });
    onFilterChange({});
    logger.info("filters_cleared", { operation: "clear_filters" });
  };
  ```
- UPDATE: Apply filters logging to include new field:
  ```typescript
  logger.info("filters_applied", {
    category: values.category || null,
    minimum_price_usd: values.minimum_price_usd || null,
    maximum_price_usd: values.maximum_price_usd || null,
    search_keyword: values.search_keyword || null,
    in_stock_only: values.in_stock_only,  // ADD THIS
    operation: "apply_filters"
  });
  ```

**Layout**: Place checkbox below search field, aligned with other form controls

**Validation Command**:
```bash
cd project_4/app/frontend && bun run check:fix
```

---

#### TASK 4.3: VERIFY Frontend - Run linting and type checking

**Validation Steps**:
```bash
# Run linting and formatting
cd project_4/app/frontend && bun run check:fix

# Expected: No TypeScript errors, no Biome lint errors
```

**Success Criteria**:
- No TypeScript type errors
- No Biome lint errors
- All imports resolve correctly
- Types match between components and API client

---

### Phase 5: Integration Testing

#### TASK 5.1: Manual Integration Test - Stock Quantity Display

**Setup**:
```bash
# Terminal 1: Start backend
cd project_4/app/backend && uv run python run_api.py

# Terminal 2: Start frontend
cd project_4/app/frontend && bun dev

# Open http://localhost:3000
```

**Test Scenarios**:

1. **Product Grid Display**:
   - [ ] Page loads and shows all 30 products
   - [ ] Out of stock products (IDs: 4, 12, 19, 27) show red "Out of Stock" badge
   - [ ] Low stock products show amber "Only X left!" warning (6 products with quantity 1-5)
   - [ ] Normal stock products show green "In Stock" badge (20 products with quantity 6+)

2. **Low Stock Warning Verification**:
   - [ ] Product ID 3 shows "Only 3 left!" in amber
   - [ ] Product ID 6 shows "Only 5 left!" in amber
   - [ ] Product ID 10 shows "Only 1 left!" in amber
   - [ ] Product ID 14 shows "Only 2 left!" in amber
   - [ ] Product ID 21 shows "Only 4 left!" in amber
   - [ ] Product ID 24 shows "Only 3 left!" in amber

3. **Stock Status Icons**:
   - [ ] Out of stock uses red X icon
   - [ ] Low stock uses amber warning triangle icon
   - [ ] In stock uses green checkmark icon

---

#### TASK 5.2: Manual Integration Test - In Stock Only Filter

**Test Scenarios**:

1. **Filter Checkbox Interaction**:
   - [ ] "In Stock Only" checkbox is visible in filter form
   - [ ] Checkbox is unchecked by default
   - [ ] Checking the box triggers a filter
   - [ ] UI shows loading state during filter

2. **Filter Behavior - Checkbox Checked**:
   - [ ] Check "In Stock Only" and apply filters
   - [ ] Verify product count drops from 30 to 26 (excludes 4 out-of-stock)
   - [ ] Verify IDs 4, 12, 19, 27 are NOT displayed
   - [ ] Verify low stock products (1-5 quantity) ARE still displayed
   - [ ] Verify normal stock products ARE still displayed

3. **Filter Behavior - Checkbox Unchecked**:
   - [ ] Uncheck "In Stock Only" and apply filters
   - [ ] Verify all 30 products are displayed again
   - [ ] Verify out-of-stock products reappear

4. **Combined Filters**:
   - [ ] Apply category filter "electronics" (8 products)
   - [ ] Check "In Stock Only" checkbox
   - [ ] Verify count drops to 7 (excludes product ID 4 which is out of stock)
   - [ ] Verify all displayed electronics have stock_quantity > 0

5. **Clear Filters**:
   - [ ] Apply "In Stock Only" filter
   - [ ] Click "Clear Filters" button
   - [ ] Verify checkbox is unchecked
   - [ ] Verify all 30 products are displayed

---

#### TASK 5.3: API Testing with curl

**Direct API Tests**:

```bash
# Test 1: Get all products (should include stock_quantity field)
curl "http://localhost:8000/api/products" | jq '.products[0] | {product_id, product_name, product_stock_quantity}'
# Expected: Response shows product_stock_quantity as integer

# Test 2: Verify out-of-stock products exist
curl "http://localhost:8000/api/products" | jq '[.products[] | select(.product_stock_quantity == 0) | .product_id]'
# Expected: [4, 12, 19, 27]

# Test 3: Verify low stock products exist
curl "http://localhost:8000/api/products" | jq '[.products[] | select(.product_stock_quantity > 0 and .product_stock_quantity <= 5) | {product_id, product_stock_quantity}]'
# Expected: 6 products with quantities 1-5

# Test 4: Filter in_stock_only=true
curl "http://localhost:8000/api/products?in_stock_only=true" | jq '.total_count'
# Expected: 26

# Test 5: Verify in_stock_only filters correctly
curl "http://localhost:8000/api/products?in_stock_only=true" | jq '[.products[] | .product_stock_quantity] | all(. > 0)'
# Expected: true

# Test 6: Combine with category filter
curl "http://localhost:8000/api/products?category=electronics&in_stock_only=true" | jq '.total_count'
# Expected: 7 (8 total electronics minus 1 out of stock)

# Test 7: in_stock_only=false returns all
curl "http://localhost:8000/api/products?in_stock_only=false" | jq '.total_count'
# Expected: 30
```

**Success Criteria**:
- All curl commands return expected results
- JSON structure includes product_stock_quantity as integer
- Filtering logic works correctly
- No product_in_stock field in responses

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

# Expected: 15+ tests pass (basic + filtering + new stock tests)
```

### Level 3: Integration Testing (System Validation)

```bash
# Terminal 1: Start backend
cd project_4/app/backend
uv run python run_api.py

# Terminal 2: Test API
curl "http://localhost:8000/api/products?in_stock_only=true" | jq '.total_count'
# Expected: 26

# Terminal 3: Start frontend
cd project_4/app/frontend
bun dev
# Open http://localhost:3000 and test UI
```

---

## COMPLETION CHECKLIST

### Backend Changes
- [ ] Product model updated: product_in_stock removed, product_stock_quantity added
- [ ] Seed data converted to stock quantities (0, 1-5, 6+ distribution)
- [ ] ProductFilterParameters model includes in_stock_only field
- [ ] Service layer filter_products function handles in_stock_only
- [ ] API endpoint accepts in_stock_only query parameter
- [ ] Basic tests updated for new field name
- [ ] 3 new filtering tests added and passing
- [ ] All backend tests pass (15+ tests)
- [ ] Backend linting passes (ruff check)

### Frontend Changes
- [ ] Product interface updated: product_in_stock removed, product_stock_quantity added
- [ ] ProductFilterParams interface includes in_stock_only field
- [ ] API client passes in_stock_only parameter
- [ ] ProductCard shows quantity-based status (0 = out, 1-5 = warning, 6+ = in stock)
- [ ] ProductCard displays "Only X left!" for low stock items
- [ ] ProductFilters component includes "In Stock Only" checkbox
- [ ] Checkbox properly integrated with form state and submission
- [ ] Frontend linting passes (biome check)

### Integration Testing
- [ ] Backend API returns product_stock_quantity field
- [ ] Out-of-stock products show red "Out of Stock" badge
- [ ] Low stock products show amber "Only X left!" warning
- [ ] Normal stock products show green "In Stock" badge
- [ ] "In Stock Only" checkbox filters correctly (30 → 26 products)
- [ ] Combined filters work (category + stock filter)
- [ ] Clear filters resets checkbox and shows all products
- [ ] curl tests verify API behavior

---

## Notes

### Key Implementation Decisions

1. **Stock Quantity Ranges**:
   - 0 = Out of stock (red badge, X icon)
   - 1-5 = Low stock (amber badge, warning icon, shows exact count)
   - 6+ = Normal stock (green badge, checkmark icon)

2. **Low Stock Threshold**: Using 5 as the threshold for "low stock" warnings. This is configurable and can be adjusted based on business requirements.

3. **Data Distribution**: Out of 30 products:
   - 4 out of stock (13%)
   - 6 low stock (20%)
   - 20 normal stock (67%)
   This provides good variety for testing and demonstration.

4. **Filter Default**: in_stock_only defaults to false to show all products on initial load. Users opt-in to hiding out-of-stock items.

5. **Field Naming**: Following existing convention of verbose, prefixed names: `product_stock_quantity` (not just `quantity` or `stock`).

6. **Backward Compatibility**: This is a breaking change - any existing API consumers expecting product_in_stock will need to update their code.

### Future Enhancements

1. **Stock Level Configuration**: Make low stock threshold configurable (currently hardcoded as 5)
2. **Stock History**: Track stock level changes over time
3. **Auto-hide Out of Stock**: Option to automatically enable in_stock_only filter
4. **Stock Notifications**: Alert users when favorited items come back in stock
5. **Quantity Input**: Allow customers to select quantity when adding to cart (with stock validation)
