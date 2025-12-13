"""
Tests for the reviews API endpoints.

These tests verify the review API functionality including:
- Fetching reviews for products
- Submitting new reviews
- Rating statistics calculation
- Validation and error handling
"""

import uuid

from fastapi.testclient import TestClient


def test_get_reviews_for_existing_product_returns_200(test_client: TestClient) -> None:
    """
    Test that GET /api/reviews/{product_id} returns HTTP 200 for valid product.

    Product 1 has seed reviews, so this should return successfully.
    """
    response = test_client.get("/api/reviews/1")

    assert response.status_code == 200


def test_get_reviews_returns_correct_structure(test_client: TestClient) -> None:
    """
    Test that GET /api/reviews/{product_id} returns the expected JSON structure.

    The response should have:
    - "reviews": list of review objects
    - "total_count": integer count of reviews
    - "rating_stats": aggregated rating statistics
    """
    response = test_client.get("/api/reviews/1")
    data = response.json()

    # Verify response structure
    assert "reviews" in data
    assert "total_count" in data
    assert "rating_stats" in data

    # Verify types
    assert isinstance(data["reviews"], list)
    assert isinstance(data["total_count"], int)
    assert isinstance(data["rating_stats"], dict)


def test_get_reviews_for_product_without_reviews_returns_empty(test_client: TestClient) -> None:
    """
    Test fetching reviews for a product with no reviews returns empty list.

    Product 999 does not exist in seed data, so should return empty results.
    """
    response = test_client.get("/api/reviews/999")

    assert response.status_code == 200

    data = response.json()
    assert data["total_count"] == 0
    assert data["reviews"] == []
    assert data["rating_stats"]["average_rating"] == 0.0
    assert data["rating_stats"]["total_review_count"] == 0


def test_review_objects_have_required_fields(test_client: TestClient) -> None:
    """
    Test that each review object contains all required fields.

    Every review should have:
    - review_id
    - product_id
    - user_name
    - review_rating
    - review_text (can be null)
    - review_timestamp_utc
    - review_helpful_count
    """
    response = test_client.get("/api/reviews/1")
    data = response.json()

    reviews = data["reviews"]
    assert len(reviews) > 0  # Make sure we have reviews to test

    # Check first review has all fields (spot check)
    first_review = reviews[0]
    required_fields = [
        "review_id",
        "product_id",
        "user_name",
        "review_rating",
        "review_text",
        "review_timestamp_utc",
        "review_helpful_count",
    ]

    for field in required_fields:
        assert field in first_review


def test_rating_stats_have_required_fields(test_client: TestClient) -> None:
    """
    Test that rating_stats contains all required fields.

    Rating stats should have:
    - product_id
    - average_rating
    - total_review_count
    - rating_distribution
    """
    response = test_client.get("/api/reviews/1")
    data = response.json()

    stats = data["rating_stats"]
    required_fields = [
        "product_id",
        "average_rating",
        "total_review_count",
        "rating_distribution",
    ]

    for field in required_fields:
        assert field in stats


def test_rating_stats_calculation_is_valid(test_client: TestClient) -> None:
    """
    Test that rating statistics are calculated correctly.

    The average rating should be between 0 and 5,
    and the total count should match the reviews list length.
    """
    response = test_client.get("/api/reviews/1")
    data = response.json()

    stats = data["rating_stats"]
    reviews = data["reviews"]

    # Average rating should be in valid range
    assert 0 <= stats["average_rating"] <= 5

    # Total count should match
    assert stats["total_review_count"] == len(reviews)

    # Rating distribution should have all 5 levels
    distribution = stats["rating_distribution"]
    for star in ["1", "2", "3", "4", "5"]:
        assert star in distribution


def test_submit_valid_review_returns_201(test_client: TestClient) -> None:
    """
    Test submitting a valid review returns HTTP 201 Created.

    Uses a unique username to avoid conflicts with seed data.
    """
    unique_username = f"Test User {uuid.uuid4().hex[:8]}"
    review_data = {
        "product_id": 3,
        "user_name": unique_username,
        "review_rating": 5,
        "review_text": "This is an excellent product with great quality and fast shipping! Highly recommended for anyone.",
    }

    response = test_client.post("/api/reviews", json=review_data)

    assert response.status_code == 201


def test_submit_review_returns_created_review(test_client: TestClient) -> None:
    """
    Test that submitting a review returns the created review object.

    The returned review should have all the submitted data plus
    auto-generated fields like review_id and timestamp.
    """
    unique_username = f"Test User {uuid.uuid4().hex[:8]}"
    review_data = {
        "product_id": 4,
        "user_name": unique_username,
        "review_rating": 4,
        "review_text": "Good product overall. Met my expectations and arrived on time. Would consider buying again.",
    }

    response = test_client.post("/api/reviews", json=review_data)
    data = response.json()

    assert response.status_code == 201
    assert data["user_name"] == unique_username
    assert data["review_rating"] == 4
    assert data["product_id"] == 4
    assert "review_id" in data
    assert "review_timestamp_utc" in data


def test_submit_review_without_text_succeeds(test_client: TestClient) -> None:
    """
    Test submitting review with rating only (no text) succeeds.

    Review text is optional, so reviews without text should be accepted.
    """
    unique_username = f"Test User {uuid.uuid4().hex[:8]}"
    review_data = {
        "product_id": 5,
        "user_name": unique_username,
        "review_rating": 5,
    }

    response = test_client.post("/api/reviews", json=review_data)
    data = response.json()

    assert response.status_code == 201
    assert data["review_text"] is None


def test_submit_review_with_invalid_rating_returns_422(test_client: TestClient) -> None:
    """
    Test that invalid rating (not 1-5) is rejected with 422 error.

    The rating must be an integer between 1 and 5.
    """
    review_data = {
        "product_id": 1,
        "user_name": "Test User",
        "review_rating": 6,  # Invalid: max is 5
    }

    response = test_client.post("/api/reviews", json=review_data)

    assert response.status_code == 422  # Validation error


def test_submit_review_with_zero_rating_returns_422(test_client: TestClient) -> None:
    """
    Test that rating of 0 is rejected with 422 error.

    The minimum valid rating is 1.
    """
    review_data = {
        "product_id": 1,
        "user_name": "Test User",
        "review_rating": 0,  # Invalid: min is 1
    }

    response = test_client.post("/api/reviews", json=review_data)

    assert response.status_code == 422  # Validation error


def test_submit_review_with_short_text_returns_422(test_client: TestClient) -> None:
    """
    Test that review text shorter than 50 characters is rejected.

    When text is provided, it must be at least 50 characters.
    """
    review_data = {
        "product_id": 1,
        "user_name": "Test User",
        "review_rating": 5,
        "review_text": "Too short",  # Invalid: needs 50+ chars
    }

    response = test_client.post("/api/reviews", json=review_data)

    assert response.status_code == 422  # Validation error


def test_duplicate_review_returns_409(test_client: TestClient) -> None:
    """
    Test that submitting a duplicate review (same user+product) returns 409 Conflict.

    Alice Johnson already has a review for product 1 in seed data.
    """
    review_data = {
        "product_id": 1,
        "user_name": "Alice Johnson",  # Already reviewed product 1
        "review_rating": 4,
        "review_text": "Trying to submit another review for the same product I already reviewed.",
    }

    response = test_client.post("/api/reviews", json=review_data)

    assert response.status_code == 409  # Conflict


def test_reviews_sorted_by_most_recent_first(test_client: TestClient) -> None:
    """
    Test that reviews are returned sorted by timestamp (newest first).

    The first review in the list should have the most recent timestamp.
    """
    response = test_client.get("/api/reviews/1")
    data = response.json()

    reviews = data["reviews"]
    if len(reviews) >= 2:
        # Compare timestamps (ISO format strings compare correctly)
        first_timestamp = reviews[0]["review_timestamp_utc"]
        second_timestamp = reviews[1]["review_timestamp_utc"]
        assert first_timestamp >= second_timestamp
