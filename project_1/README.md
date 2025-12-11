# Product Catalog API - Module 1 Exercise

**Goal**: Experience the difference between common and systematic AI coding.

## Quick Start

```bash
# Install dependencies
uv venv --python 3.12
uv sync

# Run the API
uv run python run_api.py

# Test it (in another terminal)
curl http://localhost:8567/api/products

# Run tests
uv run pytest tests/test_products_basic.py -v
```

## Exercise Instructions

See **[EXERCISE.md](./EXERCISE.md)** for complete instructions.

## Key Features

### AI-Friendly Code

This codebase demonstrates best practices for AI-assisted development:

✅ **Verbose, clear names**: `product_price_usd`, `filter_products_by_category_and_price_range()`
✅ **Explicit types**: All functions have complete type hints
✅ **Structured logging**: JSON logs to stdout for AI debugging
✅ **Comprehensive docs**: Docstrings with examples on all functions
✅ **Clear patterns**: Service layer architecture, Pydantic validation

### Structured JSON Logging

All logs output as JSON to stdout:

```json
{
  "timestamp": "2025-01-15T10:30:45.123456Z",
  "level": "INFO",
  "logger_name": "app.services.product_service",
  "message": "retrieving_all_products",
  "total_products_in_database": 30,
  "operation": "get_all_products"
}
```

This makes it easy for AI to:

- Read error messages
- Understand application flow
- Debug issues
- See filter parameters
