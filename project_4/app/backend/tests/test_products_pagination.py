"""
Tests for product pagination functionality.

These tests verify the pagination feature works correctly, including:
- Default pagination (page 1, page size 10)
- Custom page sizes (25, 50)
- Navigation between pages
- Pagination metadata correctness
- Edge cases (empty pages, invalid page sizes)
- Pagination combined with filters
"""

from fastapi.testclient import TestClient


def test_get_products_page_1_with_default_page_size_returns_10_products(test_client: TestClient) -> None:
    """
    Test that GET /api/products with default pagination returns first 10 products.

    With default settings (page_number=1, page_size=10), the API should
    return exactly 10 products from the 30 total seed products.
    """
    response = test_client.get("/api/products")
    data = response.json()

    assert response.status_code == 200
    assert len(data["products"]) == 10
    assert data["total_count"] == 30
    # Verify we got the first 10 products (IDs 1-10)
    product_ids = [p["product_id"] for p in data["products"]]
    assert product_ids == list(range(1, 11))


def test_get_products_page_2_returns_next_10_products(test_client: TestClient) -> None:
    """
    Test that GET /api/products?page_number=2 returns products 11-20.

    Page 2 with default page_size=10 should return products 11-20.
    """
    response = test_client.get("/api/products?page_number=2")
    data = response.json()

    assert response.status_code == 200
    assert len(data["products"]) == 10
    # Verify we got products 11-20
    product_ids = [p["product_id"] for p in data["products"]]
    assert product_ids == list(range(11, 21))


def test_get_products_with_page_size_25_returns_25_products(test_client: TestClient) -> None:
    """
    Test that GET /api/products?page_size=25 returns 25 products.

    Page 1 with page_size=25 should return the first 25 products.
    """
    response = test_client.get("/api/products?page_size=25")
    data = response.json()

    assert response.status_code == 200
    assert len(data["products"]) == 25
    assert data["total_count"] == 30
    assert data["pagination"]["page_size"] == 25
    assert data["pagination"]["total_pages"] == 2


def test_get_products_with_page_size_50_returns_all_30_products(test_client: TestClient) -> None:
    """
    Test that GET /api/products?page_size=50 returns all 30 products.

    Page 1 with page_size=50 should return all 30 products since
    we only have 30 seed products in the database.
    """
    response = test_client.get("/api/products?page_size=50")
    data = response.json()

    assert response.status_code == 200
    assert len(data["products"]) == 30
    assert data["total_count"] == 30
    assert data["pagination"]["page_size"] == 50
    assert data["pagination"]["total_pages"] == 1


def test_get_products_pagination_metadata_correct(test_client: TestClient) -> None:
    """
    Test that pagination metadata is correctly calculated.

    With 30 products and page_size=10, we should have:
    - page_number: 1
    - page_size: 10
    - total_count: 30
    - total_pages: 3
    - has_previous_page: False
    - has_next_page: True
    """
    response = test_client.get("/api/products")
    data = response.json()

    assert response.status_code == 200
    pagination = data["pagination"]

    assert pagination["page_number"] == 1
    assert pagination["page_size"] == 10
    assert pagination["total_count"] == 30
    assert pagination["total_pages"] == 3
    assert pagination["has_previous_page"] is False
    assert pagination["has_next_page"] is True


def test_get_products_last_page_has_remaining_items(test_client: TestClient) -> None:
    """
    Test that the last page returns the remaining items correctly.

    With 30 products and page_size=10, page 3 should return the last 10 products.
    """
    response = test_client.get("/api/products?page_number=3")
    data = response.json()

    assert response.status_code == 200
    assert len(data["products"]) == 10
    # Verify we got products 21-30
    product_ids = [p["product_id"] for p in data["products"]]
    assert product_ids == list(range(21, 31))
    # Verify pagination metadata for last page
    assert data["pagination"]["has_previous_page"] is True
    assert data["pagination"]["has_next_page"] is False


def test_get_products_page_beyond_range_returns_empty(test_client: TestClient) -> None:
    """
    Test that requesting a page beyond the valid range returns empty products.

    With 30 products and page_size=10, page 4 should return an empty list
    but still contain valid pagination metadata.
    """
    response = test_client.get("/api/products?page_number=4")
    data = response.json()

    assert response.status_code == 200
    assert len(data["products"]) == 0
    assert data["total_count"] == 30
    # Pagination metadata should still be valid
    assert data["pagination"]["page_number"] == 4
    assert data["pagination"]["total_pages"] == 3
    assert data["pagination"]["has_previous_page"] is True
    assert data["pagination"]["has_next_page"] is False


def test_get_products_invalid_page_size_returns_400(test_client: TestClient) -> None:
    """
    Test that invalid page_size values return HTTP 400 error.

    Only page_size values of 10, 25, or 50 are allowed. Other values
    should return a 400 error with error_code="invalid_page_size".
    """
    # Test invalid page sizes
    invalid_sizes = [5, 15, 20, 30, 100]

    for page_size in invalid_sizes:
        response = test_client.get(f"/api/products?page_size={page_size}")
        data = response.json()

        assert response.status_code == 400, f"Expected 400 for page_size={page_size}"
        assert data["error_code"] == "invalid_page_size"
        assert "allowed_values" in data["error_details"]
        assert data["error_details"]["allowed_values"] == [10, 25, 50]


def test_get_products_pagination_with_filters(test_client: TestClient) -> None:
    """
    Test that pagination works correctly with filter parameters.

    When filtering by category=electronics (8 products), pagination
    should work on the filtered result set.
    """
    response = test_client.get("/api/products?category=electronics&page_size=10")
    data = response.json()

    assert response.status_code == 200
    assert len(data["products"]) == 8
    assert data["total_count"] == 8
    assert all(p["product_category"] == "electronics" for p in data["products"])
    # With 8 products and page_size=10, we have 1 page
    assert data["pagination"]["total_pages"] == 1
    assert data["pagination"]["has_next_page"] is False


def test_pagination_metadata_has_previous_and_next_flags(test_client: TestClient) -> None:
    """
    Test that has_previous_page and has_next_page flags are correctly set.

    - Page 1: has_previous_page=False, has_next_page=True
    - Page 2: has_previous_page=True, has_next_page=True
    - Page 3: has_previous_page=True, has_next_page=False
    """
    # Page 1 - first page
    response = test_client.get("/api/products?page_number=1")
    data = response.json()
    assert data["pagination"]["has_previous_page"] is False
    assert data["pagination"]["has_next_page"] is True

    # Page 2 - middle page
    response = test_client.get("/api/products?page_number=2")
    data = response.json()
    assert data["pagination"]["has_previous_page"] is True
    assert data["pagination"]["has_next_page"] is True

    # Page 3 - last page
    response = test_client.get("/api/products?page_number=3")
    data = response.json()
    assert data["pagination"]["has_previous_page"] is True
    assert data["pagination"]["has_next_page"] is False


def test_pagination_with_price_filter_and_page_navigation(test_client: TestClient) -> None:
    """
    Test pagination combined with price filters.

    Filter by min_price_usd=100 and verify pagination works correctly
    across multiple pages.
    """
    # First, get total count with filter
    response = test_client.get("/api/products?min_price_usd=100&page_size=50")
    data = response.json()
    total_expensive_products = data["total_count"]

    # Now test pagination with page_size=10
    response = test_client.get("/api/products?min_price_usd=100&page_size=10")
    data = response.json()

    assert response.status_code == 200
    assert data["total_count"] == total_expensive_products
    # All returned products should have price >= 100
    assert all(float(p["product_price_usd"]) >= 100 for p in data["products"])


def test_empty_filter_result_returns_valid_pagination(test_client: TestClient) -> None:
    """
    Test that filtering with no matching results returns valid pagination metadata.

    When filters result in no matching products, the pagination metadata
    should still be valid (total_pages=0, empty products array).
    """
    # Use a search keyword that won't match any products
    response = test_client.get("/api/products?search_keyword=xyznonexistent123")
    data = response.json()

    assert response.status_code == 200
    assert len(data["products"]) == 0
    assert data["total_count"] == 0
    # Pagination metadata should reflect empty result
    assert data["pagination"]["page_number"] == 1
    assert data["pagination"]["total_pages"] == 0
    assert data["pagination"]["has_previous_page"] is False
    assert data["pagination"]["has_next_page"] is False
