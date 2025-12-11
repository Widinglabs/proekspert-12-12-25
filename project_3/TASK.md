# [FEAT-1234] Add Product Filtering to Catalog API

## Description

Users need to filter and search products in the catalog API. Currently `GET /api/products` returns all 30 products without filtering capabilities.

## Requirements

Add filtering and search capabilities to `GET /api/products`:

- **Price filtering**: Support minimum and maximum price filters
- **Category filtering**: Allow filtering by product category
- **Keyword search**: Search product names and descriptions
- **Sorting**: Enable sorting by price or name (both directions)

All filters should be optional and work together when combined.

## Acceptance Criteria

- [ ] All filtering tests pass
- [ ] Invalid inputs return appropriate HTTP 400 errors
- [ ] Backwards compatible (no filters = all products)
- [ ] Follows existing code patterns and conventions

## Technical Notes

- Validate query parameters
- Use appropriate types for monetary values
- Log filter operations

## Definition of Done

- All acceptance criteria met
- All Tests passing
  `uv run pytest`

## Testing strategy

    """
    Test filtering products by minimum price.

    When min_price_usd=100 is provided, only products costing $100 or more
    should be returned.

    Expected: Should return products like "Wireless Earbuds Pro" ($149.99),
    "Smart Robot Vacuum" ($299.99), "Adjustable Dumbbell Set" ($499.99), etc.
    """


    """
    Test filtering products by maximum price.

    When max_price_usd=30 is provided, only products costing $30 or less
    should be returned.

    Expected: Should return products like "Smart LED Light Bulb" ($19.99),
    "Classic Cotton T-Shirt" ($24.99), "Merino Wool Beanie" ($29.99), etc.
    """



    """
    Test filtering products by both minimum and maximum price.

    When min_price_usd=25 and max_price_usd=50 are provided, only products
    in that price range should be returned.

    Expected: Should return products like "Wireless Bluetooth Mouse" ($29.99),
    "USB-C Hub 7-in-1" ($45.99), "Ceramic Non-Stick Frying Pan" ($49.99), etc.
    """




    """
    Test filtering products by category.

    When category=electronics is provided, only electronics products
    should be returned.

    Expected: Should return 8 electronics products (IDs 1-8).
    """




    """
    Test searching products by keyword.

    When search_keyword=wireless is provided, only products with "wireless"
    in their name or description should be returned (case-insensitive).

    Expected: Should return "Wireless Bluetooth Mouse", "Wireless Earbuds Pro",
    "Wireless Charger Stand", etc.
    """



    """
    Test filtering with multiple parameters combined.

    When category=electronics AND max_price_usd=50 are provided, only
    electronics products costing $50 or less should be returned.

    Expected: Should return products like "Wireless Bluetooth Mouse" ($29.99),
    "USB-C Hub 7-in-1" ($45.99), "Smart LED Light Bulb" ($19.99), etc.
    """



    """
    Test that invalid price range (min > max) returns HTTP 400 error.

    When min_price_usd is greater than max_price_usd, the API should
    return a 400 Bad Request error with a clear error message.

    Expected error response:
    {
        "error_code": "invalid_price_range",
        "error_message": "Minimum price cannot exceed maximum price",
        "error_details": {...},
        "timestamp_utc": "..."
    }
    """



    """
    Test that when no filters are provided, all products are returned.

    This ensures that filtering is optional and the default behavior
    (no parameters) still works correctly.

    Expected: Should return all 30 products.
    """
