"""
Tests for product detail and related products API endpoints.

These tests verify:
- GET /api/products/{product_id} returns correct product
- GET /api/products/{product_id}/related returns related products from same category
- 404 errors are returned for invalid product IDs
"""

from fastapi.testclient import TestClient


def test_get_product_by_id_returns_product(test_client: TestClient) -> None:
    """
    Test that GET /api/products/1 returns HTTP 200 and the correct product.

    Product ID 1 should exist in seed data and return product details.
    """
    response = test_client.get("/api/products/1")

    assert response.status_code == 200

    data = response.json()
    assert data["product_id"] == 1
    assert "product_name" in data
    assert "product_description" in data
    assert "product_price_usd" in data
    assert "product_category" in data
    assert "product_in_stock" in data


def test_get_product_by_id_invalid_returns_404(test_client: TestClient) -> None:
    """
    Test that GET /api/products/999 returns HTTP 404 for non-existent product.

    The error response should include the error_code "product_not_found".
    """
    response = test_client.get("/api/products/999")

    assert response.status_code == 404

    data = response.json()
    assert data["error_code"] == "product_not_found"
    assert "error_message" in data
    assert data["error_details"]["product_id"] == 999


def test_get_related_products_returns_same_category(test_client: TestClient) -> None:
    """
    Test that GET /api/products/1/related returns products from the same category.

    Product ID 1 is in "electronics" category, so all related products
    should also be from "electronics".
    """
    # First get the original product to know its category
    product_response = test_client.get("/api/products/1")
    product_data = product_response.json()
    original_category = product_data["product_category"]

    # Get related products
    response = test_client.get("/api/products/1/related")

    assert response.status_code == 200

    data = response.json()
    assert "products" in data
    assert "total_count" in data

    # All related products should be from the same category
    for product in data["products"]:
        assert product["product_category"] == original_category


def test_get_related_products_excludes_current(test_client: TestClient) -> None:
    """
    Test that GET /api/products/1/related does not include the current product.

    The related products list should not contain the product we're getting
    related items for.
    """
    response = test_client.get("/api/products/1/related")

    assert response.status_code == 200

    data = response.json()
    product_ids = [product["product_id"] for product in data["products"]]

    # Current product should not be in related products
    assert 1 not in product_ids


def test_get_related_products_respects_limit(test_client: TestClient) -> None:
    """
    Test that GET /api/products/1/related respects the limit query parameter.

    When limit=2 is specified, at most 2 related products should be returned.
    """
    response = test_client.get("/api/products/1/related?limit=2")

    assert response.status_code == 200

    data = response.json()
    assert len(data["products"]) <= 2
    assert data["total_count"] <= 2


def test_get_related_products_invalid_id_returns_404(test_client: TestClient) -> None:
    """
    Test that GET /api/products/999/related returns HTTP 404 for non-existent product.

    Getting related products for a non-existent product should return 404.
    """
    response = test_client.get("/api/products/999/related")

    assert response.status_code == 404

    data = response.json()
    assert data["error_code"] == "product_not_found"
    assert data["error_details"]["product_id"] == 999
