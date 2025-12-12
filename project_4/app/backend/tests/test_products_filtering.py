"""
Tests for product filtering functionality.

These tests are currently STUBS - they will fail until you implement
the filtering functionality. Your goal is to make all these tests pass!

Run these tests with:
    pytest tests/test_products_filtering.py -v
"""

from fastapi.testclient import TestClient


def test_filter_products_by_minimum_price(test_client: TestClient) -> None:
    """
    Test filtering products by minimum price.

    When min_price_usd=100 is provided, only products costing $100 or more
    should be returned.

    Expected: Should return products like "Wireless Earbuds Pro" ($149.99),
    "Smart Robot Vacuum" ($299.99), "Adjustable Dumbbell Set" ($499.99), etc.
    """
    response = test_client.get("/api/products?min_price_usd=100")
    data = response.json()

    assert response.status_code == 200
    assert all(float(product["product_price_usd"]) >= 100 for product in data["products"])


def test_filter_products_by_maximum_price(test_client: TestClient) -> None:
    """
    Test filtering products by maximum price.

    When max_price_usd=30 is provided, only products costing $30 or less
    should be returned.

    Expected: Should return products like "Smart LED Light Bulb" ($19.99),
    "Classic Cotton T-Shirt" ($24.99), "Merino Wool Beanie" ($29.99), etc.
    """
    response = test_client.get("/api/products?max_price_usd=30")
    data = response.json()

    assert response.status_code == 200
    assert all(float(product["product_price_usd"]) <= 30 for product in data["products"])


def test_filter_products_by_price_range(test_client: TestClient) -> None:
    """
    Test filtering products by both minimum and maximum price.

    When min_price_usd=25 and max_price_usd=50 are provided, only products
    in that price range should be returned.

    Expected: Should return products like "Wireless Bluetooth Mouse" ($29.99),
    "USB-C Hub 7-in-1" ($45.99), "Ceramic Non-Stick Frying Pan" ($49.99), etc.
    """
    response = test_client.get("/api/products?min_price_usd=25&max_price_usd=50")
    data = response.json()

    assert response.status_code == 200
    assert all(25 <= float(product["product_price_usd"]) <= 50 for product in data["products"])


def test_filter_products_by_category(test_client: TestClient) -> None:
    """
    Test filtering products by category.

    When category=electronics is provided, only electronics products
    should be returned.

    Expected: Should return 8 electronics products (IDs 1-8).
    """
    response = test_client.get("/api/products?category=electronics")
    data = response.json()

    assert response.status_code == 200
    assert all(product["product_category"] == "electronics" for product in data["products"])
    # We have 8 electronics products in seed data
    assert len(data["products"]) == 8


def test_search_products_by_keyword(test_client: TestClient) -> None:
    """
    Test searching products by keyword.

    When search_keyword=wireless is provided, only products with "wireless"
    in their name or description should be returned (case-insensitive).

    Expected: Should return "Wireless Bluetooth Mouse", "Wireless Earbuds Pro",
    "Wireless Charger Stand", etc.
    """
    response = test_client.get("/api/products?search_keyword=wireless")
    data = response.json()

    assert response.status_code == 200
    # All returned products should have "wireless" in name or description
    for product in data["products"]:
        name_lower = product["product_name"].lower()
        desc_lower = product["product_description"].lower()
        assert "wireless" in name_lower or "wireless" in desc_lower


def test_filter_with_multiple_parameters(test_client: TestClient) -> None:
    """
    Test filtering with multiple parameters combined.

    When category=electronics AND max_price_usd=50 are provided, only
    electronics products costing $50 or less should be returned.

    Expected: Should return products like "Wireless Bluetooth Mouse" ($29.99),
    "USB-C Hub 7-in-1" ($45.99), "Smart LED Light Bulb" ($19.99), etc.
    """
    response = test_client.get("/api/products?category=electronics&max_price_usd=50")
    data = response.json()

    assert response.status_code == 200
    assert all(
        product["product_category"] == "electronics" and float(product["product_price_usd"]) <= 50
        for product in data["products"]
    )


def test_invalid_price_range_returns_400(test_client: TestClient) -> None:
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
    response = test_client.get("/api/products?min_price_usd=100&max_price_usd=50")
    data = response.json()

    assert response.status_code == 400
    assert "error_code" in data
    assert data["error_code"] == "invalid_price_range"


def test_no_filters_returns_all_products(test_client: TestClient) -> None:
    """
    Test that when no filters are provided, all products are returned.

    This ensures that filtering is optional and the default behavior
    (no parameters) still works correctly. Uses page_size=50 to get all
    products in one page.

    Expected: Should return all 30 products.
    """
    response = test_client.get("/api/products?page_size=50")
    data = response.json()

    assert response.status_code == 200
    assert data["total_count"] == 30
    assert len(data["products"]) == 30


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
