# Product Catalog API - Project Context

## Code Quality

### Check code for issues

uv run ruff check .

### Auto-fix issues

uv run ruff check --fix .

### Format code

uv run ruff format

## Architecture Pattern

This codebase follows a **service layer architecture**:

```
API Layer (app/api/) → Service Layer (app/services/) → Data Layer (app/data/)
```

- **API routes** (`app/api/products.py`) handle HTTP requests/responses
- **Service functions** (`app/services/product_service.py`) contain business logic
- **Data models** (`app/models/`) define request/response structures with Pydantic

**Never put business logic in route handlers - always delegate to service layer.**

## Naming Conventions

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

## Type Annotations Pattern

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

## Logging Pattern

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

## Error Handling Pattern

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

## Pydantic Model Pattern

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

## Key Patterns Summary

- ✅ Verbose names with `product_` prefix and `_usd` suffix
- ✅ `Decimal` type for money (never `float`)
- ✅ Complete type hints on all functions
- ✅ Structured logging for operations and errors
- ✅ `ErrorResponse` model for all API errors
- ✅ Service layer for business logic (not in route handlers)
- ✅ Pydantic models for query parameter validation
