# Feature: Product Filtering and Search

## Task Reference

- Task ID: FEAT-1234
- Priority: High

## What & Why

### Feature Description

Add filtering, search, and sorting capabilities to the product catalog API. Currently `GET /api/products` returns all 30 products without any filtering options. This feature enables users to narrow down products by price range, category, keyword search, and sort results.

### User Story

As a product catalog API consumer
I want to filter and search products by multiple criteria
So that I can efficiently find relevant products without receiving the entire catalog

## Requirements

### Functional Requirements

- Support price range filtering (minimum and maximum price)
- Support category filtering (electronics, clothing, home, sports, books)
- Support keyword search in product names and descriptions
- Support sorting by price or name in ascending/descending order
- All filters are optional and work together (AND logic)
- Backwards compatible - no filters returns all products

### API Changes

Add optional query parameters to `GET /api/products`:

| Parameter         | Type    | Required | Validation                                           | Description                                          |
| ----------------- | ------- | -------- | ---------------------------------------------------- | ---------------------------------------------------- |
| minimum_price_usd | Decimal | No       | >= 0, 2 decimal places                               | Filter products with price >= this value             |
| maximum_price_usd | Decimal | No       | >= 0, 2 decimal places                               | Filter products with price <= this value             |
| category          | Literal | No       | One of: electronics, clothing, home, sports, books   | Filter products by category                          |
| search_keyword    | str     | No       | Min length: 1, Max length: 100                       | Search in product_name and product_description       |
| sort_by           | Literal | No       | One of: price_asc, price_desc, name_asc, name_desc   | Sort results by price or name                        |

### Business Rules

- **No filters provided** → Return all 30 products
- **Multiple filters** → Apply all filters using AND logic (not OR)
- **Search is partial match** → "wire" matches "Wireless Mouse"
- **Search is case-insensitive** → "WIRELESS" matches "wireless"
- **Price range validation** → If min_price > max_price, return HTTP 400 error with error_code "invalid_price_range"

## Implementation Plan

### Files to Modify

1. **app/models/product.py** - Add `ProductFilterParameters` Pydantic model for query parameter validation
2. **app/services/product_service.py** - Add `filter_and_search_products()` function with filtering business logic
3. **app/api/products.py** - Update `get_products()` endpoint to accept and use filter parameters

### Step-by-Step Tasks

#### Step 1: Data Models

- [ ] Add `ProductFilterParameters` to `app/models/product.py`
- [ ] Include proper type hints and Field() validation
- [ ] Follow naming conventions (product\_ prefix, \_usd suffix for money, use Decimal for prices)
- [ ] Add comprehensive docstring
- [ ] Use `ProductCategory` type for category field (already exists in the model)
- [ ] Use `Literal` type for sort_by field with exact values: "price_asc", "price_desc", "name_asc", "name_desc"

#### Step 2: Service Layer

- [ ] Add `filter_and_search_products()` to `app/services/product_service.py`
- [ ] Implement core business logic:
  - Start with all products from `_PRODUCTS_DATABASE`
  - Apply price filters (minimum_price_usd, maximum_price_usd)
  - Apply category filter
  - Apply search_keyword filter (case-insensitive partial match in name OR description)
  - Apply sorting if requested
- [ ] Add structured logging for operation start with all filter parameters
- [ ] Validate inputs: if both min and max price provided and min > max, raise `ValueError`
- [ ] Add structured logging for operation completion with filtered product count
- [ ] Add comprehensive docstring with Args, Returns, Raises
- [ ] Follow patterns from CLAUDE.md

#### Step 3: API Layer

- [ ] Update `get_products()` endpoint in `app/api/products.py`
- [ ] Use `Depends()` for query parameter injection with `ProductFilterParameters`
- [ ] Add error handling:
  - Catch `ValueError` from service layer
  - Convert to HTTP 400 with `ErrorResponse` model
  - Use error_code="invalid_price_range"
- [ ] Log API requests with relevant filter parameters
- [ ] Return `ProductListResponse` with filtered products
- [ ] Update endpoint docstring to document query parameters

#### Step 4: Testing & Validation

- [ ] Verify test file exists: `tests/test_products_filtering.py`
- [ ] Run tests: `uv run pytest tests/test_products_filtering.py -v`
- [ ] Ensure all 8 tests pass
- [ ] Run full test suite to check for regressions: `uv run pytest tests/ -v`

## Success Criteria

- [ ] All tests in `tests/test_products_filtering.py` pass (8/8 tests)
- [ ] Backwards compatible (no filters = all products returned)
- [ ] Follows CLAUDE.md patterns (naming, types, logging, errors)
- [ ] Invalid price range returns proper ErrorResponse with error_code="invalid_price_range"
- [ ] Structured logging captures all filter operations
- [ ] All acceptance criteria from TASK.md met

## Testing & Validation

### Testing Commands

```bash
# Run feature-specific tests
uv run pytest tests/test_products_filtering.py -v

# Run all tests to check for regressions
uv run pytest tests/ -v

# Manual API tests
curl "http://localhost:8567/api/products"
curl "http://localhost:8567/api/products?minimum_price_usd=50&maximum_price_usd=100"
curl "http://localhost:8567/api/products?category=electronics"
curl "http://localhost:8567/api/products?search_keyword=wireless"
curl "http://localhost:8567/api/products?sort_by=price_asc"
curl "http://localhost:8567/api/products?minimum_price_usd=100&maximum_price_usd=50"  # Should return 400 error
```

## Pattern Compliance Checklist

Before marking complete, verify code follows CLAUDE.md patterns:

- [ ] ✅ Uses `Decimal` for money (never float)
- [ ] ✅ Complete type hints on all functions
- [ ] ✅ Verbose naming (product\_ prefix, \_usd suffix)
- [ ] ✅ Structured logging with logger.info() and logger.error()
- [ ] ✅ ErrorResponse model for all API errors
- [ ] ✅ Business logic in service layer (not in routes)
- [ ] ✅ Pydantic models with Field() validation
- [ ] ✅ Comprehensive docstrings

## Expected Behavior

### Example Request (Success)

```bash
curl "http://localhost:8567/api/products?minimum_price_usd=20&maximum_price_usd=50&category=electronics"
```

### Expected Response (Success)

```json
{
  "products": [
    {
      "product_id": 1,
      "product_name": "Wireless Bluetooth Mouse",
      "product_description": "...",
      "product_price_usd": "29.99",
      "product_category": "electronics",
      "product_in_stock": true
    }
  ],
  "total_count": 3
}
```

### Example Request (Error)

```bash
curl "http://localhost:8567/api/products?minimum_price_usd=100&maximum_price_usd=50"
```

### Expected Response (Error)

```json
{
  "error_code": "invalid_price_range",
  "error_message": "Minimum price cannot exceed maximum price",
  "error_details": {
    "min_price_usd": "100.00",
    "max_price_usd": "50.00",
    "constraint": "minimum_price_usd <= maximum_price_usd"
  },
  "timestamp_utc": "2025-10-09T20:46:47.123456Z"
}
```

## Implementation Examples

### Example: Price Filtering Logic

```python
# Start with all products
filtered_products = list(_PRODUCTS_DATABASE)

# Apply minimum price filter
if minimum_price_usd is not None:
    filtered_products = [
        product for product in filtered_products
        if product.product_price_usd >= minimum_price_usd
    ]

# Apply maximum price filter
if maximum_price_usd is not None:
    filtered_products = [
        product for product in filtered_products
        if product.product_price_usd <= maximum_price_usd
    ]
```

### Example: Search Logic

```python
# Apply keyword search (case-insensitive, partial match)
if search_keyword is not None:
    search_keyword_lower = search_keyword.lower()
    filtered_products = [
        product for product in filtered_products
        if search_keyword_lower in product.product_name.lower()
        or search_keyword_lower in product.product_description.lower()
    ]
```

### Example: Sorting Logic

```python
# Apply sorting if requested
if sort_by == "price_asc":
    filtered_products.sort(key=lambda p: p.product_price_usd)
elif sort_by == "price_desc":
    filtered_products.sort(key=lambda p: p.product_price_usd, reverse=True)
elif sort_by == "name_asc":
    filtered_products.sort(key=lambda p: p.product_name)
elif sort_by == "name_desc":
    filtered_products.sort(key=lambda p: p.product_name, reverse=True)
```

## Notes & Considerations

- The service layer should raise `ValueError` for invalid price ranges
- The API layer catches this and converts to HTTP 400 with ErrorResponse
- All filters use cumulative AND logic (not OR) - a product must match ALL provided filters
- Search matches if keyword appears in EITHER product_name OR product_description
- Use `ProductCategory` type alias that already exists in `app/models/product.py`
- The API server runs on port 8567 (see run_api.py:11)
