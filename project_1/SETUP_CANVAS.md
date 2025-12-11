# Setup Canvas for Product Filtering Feature

**Use this context for Attempt 2 (Systematic 5%)**

This document contains all the information AI needs to implement the filtering functionality following existing patterns perfectly.

---

## CONTEXT: Existing Codebase Patterns

### Architecture Pattern

This codebase follows a **service layer architecture**:

```
API Layer (app/api/) → Service Layer (app/services/) → Data Layer (app/data/)
```

- **API routes** (`app/api/products.py`) handle HTTP requests/responses
- **Service functions** (`app/services/product_service.py`) contain business logic
- **Data models** (`app/models/`) define request/response structures with Pydantic

**Never put business logic in route handlers - always delegate to service layer.**

### Naming Conventions

This codebase uses **verbose, intention-revealing names**:

✅ **DO THIS:**

- All product-related fields use `product_` prefix: `product_id`, `product_name`, `product_price_usd`
- Money fields use `_usd` suffix: `product_price_usd`, `minimum_price_usd`
- Use `Decimal` type for money (NEVER `float`)
- Function names are descriptive: `filter_products_by_category_and_price_range()`
- Variable names are clear: `filtered_products_list`, `matching_products_count`

❌ **DON'T DO THIS:**

- Short names: `price`, `min`, `max`, `prod`
- Generic names: `data`, `items`, `results`
- Using `float` for money

### Type Annotations Pattern

**Every function has complete type hints:**

```python
def filter_products_by_category_and_price_range(
    target_category: str,
    minimum_price_usd: Decimal,
    maximum_price_usd: Decimal
) -> list[Product]:
```

**Every field uses Pydantic `Field()` with validation:**

```python
min_price_usd: Decimal | None = Field(
    default=None,
    description="Minimum price filter in US dollars",
    ge=0,  # Greater than or equal to 0
    decimal_places=2
)
```

### Logging Pattern

This codebase uses **structured JSON logging to stdout**:

```python
from app.core.logging_config import StructuredLogger

logger = StructuredLogger(__name__)

# Log operations with context
logger.info(
    "filtering_products",
    filter_category="electronics",
    filter_min_price="10.00",
    filter_max_price="100.00",
    total_products_before_filter=30
)

# Log errors with fix suggestions
logger.error(
    "product_filter_validation_failed",
    error_type="invalid_price_range",
    error_details={
        "min_price_provided": "100.00",
        "max_price_provided": "50.00",
        "validation_rule": "min_price must be <= max_price"
    },
    user_facing_message="Minimum price cannot be greater than maximum price",
    fix_suggestion="Ensure min_price_usd <= max_price_usd in query parameters"
)
```

**Always log:**

- When filtering starts (with all filter parameters)
- When filtering completes (with result count)
- When validation fails (with error details and fix suggestions)

### Error Handling Pattern

**All API errors use the `ErrorResponse` model:**

```python
from fastapi import HTTPException
from app.models.error import ErrorResponse

# When validation fails
raise HTTPException(
    status_code=400,
    detail=ErrorResponse(
        error_code="invalid_price_range",
        error_message="Minimum price cannot exceed maximum price",
        error_details={
            "min_price_usd": str(minimum_price_usd),
            "max_price_usd": str(maximum_price_usd),
            "constraint": "min_price_usd <= max_price_usd"
        }
    ).model_dump()
)
```

**Error response structure:**

- `error_code`: Machine-readable code (e.g., `"invalid_price_range"`)
- `error_message`: Human-friendly message for end users
- `error_details`: Dictionary with debugging context
- `timestamp_utc`: Automatically added by the model

### Pydantic Model Pattern

**Query parameters use Pydantic models for validation:**

Look at `app/models/product.py` to see the pattern:

```python
from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Literal

class ProductFilterParameters(BaseModel):
    """Query parameters for filtering products."""

    min_price_usd: Decimal | None = Field(
        default=None,
        description="Filter by minimum price",
        ge=0,
        decimal_places=2
    )

    max_price_usd: Decimal | None = Field(
        default=None,
        description="Filter by maximum price",
        ge=0,
        decimal_places=2
    )

    category: Literal["electronics", "clothing", "home", "sports", "books"] | None = Field(
        default=None,
        description="Filter by product category"
    )
```

---

### Feature: Add Filtering to GET /api/products

Currently, `GET /api/products` returns all 30 products. Add optional query parameters to filter results:

#### Query Parameters to Add

1. **min_price_usd** (Decimal, optional)
   - Filter products with price >= this value
   - Must be >= 0
   - Use Decimal type with 2 decimal places

2. **max_price_usd** (Decimal, optional)
   - Filter products with price <= this value
   - Must be >= 0
   - Use Decimal type with 2 decimal places

3. **category** (Literal, optional)
   - Filter products by category
   - Must be one of: "electronics", "clothing", "home", "sports", "books"

4. **search_keyword** (str, optional)
   - Search in product_name and product_description
   - Case-insensitive partial match
   - Min length: 1, Max length: 100

5. **sort_by** (Literal, optional)
   - Sort results
   - Options: "price_asc", "price_desc", "name_asc", "name_desc"
   - Default: no sorting (return in database order)

#### Business Logic Rules

- **No filters provided** → Return all 30 products
- **Multiple filters** → Apply all filters (AND logic, not OR)
- **Search is partial match** → "wire" matches "Wireless Mouse"
- **Search is case-insensitive** → "WIRELESS" matches "wireless"
- **Price range validation** → If min_price > max_price, return HTTP 400 error with error_code "invalid_price_range"

#### Success Criteria

✅ All 8 tests in `tests/test_products_filtering.py` must pass
✅ Structured logging follows existing pattern
✅ Error responses use `ErrorResponse` model
✅ Code matches naming conventions (verbose, product\_ prefix, \_usd suffix)
✅ Types are explicit (Decimal for money, Pydantic models, type hints)

---

## IMPLEMENTATION STEPS

Follow these steps in order:

### Step 1: Create ProductFilterParameters Model

**File:** `app/models/product.py`

Add a new Pydantic model for query parameters:

```python
class ProductFilterParameters(BaseModel):
    """
    Query parameters for filtering and searching products.

    All parameters are optional - if none provided, all products are returned.
    """

    minimum_price_usd: Decimal | None = Field(
        default=None,
        description="Filter products with price greater than or equal to this amount",
        ge=0,
        decimal_places=2
    )

    maximum_price_usd: Decimal | None = Field(
        default=None,
        description="Filter products with price less than or equal to this amount",
        ge=0,
        decimal_places=2
    )

    category: ProductCategory | None = Field(
        default=None,
        description="Filter products by category"
    )

    search_keyword: str | None = Field(
        default=None,
        description="Search for products by name or description (case-insensitive)",
        min_length=1,
        max_length=100
    )

    sort_by: Literal["price_asc", "price_desc", "name_asc", "name_desc"] | None = Field(
        default=None,
        description="Sort order for results"
    )
```

### Step 2: Add filter_and_search_products() to Service Layer

**File:** `app/services/product_service.py`

Add a new function that implements filtering logic:

```python
def filter_and_search_products(
    minimum_price_usd: Decimal | None = None,
    maximum_price_usd: Decimal | None = None,
    category: str | None = None,
    search_keyword: str | None = None,
    sort_by: str | None = None
) -> list[Product]:
    """
    Filter and search products based on provided criteria.

    Args:
        minimum_price_usd: Minimum price filter (inclusive)
        maximum_price_usd: Maximum price filter (inclusive)
        category: Category to filter by
        search_keyword: Keyword to search in name and description
        sort_by: Sort order (price_asc, price_desc, name_asc, name_desc)

    Returns:
        List of Product objects matching all filter criteria

    Raises:
        ValueError: If minimum_price_usd > maximum_price_usd
    """
```

**Implementation requirements:**

- Start with all products from `_PRODUCTS_DATABASE`
- Apply each filter if provided (cumulative AND logic)
- Log the operation start with all filter parameters
- Validate: if both min and max price provided and min > max, raise ValueError
- For search: check if keyword is in product_name OR product_description (case-insensitive)
- For sorting: sort by the specified field and direction
- Log the operation result with filtered product count
- Return filtered list

### Step 3: Update GET /api/products Endpoint

**File:** `app/api/products.py`

Modify the existing endpoint to accept query parameters:

```python
@router.get("", response_model=ProductListResponse)
async def get_products(
    filters: ProductFilterParameters = Depends()
) -> ProductListResponse:
    """
    Get products with optional filtering and search.

    Query Parameters:
        minimum_price_usd: Filter by minimum price
        maximum_price_usd: Filter by maximum price
        category: Filter by category
        search_keyword: Search in name and description
        sort_by: Sort results
    """
```

**Implementation requirements:**

- Use FastAPI's `Depends()` to inject query parameters as Pydantic model
- Log the API request with all filter parameters
- Call `product_service.filter_and_search_products()` with filter values
- Catch `ValueError` from service layer and convert to HTTP 400 error using `ErrorResponse`
- Return `ProductListResponse` with filtered products

### Step 4: Add Proper Error Handling

When the service raises `ValueError` (for invalid price range):

```python
try:
    products = product_service.filter_and_search_products(...)
except ValueError as validation_error:
    logger.error(
        "product_filter_validation_failed",
        error_type="invalid_price_range",
        error_details={
            "min_price_usd": str(filters.minimum_price_usd),
            "max_price_usd": str(filters.maximum_price_usd)
        },
        fix_suggestion="Ensure minimum_price_usd <= maximum_price_usd"
    )

    raise HTTPException(
        status_code=400,
        detail=ErrorResponse(
            error_code="invalid_price_range",
            error_message="Minimum price cannot exceed maximum price",
            error_details={
                "min_price_usd": str(filters.minimum_price_usd),
                "max_price_usd": str(filters.maximum_price_usd),
                "constraint": "minimum_price_usd <= maximum_price_usd"
            }
        ).model_dump()
    )
```

---

## EXAMPLE IMPLEMENTATIONS

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

---

## TESTING

Run the filtering tests to verify your implementation:

```bash
# Run filtering tests only
uv run pytest tests/test_products_filtering.py -v

# Run all tests
uv run pytest tests/ -v
```

All 8 tests in `test_products_filtering.py` should pass when correctly implemented.

---

## QUICK REFERENCE

**Key Files to Modify:**

1. `app/models/product.py` - Add `ProductFilterParameters` model
2. `app/services/product_service.py` - Add `filter_and_search_products()` function
3. `app/api/products.py` - Update `get_products()` endpoint

**Key Patterns to Follow:**

- ✅ Verbose names with `product_` prefix and `_usd` suffix
- ✅ `Decimal` type for money (never `float`)
- ✅ Complete type hints on all functions
- ✅ Structured logging for operations and errors
- ✅ `ErrorResponse` model for all API errors
- ✅ Service layer for business logic (not in route handlers)
- ✅ Pydantic models for query parameter validation

**Key Validation:**

- ✅ If `min_price > max_price` → raise `ValueError`
- ✅ Catch `ValueError` in API layer → return HTTP 400
- ✅ Use `error_code="invalid_price_range"`

---

Good luck! This should give AI everything it needs to implement the filtering perfectly following your existing patterns.
