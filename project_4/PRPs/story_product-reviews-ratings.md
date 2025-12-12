---
name: "Product Reviews & Ratings - Fullstack Implementation"
description: "Star rating system and written reviews for products with backend API and frontend UI"
---

## Original Stories

### FEATURE: Product Reviews & Ratings

```
[FEAT-2001] Add Product Reviews and Ratings System

Implement a comprehensive review and rating system for products:
- Star rating display (1-5 stars) on product cards
- Detail page shows written reviews with ratings
- Backend endpoints for submitting and fetching reviews
- Average rating calculation and display
- Review submission with validation

Requirements:
- Star ratings: Integer values from 1 to 5
- Written reviews: Optional text (50-1000 characters when provided)
- Display: Show average rating and review count
- Validation: Prevent duplicate reviews from same user
- Sorting: Most recent reviews first
```

## Story Metadata

**Story Type**: Feature (Fullstack)
**Estimated Complexity**: Medium-High
**Primary Systems Affected**:
- Backend: `app/models/`, `app/services/`, `app/api/`
- Frontend: `src/lib/`, `src/components/`, `src/types/`

---

## CONTEXT REFERENCES

### Backend References
- `app/models/product.py` - Product model, will reference product_id for reviews
- `app/models/error.py` - ErrorResponse model for validation errors
- `app/services/product_service.py` - Service layer pattern reference
- `app/api/products.py` - API router pattern with structured logging
- `app/core/logging_config.py` - StructuredLogger usage pattern
- `app/data/seed_products.py` - Existing 30 products for seeding review data

### Frontend References
- `src/types/product.ts` - Product type definitions, will extend for reviews
- `src/types/error.ts` - ApiError class for error handling
- `src/lib/api-client.ts` - API client patterns to extend
- `src/lib/logger.ts` - Structured logging pattern (snake_case events)
- `src/components/ui/` - Radix UI components for rating display and forms
- Existing product grid and card components to extend

### Design Patterns to Follow
- Verbose naming: `review_id`, `review_text`, `review_rating` (not `id`, `text`, `rating`)
- Structured logging with contextual fields and `fix_suggestion`
- Type safety: Full Pydantic validation backend, strict TypeScript frontend
- Three-layer architecture: models → services → API
- Google-style docstrings with examples

---

## IMPLEMENTATION TASKS

### Phase 1: Backend - Data Models

#### TASK 1.1: CREATE app/models/review.py - Review data models

- CREATE: New file `app/models/review.py`
- IMPORT:
  ```python
  from datetime import datetime
  from typing import Literal
  from pydantic import BaseModel, Field
  ```
- DEFINE: `ReviewRating` type alias
  ```python
  ReviewRating = Literal[1, 2, 3, 4, 5]
  ```
- DEFINE: `Review` model
  ```python
  class Review(BaseModel):
      """
      Represents a product review with rating and optional text.

      Attributes:
          review_id: Unique identifier for the review
          product_id: ID of the product being reviewed
          user_name: Name of the user who submitted the review
          review_rating: Star rating (1-5, integer)
          review_text: Optional written review (50-1000 chars when provided)
          review_timestamp_utc: When the review was submitted (UTC)
          review_helpful_count: Number of users who found this helpful

      Examples:
          >>> Review(
          ...     review_id=1,
          ...     product_id=1,
          ...     user_name="John Doe",
          ...     review_rating=5,
          ...     review_text="Excellent product, exactly as described!",
          ...     review_timestamp_utc=datetime.utcnow(),
          ...     review_helpful_count=3
          ... )
      """
      review_id: int = Field(..., gt=0, description="Unique review identifier")
      product_id: int = Field(..., gt=0, description="Product being reviewed")
      user_name: str = Field(..., min_length=1, max_length=100, description="Name of reviewer")
      review_rating: ReviewRating = Field(..., description="Star rating (1-5)")
      review_text: str | None = Field(
          default=None,
          min_length=50,
          max_length=1000,
          description="Optional written review text"
      )
      review_timestamp_utc: datetime = Field(..., description="Review submission timestamp (UTC)")
      review_helpful_count: int = Field(default=0, ge=0, description="Number of helpful votes")
  ```
- DEFINE: `ProductRatingStats` model
  ```python
  class ProductRatingStats(BaseModel):
      """
      Aggregated rating statistics for a product.

      Attributes:
          product_id: ID of the product
          average_rating: Average of all ratings (0.0-5.0)
          total_review_count: Total number of reviews
          rating_distribution: Count of reviews for each star level (1-5)

      Examples:
          >>> ProductRatingStats(
          ...     product_id=1,
          ...     average_rating=4.5,
          ...     total_review_count=10,
          ...     rating_distribution={1: 0, 2: 1, 3: 1, 4: 3, 5: 5}
          ... )
      """
      product_id: int = Field(..., gt=0, description="Product ID")
      average_rating: float = Field(..., ge=0, le=5, description="Average rating (0.0-5.0)")
      total_review_count: int = Field(..., ge=0, description="Total number of reviews")
      rating_distribution: dict[int, int] = Field(
          ...,
          description="Count of reviews per star level (1-5)"
      )
  ```
- DEFINE: `ReviewListResponse` model
  ```python
  class ReviewListResponse(BaseModel):
      """
      Response for endpoints returning lists of reviews.

      Attributes:
          reviews: List of review objects
          total_count: Total number of reviews in response
          rating_stats: Aggregated rating statistics for the product

      Examples:
          >>> ReviewListResponse(
          ...     reviews=[review1, review2],
          ...     total_count=2,
          ...     rating_stats=ProductRatingStats(...)
          ... )
      """
      reviews: list[Review] = Field(..., description="List of reviews")
      total_count: int = Field(..., ge=0, description="Total review count")
      rating_stats: ProductRatingStats = Field(..., description="Rating statistics")
  ```
- DEFINE: `ReviewSubmission` model
  ```python
  class ReviewSubmission(BaseModel):
      """
      Request model for submitting a new review.

      Attributes:
          product_id: ID of product to review
          user_name: Name of reviewer
          review_rating: Star rating (1-5)
          review_text: Optional written review

      Examples:
          >>> ReviewSubmission(
          ...     product_id=1,
          ...     user_name="Jane Smith",
          ...     review_rating=4,
          ...     review_text="Good product, fast shipping."
          ... )
      """
      product_id: int = Field(..., gt=0, description="Product ID to review")
      user_name: str = Field(..., min_length=1, max_length=100, description="Reviewer name")
      review_rating: ReviewRating = Field(..., description="Star rating (1-5)")
      review_text: str | None = Field(
          default=None,
          min_length=50,
          max_length=1000,
          description="Optional review text (50-1000 chars)"
      )
  ```
- **VALIDATE**: `cd project_4/app/backend && uv run python -c "from app.models.review import Review, ReviewSubmission; print('Import OK')"`

---

### Phase 2: Backend - Service Layer

#### TASK 2.1: CREATE app/data/seed_reviews.py - Seed review data

- CREATE: New file `app/data/seed_reviews.py`
- IMPORT:
  ```python
  from datetime import datetime, timedelta
  from app.models.review import Review
  ```
- DEFINE: In-memory review database (list of 15-20 sample reviews)
  ```python
  _REVIEWS_DATABASE: list[Review] = [
      Review(
          review_id=1,
          product_id=1,
          user_name="Alice Johnson",
          review_rating=5,
          review_text="Amazing wireless mouse! Very comfortable and responsive.",
          review_timestamp_utc=datetime.utcnow() - timedelta(days=10),
          review_helpful_count=5
      ),
      # ... add 14-19 more reviews covering multiple products and rating levels
  ]
  ```
- SPREAD: Reviews across 5-7 different products
- VARY: Ratings (include 1-5 stars), some with text, some without
- DATES: Use different timestamps (last 30 days)
- **VALIDATE**: `cd project_4/app/backend && uv run python -c "from app.data.seed_reviews import _REVIEWS_DATABASE; print(len(_REVIEWS_DATABASE))"`

#### TASK 2.2: CREATE app/services/review_service.py - Review business logic

- CREATE: New file `app/services/review_service.py`
- IMPORT:
  ```python
  from datetime import datetime
  from app.core.logging_config import StructuredLogger
  from app.models.review import Review, ProductRatingStats, ReviewSubmission
  from app.data.seed_reviews import _REVIEWS_DATABASE

  logger = StructuredLogger(__name__)
  ```
- IMPLEMENT: `get_reviews_for_product(product_id: int) -> list[Review]`
  ```python
  def get_reviews_for_product(product_id: int) -> list[Review]:
      """
      Fetch all reviews for a specific product, sorted by most recent first.

      Args:
          product_id: ID of the product

      Returns:
          List of Review objects for the product, sorted by timestamp descending

      Examples:
          >>> reviews = get_reviews_for_product(product_id=1)
          >>> len(reviews) >= 0
          True
      """
      logger.info("fetching_product_reviews", product_id=product_id)

      product_reviews = [
          review for review in _REVIEWS_DATABASE
          if review.product_id == product_id
      ]

      # Sort by timestamp descending (most recent first)
      product_reviews.sort(key=lambda r: r.review_timestamp_utc, reverse=True)

      logger.info(
          "product_reviews_fetched",
          product_id=product_id,
          total_reviews=len(product_reviews)
      )

      return product_reviews
  ```
- IMPLEMENT: `calculate_rating_stats(product_id: int) -> ProductRatingStats`
  ```python
  def calculate_rating_stats(product_id: int) -> ProductRatingStats:
      """
      Calculate aggregated rating statistics for a product.

      Args:
          product_id: ID of the product

      Returns:
          ProductRatingStats with average rating and distribution

      Examples:
          >>> stats = calculate_rating_stats(product_id=1)
          >>> 0 <= stats.average_rating <= 5
          True
      """
      logger.info("calculating_rating_stats", product_id=product_id)

      reviews = get_reviews_for_product(product_id)

      if not reviews:
          return ProductRatingStats(
              product_id=product_id,
              average_rating=0.0,
              total_review_count=0,
              rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
          )

      # Calculate distribution
      distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
      total_rating = 0

      for review in reviews:
          distribution[review.review_rating] += 1
          total_rating += review.review_rating

      average = round(total_rating / len(reviews), 1)

      logger.info(
          "rating_stats_calculated",
          product_id=product_id,
          average_rating=average,
          total_reviews=len(reviews)
      )

      return ProductRatingStats(
          product_id=product_id,
          average_rating=average,
          total_review_count=len(reviews),
          rating_distribution=distribution
      )
  ```
- IMPLEMENT: `submit_review(submission: ReviewSubmission) -> Review`
  ```python
  def submit_review(submission: ReviewSubmission) -> Review:
      """
      Submit a new product review.

      Args:
          submission: ReviewSubmission data

      Returns:
          Created Review object

      Raises:
          ValueError: If user already reviewed this product

      Examples:
          >>> review = submit_review(ReviewSubmission(
          ...     product_id=1,
          ...     user_name="Test User",
          ...     review_rating=5,
          ...     review_text="Great product!"
          ... ))
          >>> review.review_rating == 5
          True
      """
      logger.info(
          "submitting_review",
          product_id=submission.product_id,
          user_name=submission.user_name,
          rating=submission.review_rating
      )

      # Check for duplicate review (same user + product)
      existing = [
          r for r in _REVIEWS_DATABASE
          if r.product_id == submission.product_id
          and r.user_name.lower() == submission.user_name.lower()
      ]

      if existing:
          logger.error(
              "duplicate_review_detected",
              product_id=submission.product_id,
              user_name=submission.user_name,
              fix_suggestion="User already reviewed this product"
          )
          raise ValueError(
              f"User '{submission.user_name}' has already reviewed product {submission.product_id}"
          )

      # Generate new review ID
      new_id = max([r.review_id for r in _REVIEWS_DATABASE], default=0) + 1

      # Create review
      new_review = Review(
          review_id=new_id,
          product_id=submission.product_id,
          user_name=submission.user_name,
          review_rating=submission.review_rating,
          review_text=submission.review_text,
          review_timestamp_utc=datetime.utcnow(),
          review_helpful_count=0
      )

      # Add to database
      _REVIEWS_DATABASE.append(new_review)

      logger.info(
          "review_submitted_successfully",
          review_id=new_review.review_id,
          product_id=submission.product_id
      )

      return new_review
  ```
- **VALIDATE**: `cd project_4/app/backend && uv run python -c "from app.services.review_service import get_reviews_for_product; print('Import OK')"`

---

### Phase 3: Backend - API Endpoints

#### TASK 3.1: CREATE app/api/reviews.py - Review API endpoints

- CREATE: New file `app/api/reviews.py`
- IMPORT:
  ```python
  from fastapi import APIRouter, HTTPException, status
  from app.core.logging_config import StructuredLogger
  from app.models.review import ReviewListResponse, ReviewSubmission, Review
  from app.models.error import ErrorResponse
  from app.services import review_service

  logger = StructuredLogger(__name__)
  router = APIRouter(prefix="/reviews", tags=["reviews"])
  ```
- IMPLEMENT: `GET /api/reviews/{product_id}` - Fetch reviews for product
  ```python
  @router.get(
      "/{product_id}",
      response_model=ReviewListResponse,
      summary="Get product reviews",
      description="Fetch all reviews for a specific product with rating statistics"
  )
  async def get_product_reviews(product_id: int) -> ReviewListResponse:
      """
      Retrieve all reviews for a product.

      Args:
          product_id: ID of the product

      Returns:
          ReviewListResponse with reviews and rating stats

      Raises:
          HTTPException: 400 if product_id is invalid
      """
      logger.info("api_get_product_reviews_started", product_id=product_id)

      if product_id <= 0:
          logger.error(
              "validation_failed",
              error_type="invalid_product_id",
              product_id=product_id,
              fix_suggestion="product_id must be positive integer"
          )
          raise HTTPException(
              status_code=status.HTTP_400_BAD_REQUEST,
              detail="product_id must be a positive integer"
          )

      reviews = review_service.get_reviews_for_product(product_id)
      rating_stats = review_service.calculate_rating_stats(product_id)

      response = ReviewListResponse(
          reviews=reviews,
          total_count=len(reviews),
          rating_stats=rating_stats
      )

      logger.info(
          "api_get_product_reviews_completed",
          product_id=product_id,
          total_reviews=len(reviews),
          average_rating=rating_stats.average_rating
      )

      return response
  ```
- IMPLEMENT: `POST /api/reviews` - Submit new review
  ```python
  @router.post(
      "",
      response_model=Review,
      status_code=status.HTTP_201_CREATED,
      responses={
          400: {"model": ErrorResponse},
          409: {"model": ErrorResponse}
      },
      summary="Submit product review",
      description="Submit a new review for a product with rating and optional text"
  )
  async def submit_product_review(submission: ReviewSubmission) -> Review:
      """
      Submit a new product review.

      Args:
          submission: ReviewSubmission with product_id, user_name, rating, text

      Returns:
          Created Review object

      Raises:
          HTTPException: 409 if user already reviewed product
      """
      logger.info(
          "api_submit_review_started",
          product_id=submission.product_id,
          user_name=submission.user_name,
          rating=submission.review_rating
      )

      try:
          new_review = review_service.submit_review(submission)

          logger.info(
              "api_submit_review_completed",
              review_id=new_review.review_id,
              product_id=submission.product_id
          )

          return new_review

      except ValueError as e:
          logger.error(
              "duplicate_review_error",
              product_id=submission.product_id,
              user_name=submission.user_name,
              error_message=str(e),
              fix_suggestion="Check if user already reviewed this product"
          )
          raise HTTPException(
              status_code=status.HTTP_409_CONFLICT,
              detail=str(e)
          )
  ```
- **VALIDATE**: `cd project_4/app/backend && uv run python -c "from app.api.reviews import router; print('Router OK')"`

#### TASK 3.2: UPDATE app/main.py - Register reviews router

- OPEN: `app/main.py`
- IMPORT: Add `from app.api import reviews`
- REGISTER: Add router after products router
  ```python
  app.include_router(reviews.router, prefix="/api")
  ```
- **VALIDATE**: `cd project_4/app/backend && uv run python -c "from app.main import app; print('App OK')"`

#### TASK 3.3: CREATE tests/test_reviews.py - Review API tests

- CREATE: New file `tests/test_reviews.py`
- IMPORT:
  ```python
  import pytest
  from fastapi.testclient import TestClient
  from app.main import app

  @pytest.fixture
  def test_client() -> TestClient:
      return TestClient(app)
  ```
- IMPLEMENT: Test cases
  ```python
  def test_get_reviews_for_existing_product(test_client: TestClient) -> None:
      """Test fetching reviews for a product that has reviews."""
      response = test_client.get("/api/reviews/1")
      assert response.status_code == 200
      data = response.json()
      assert "reviews" in data
      assert "total_count" in data
      assert "rating_stats" in data
      assert isinstance(data["reviews"], list)

  def test_get_reviews_for_product_without_reviews(test_client: TestClient) -> None:
      """Test fetching reviews for a product with no reviews."""
      response = test_client.get("/api/reviews/999")
      assert response.status_code == 200
      data = response.json()
      assert data["total_count"] == 0
      assert data["rating_stats"]["average_rating"] == 0.0

  def test_submit_valid_review(test_client: TestClient) -> None:
      """Test submitting a valid review."""
      review_data = {
          "product_id": 1,
          "user_name": "New Test User",
          "review_rating": 5,
          "review_text": "This is an excellent product with great quality and fast shipping!"
      }
      response = test_client.post("/api/reviews", json=review_data)
      assert response.status_code == 201
      data = response.json()
      assert data["review_rating"] == 5
      assert data["user_name"] == "New Test User"
      assert "review_id" in data

  def test_submit_review_without_text(test_client: TestClient) -> None:
      """Test submitting review with rating only (no text)."""
      review_data = {
          "product_id": 2,
          "user_name": "Another User",
          "review_rating": 4
      }
      response = test_client.post("/api/reviews", json=review_data)
      assert response.status_code == 201
      data = response.json()
      assert data["review_text"] is None

  def test_submit_review_with_invalid_rating(test_client: TestClient) -> None:
      """Test that invalid rating (not 1-5) is rejected."""
      review_data = {
          "product_id": 1,
          "user_name": "Test User",
          "review_rating": 6
      }
      response = test_client.post("/api/reviews", json=review_data)
      assert response.status_code == 422  # Validation error

  def test_rating_stats_calculation(test_client: TestClient) -> None:
      """Test that rating statistics are calculated correctly."""
      response = test_client.get("/api/reviews/1")
      assert response.status_code == 200
      stats = response.json()["rating_stats"]
      assert "average_rating" in stats
      assert "total_review_count" in stats
      assert "rating_distribution" in stats
      assert 0 <= stats["average_rating"] <= 5
  ```
- **VALIDATE**: `cd project_4/app/backend && uv run pytest tests/test_reviews.py -v`

#### TASK 3.4: VERIFY Backend - Run full test suite and linting

- RUN: `cd project_4/app/backend && uv run pytest tests/ -v`
- RUN: `cd project_4/app/backend && uv run ruff check . && uv run ruff format .`
- EXPECTED: All tests pass (existing + new review tests), no lint errors
- **VALIDATE**: `cd project_4/app/backend && uv run pytest && uv run ruff check .`

---

### Phase 4: Frontend - Type Definitions

#### TASK 4.1: CREATE src/types/review.ts - Review type definitions

- CREATE: New file `src/types/review.ts`
- CONTENT:
  ```typescript
  /**
   * Review types matching backend Pydantic models EXACTLY.
   *
   * Backend definitions (app/models/review.py):
   * - ReviewRating = Literal[1, 2, 3, 4, 5]
   * - Review model with strict field types
   * - ProductRatingStats for aggregated statistics
   *
   * IMPORTANT: These types must stay in sync with backend models.
   */

  /**
   * Review rating type (1-5 stars only).
   *
   * Backend: ReviewRating = Literal[1, 2, 3, 4, 5]
   */
  export type ReviewRating = 1 | 2 | 3 | 4 | 5;

  /**
   * Review model matching backend Pydantic Review model.
   *
   * Backend definition:
   * ```python
   * class Review(BaseModel):
   *     review_id: int = Field(..., gt=0)
   *     product_id: int = Field(..., gt=0)
   *     user_name: str = Field(..., min_length=1, max_length=100)
   *     review_rating: ReviewRating
   *     review_text: str | None = Field(default=None, min_length=50, max_length=1000)
   *     review_timestamp_utc: datetime
   *     review_helpful_count: int = Field(default=0, ge=0)
   * ```
   */
  export interface Review {
    /** Unique review identifier (always positive integer) */
    review_id: number;

    /** Product being reviewed (always positive integer) */
    product_id: number;

    /** Name of the reviewer (1-100 characters) */
    user_name: string;

    /** Star rating (1-5, integer) */
    review_rating: ReviewRating;

    /** Optional written review text (50-1000 characters when provided) */
    review_text: string | null;

    /** Review submission timestamp (ISO 8601 UTC string) */
    review_timestamp_utc: string;

    /** Number of users who found this review helpful */
    review_helpful_count: number;
  }

  /**
   * Product rating statistics matching backend ProductRatingStats model.
   *
   * Backend definition:
   * ```python
   * class ProductRatingStats(BaseModel):
   *     product_id: int = Field(..., gt=0)
   *     average_rating: float = Field(..., ge=0, le=5)
   *     total_review_count: int = Field(..., ge=0)
   *     rating_distribution: dict[int, int]
   * ```
   */
  export interface ProductRatingStats {
    /** Product ID */
    product_id: number;

    /** Average rating (0.0-5.0) */
    average_rating: number;

    /** Total number of reviews */
    total_review_count: number;

    /** Count of reviews per star level (1-5) */
    rating_distribution: Record<number, number>;
  }

  /**
   * Review list response matching backend ReviewListResponse model.
   *
   * Backend definition:
   * ```python
   * class ReviewListResponse(BaseModel):
   *     reviews: list[Review] = Field(...)
   *     total_count: int = Field(..., ge=0)
   *     rating_stats: ProductRatingStats = Field(...)
   * ```
   */
  export interface ReviewListResponse {
    /** Array of review objects */
    reviews: Review[];

    /** Total number of reviews */
    total_count: number;

    /** Rating statistics for the product */
    rating_stats: ProductRatingStats;
  }

  /**
   * Review submission data matching backend ReviewSubmission model.
   *
   * Backend definition:
   * ```python
   * class ReviewSubmission(BaseModel):
   *     product_id: int = Field(..., gt=0)
   *     user_name: str = Field(..., min_length=1, max_length=100)
   *     review_rating: ReviewRating
   *     review_text: str | None = Field(default=None, min_length=50, max_length=1000)
   * ```
   */
  export interface ReviewSubmission {
    /** Product ID to review (must be positive integer) */
    product_id: number;

    /** Reviewer name (1-100 characters) */
    user_name: string;

    /** Star rating (1-5) */
    review_rating: ReviewRating;

    /** Optional review text (50-1000 characters when provided) */
    review_text?: string;
  }
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 5: Frontend - API Client

#### TASK 5.1: UPDATE src/lib/api-client.ts - Add review API functions

- OPEN: `src/lib/api-client.ts`
- IMPORT: Add review types
  ```typescript
  import type { ReviewListResponse, ReviewSubmission, Review } from "@/types/review";
  ```
- ADD: `fetchProductReviews` function
  ```typescript
  /**
   * Fetch all reviews for a specific product.
   *
   * @param productId - ID of the product
   * @returns ReviewListResponse with reviews and rating statistics
   * @throws ApiError if fetch fails or returns non-ok status
   */
  export async function fetchProductReviews(productId: number): Promise<ReviewListResponse> {
    const endpoint = `/reviews/${productId}`;
    logger.info("fetching_product_reviews", { product_id: productId, endpoint });

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        logger.error("fetch_product_reviews_failed", {
          status_code: response.status,
          error_code: errorData.error_code,
          product_id: productId,
          fix_suggestion: "Check if product_id is valid and backend is running",
        });
        throw new ApiError(response.status, errorData);
      }

      const data: ReviewListResponse = await response.json();
      logger.info("fetch_product_reviews_success", {
        product_id: productId,
        total_reviews: data.total_count,
        average_rating: data.rating_stats.average_rating,
      });

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error("fetch_product_reviews_error", {
        error_message: error instanceof Error ? error.message : "Unknown error",
        product_id: productId,
        fix_suggestion: "Check network connection and backend availability",
      });
      throw error;
    }
  }
  ```
- ADD: `submitProductReview` function
  ```typescript
  /**
   * Submit a new product review.
   *
   * @param submission - ReviewSubmission data
   * @returns Created Review object
   * @throws ApiError if submission fails (validation or duplicate)
   */
  export async function submitProductReview(submission: ReviewSubmission): Promise<Review> {
    const endpoint = "/reviews";
    logger.info("submitting_product_review", {
      product_id: submission.product_id,
      user_name: submission.user_name,
      rating: submission.review_rating,
      has_text: !!submission.review_text,
    });

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        logger.error("submit_review_failed", {
          status_code: response.status,
          error_code: errorData.error_code,
          error_message: errorData.error_message,
          product_id: submission.product_id,
          fix_suggestion:
            response.status === 409
              ? "User has already reviewed this product"
              : "Check review data validation",
        });
        throw new ApiError(response.status, errorData);
      }

      const data: Review = await response.json();
      logger.info("submit_review_success", {
        review_id: data.review_id,
        product_id: submission.product_id,
      });

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error("submit_review_error", {
        error_message: error instanceof Error ? error.message : "Unknown error",
        product_id: submission.product_id,
        fix_suggestion: "Check network connection and backend availability",
      });
      throw error;
    }
  }
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 6: Frontend - UI Components

#### TASK 6.1: CREATE src/components/StarRating.tsx - Star rating display component

- CREATE: New file `src/components/StarRating.tsx`
- CONTENT:
  ```typescript
  import { Star } from "lucide-react";
  import type { ReviewRating } from "@/types/review";

  interface StarRatingProps {
    /** Rating value (1-5 for discrete, 0-5 for average with decimals) */
    rating: number;

    /** Total number of stars to display (default: 5) */
    maxStars?: number;

    /** Size of stars in pixels (default: 16) */
    size?: number;

    /** Whether to show rating number next to stars */
    showNumber?: boolean;

    /** Whether this is interactive (clickable for input) */
    interactive?: boolean;

    /** Callback when rating is selected (interactive mode only) */
    onRatingChange?: (rating: ReviewRating) => void;
  }

  /**
   * Star rating display and input component.
   *
   * Displays star ratings with support for:
   * - Full stars for discrete ratings (1-5)
   * - Partial stars for average ratings (0.0-5.0)
   * - Interactive mode for rating selection
   * - Customizable size and appearance
   *
   * Examples:
   * ```tsx
   * // Display only
   * <StarRating rating={4.5} showNumber />
   *
   * // Interactive input
   * <StarRating
   *   rating={currentRating}
   *   interactive
   *   onRatingChange={(rating) => setCurrentRating(rating)}
   * />
   * ```
   */
  export function StarRating({
    rating,
    maxStars = 5,
    size = 16,
    showNumber = false,
    interactive = false,
    onRatingChange,
  }: StarRatingProps) {
    const stars = Array.from({ length: maxStars }, (_, index) => {
      const starValue = index + 1;
      const fillPercentage = Math.min(Math.max(rating - index, 0), 1) * 100;

      return (
        <button
          key={starValue}
          type="button"
          disabled={!interactive}
          onClick={() => {
            if (interactive && onRatingChange) {
              onRatingChange(starValue as ReviewRating);
            }
          }}
          className={`relative inline-block ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          aria-label={`${starValue} star${starValue !== 1 ? "s" : ""}`}
        >
          {/* Background star (empty) */}
          <Star
            size={size}
            className="text-gray-300"
            fill="currentColor"
          />
          {/* Foreground star (filled) - positioned absolutely */}
          <div
            className="absolute top-0 left-0 overflow-hidden"
            style={{ width: `${fillPercentage}%` }}
          >
            <Star
              size={size}
              className="text-yellow-400"
              fill="currentColor"
            />
          </div>
        </button>
      );
    });

    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5">{stars}</div>
        {showNumber && (
          <span className="text-sm text-gray-600 ml-1">
            {rating.toFixed(1)}
          </span>
        )}
      </div>
    );
  }
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 6.2: CREATE src/components/ReviewCard.tsx - Individual review display

- CREATE: New file `src/components/ReviewCard.tsx`
- CONTENT:
  ```typescript
  import { formatDistanceToNow } from "date-fns";
  import { ThumbsUp } from "lucide-react";
  import type { Review } from "@/types/review";
  import { StarRating } from "./StarRating";

  interface ReviewCardProps {
    /** Review data to display */
    review: Review;
  }

  /**
   * Display component for a single product review.
   *
   * Shows:
   * - Reviewer name
   * - Star rating
   * - Review text (if provided)
   * - Time ago
   * - Helpful count
   *
   * Example:
   * ```tsx
   * <ReviewCard review={reviewData} />
   * ```
   */
  export function ReviewCard({ review }: ReviewCardProps) {
    const timeAgo = formatDistanceToNow(new Date(review.review_timestamp_utc), {
      addSuffix: true,
    });

    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        {/* Header: Name and Rating */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold text-gray-900">{review.user_name}</h4>
            <StarRating rating={review.review_rating} size={14} />
          </div>
          <span className="text-sm text-gray-500">{timeAgo}</span>
        </div>

        {/* Review Text */}
        {review.review_text && (
          <p className="text-gray-700 mb-3 leading-relaxed">
            {review.review_text}
          </p>
        )}

        {/* Helpful Count */}
        {review.review_helpful_count > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <ThumbsUp size={14} />
            <span>{review.review_helpful_count} found this helpful</span>
          </div>
        )}
      </div>
    );
  }
  ```
- INSTALL: date-fns library
  ```bash
  cd project_4/app/frontend && bun add date-fns
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 6.3: CREATE src/components/ReviewForm.tsx - Review submission form

- CREATE: New file `src/components/ReviewForm.tsx`
- CONTENT:
  ```typescript
  import { useState } from "react";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { z } from "zod";
  import type { ReviewSubmission, ReviewRating } from "@/types/review";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form";
  import { StarRating } from "./StarRating";
  import { logger } from "@/lib/logger";

  const reviewFormSchema = z.object({
    user_name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or less"),
    review_rating: z
      .number()
      .int()
      .min(1, "Please select a rating")
      .max(5, "Rating must be between 1 and 5"),
    review_text: z
      .string()
      .min(50, "Review must be at least 50 characters")
      .max(1000, "Review must be 1000 characters or less")
      .optional()
      .or(z.literal("")),
  });

  type ReviewFormData = z.infer<typeof reviewFormSchema>;

  interface ReviewFormProps {
    /** Product ID being reviewed */
    productId: number;

    /** Callback when review is submitted successfully */
    onSubmitSuccess: () => void;

    /** Callback when submission fails */
    onSubmitError: (error: Error) => void;

    /** Whether form is currently submitting */
    loading?: boolean;
  }

  /**
   * Form component for submitting product reviews.
   *
   * Features:
   * - Interactive star rating selection
   * - User name input
   * - Optional review text (textarea)
   * - Form validation with Zod
   * - Loading state management
   *
   * Example:
   * ```tsx
   * <ReviewForm
   *   productId={1}
   *   onSubmitSuccess={() => refetchReviews()}
   *   onSubmitError={(err) => showError(err.message)}
   * />
   * ```
   */
  export function ReviewForm({
    productId,
    onSubmitSuccess,
    onSubmitError,
    loading = false,
  }: ReviewFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ReviewFormData>({
      resolver: zodResolver(reviewFormSchema),
      defaultValues: {
        user_name: "",
        review_rating: 0,
        review_text: "",
      },
    });

    const handleSubmit = async (values: ReviewFormData) => {
      logger.info("review_form_submit_started", {
        product_id: productId,
        rating: values.review_rating,
        has_text: !!values.review_text,
      });

      setIsSubmitting(true);

      try {
        const submission: ReviewSubmission = {
          product_id: productId,
          user_name: values.user_name,
          review_rating: values.review_rating as ReviewRating,
          review_text: values.review_text || undefined,
        };

        // Import here to avoid circular dependency
        const { submitProductReview } = await import("@/lib/api-client");
        await submitProductReview(submission);

        logger.info("review_form_submit_success", {
          product_id: productId,
        });

        form.reset();
        onSubmitSuccess();
      } catch (error) {
        logger.error("review_form_submit_error", {
          error_message: error instanceof Error ? error.message : "Unknown error",
          product_id: productId,
          fix_suggestion: "Check form validation and backend availability",
        });
        onSubmitError(error instanceof Error ? error : new Error("Unknown error"));
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 bg-white p-6 rounded-lg border border-gray-200"
        >
          <h3 className="text-lg font-semibold">Write a Review</h3>

          {/* User Name */}
          <FormField
            control={form.control}
            name="user_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your name"
                    {...field}
                    disabled={isSubmitting || loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Rating */}
          <FormField
            control={form.control}
            name="review_rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating</FormLabel>
                <FormControl>
                  <StarRating
                    rating={field.value}
                    interactive
                    size={24}
                    onRatingChange={(rating) => field.onChange(rating)}
                  />
                </FormControl>
                <FormDescription>Click a star to rate (1-5 stars)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Review Text */}
          <FormField
            control={form.control}
            name="review_text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Review (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Share your thoughts about this product (minimum 50 characters if provided)"
                    rows={4}
                    {...field}
                    disabled={isSubmitting || loading}
                  />
                </FormControl>
                <FormDescription>
                  {field.value.length}/1000 characters
                  {field.value.length > 0 &&
                    field.value.length < 50 &&
                    " (minimum 50 if adding text)"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button type="submit" disabled={isSubmitting || loading} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </form>
      </Form>
    );
  }
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 6.4: CREATE src/components/ReviewList.tsx - Reviews list with stats

- CREATE: New file `src/components/ReviewList.tsx`
- CONTENT:
  ```typescript
  import { useEffect, useState } from "react";
  import type { ReviewListResponse } from "@/types/review";
  import { fetchProductReviews } from "@/lib/api-client";
  import { ReviewCard } from "./ReviewCard";
  import { StarRating } from "./StarRating";
  import { logger } from "@/lib/logger";

  interface ReviewListProps {
    /** Product ID to fetch reviews for */
    productId: number;

    /** Refresh trigger - increment to refetch reviews */
    refreshTrigger?: number;
  }

  /**
   * Component that fetches and displays product reviews.
   *
   * Features:
   * - Displays rating statistics (average, count, distribution)
   * - Lists all reviews in cards
   * - Loading and error states
   * - Auto-refetch when refreshTrigger changes
   *
   * Example:
   * ```tsx
   * const [trigger, setTrigger] = useState(0);
   *
   * <ReviewList
   *   productId={1}
   *   refreshTrigger={trigger}
   * />
   *
   * // Refresh after new review
   * setTrigger(prev => prev + 1);
   * ```
   */
  export function ReviewList({ productId, refreshTrigger = 0 }: ReviewListProps) {
    const [data, setData] = useState<ReviewListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const loadReviews = async () => {
        logger.info("review_list_loading", { product_id: productId });
        setLoading(true);
        setError(null);

        try {
          const reviewData = await fetchProductReviews(productId);
          setData(reviewData);
          logger.info("review_list_loaded", {
            product_id: productId,
            total_reviews: reviewData.total_count,
          });
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to load reviews";
          setError(errorMessage);
          logger.error("review_list_error", {
            error_message: errorMessage,
            product_id: productId,
            fix_suggestion: "Check backend availability",
          });
        } finally {
          setLoading(false);
        }
      };

      loadReviews();
    }, [productId, refreshTrigger]);

    // Loading state
    if (loading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Failed to load reviews</p>
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    // Empty state
    if (!data || data.total_count === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-600">
          <p className="font-semibold">No reviews yet</p>
          <p className="text-sm">Be the first to review this product!</p>
        </div>
      );
    }

    // Success state with data
    const { reviews, rating_stats } = data;

    return (
      <div className="space-y-6">
        {/* Rating Statistics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-gray-900">
              {rating_stats.average_rating.toFixed(1)}
            </div>
            <div>
              <StarRating
                rating={rating_stats.average_rating}
                size={20}
              />
              <p className="text-sm text-gray-600 mt-1">
                Based on {rating_stats.total_review_count} review
                {rating_stats.total_review_count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = rating_stats.rating_distribution[stars] || 0;
              const percentage =
                rating_stats.total_review_count > 0
                  ? (count / rating_stats.total_review_count) * 100
                  : 0;

              return (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-12">
                    {stars} star{stars !== 1 ? "s" : ""}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Customer Reviews
          </h3>
          {reviews.map((review) => (
            <ReviewCard key={review.review_id} review={review} />
          ))}
        </div>
      </div>
    );
  }
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 7: Frontend - Integration

#### TASK 7.1: UPDATE src/components/ProductCard.tsx - Add star rating display

- OPEN: Existing `ProductCard.tsx` component (or create if doesn't exist)
- IMPORT: `StarRating` and review API
  ```typescript
  import { StarRating } from "./StarRating";
  import { useEffect, useState } from "react";
  import { fetchProductReviews } from "@/lib/api-client";
  import type { ProductRatingStats } from "@/types/review";
  ```
- ADD: Rating stats state in component
  ```typescript
  const [ratingStats, setRatingStats] = useState<ProductRatingStats | null>(null);

  useEffect(() => {
    // Fetch rating stats for this product
    fetchProductReviews(product.product_id)
      .then((data) => setRatingStats(data.rating_stats))
      .catch(() => setRatingStats(null));
  }, [product.product_id]);
  ```
- ADD: Rating display in card JSX (below product name)
  ```tsx
  {ratingStats && ratingStats.total_review_count > 0 && (
    <div className="flex items-center gap-2 mt-1">
      <StarRating rating={ratingStats.average_rating} size={14} />
      <span className="text-sm text-gray-600">
        ({ratingStats.total_review_count})
      </span>
    </div>
  )}
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 7.2: CREATE src/pages/ProductDetailPage.tsx - Product detail page with reviews

- CREATE: New file `src/pages/ProductDetailPage.tsx` (or similar structure)
- CONTENT:
  ```typescript
  import { useState } from "react";
  import { useParams } from "react-router-dom";
  import { ReviewList } from "@/components/ReviewList";
  import { ReviewForm } from "@/components/ReviewForm";
  import { StarRating } from "@/components/StarRating";
  import { Button } from "@/components/ui/button";
  import { logger } from "@/lib/logger";

  /**
   * Product detail page with reviews section.
   *
   * Shows:
   * - Product details (name, description, price)
   * - Star rating and review count
   * - Review submission form
   * - List of existing reviews
   *
   * NOTE: This is a simplified example. Integrate with your existing
   * product detail page or routing structure as needed.
   */
  export function ProductDetailPage() {
    const { productId } = useParams<{ productId: string }>();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const productIdNum = Number(productId);

    if (!productId || Number.isNaN(productIdNum)) {
      return <div>Invalid product ID</div>;
    }

    const handleSubmitSuccess = () => {
      logger.info("review_submitted", { product_id: productIdNum });
      setShowReviewForm(false);
      setSubmitError(null);
      // Trigger refresh of review list
      setRefreshTrigger((prev) => prev + 1);
    };

    const handleSubmitError = (error: Error) => {
      setSubmitError(error.message);
    };

    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Product Info Section - Replace with your actual product data */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900">Product Name</h1>
          <p className="text-gray-600 mt-2">Product description goes here...</p>
          <p className="text-2xl font-bold text-gray-900 mt-4">$29.99</p>
        </div>

        {/* Reviews Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Ratings & Reviews
            </h2>
            <Button
              onClick={() => setShowReviewForm(!showReviewForm)}
              variant={showReviewForm ? "outline" : "default"}
            >
              {showReviewForm ? "Cancel" : "Write a Review"}
            </Button>
          </div>

          {/* Review Form (conditional) */}
          {showReviewForm && (
            <div>
              <ReviewForm
                productId={productIdNum}
                onSubmitSuccess={handleSubmitSuccess}
                onSubmitError={handleSubmitError}
              />
              {submitError && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
                  {submitError}
                </div>
              )}
            </div>
          )}

          {/* Review List */}
          <ReviewList productId={productIdNum} refreshTrigger={refreshTrigger} />
        </div>
      </div>
    );
  }
  ```
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

#### TASK 7.3: VERIFY Frontend - Run linting and type checking

- RUN: `cd project_4/app/frontend && bun run check:fix`
- EXPECTED: No TypeScript errors, no Biome lint errors
- **VALIDATE**: `cd project_4/app/frontend && bun run check:fix`

---

### Phase 8: Integration Testing

#### TASK 8.1: Manual Integration Test - Backend API

- START: Backend server
  ```bash
  cd project_4/app/backend && uv run python run_api.py
  ```
- TEST: Review endpoints with curl
  ```bash
  # Get reviews for product 1
  curl http://localhost:8000/api/reviews/1 | jq

  # Submit a new review
  curl -X POST http://localhost:8000/api/reviews \
    -H "Content-Type: application/json" \
    -d '{
      "product_id": 1,
      "user_name": "Test User",
      "review_rating": 5,
      "review_text": "This is an excellent product with great quality and fast shipping!"
    }' | jq

  # Verify review was added
  curl http://localhost:8000/api/reviews/1 | jq '.total_count'

  # Test duplicate review (should fail with 409)
  curl -X POST http://localhost:8000/api/reviews \
    -H "Content-Type: application/json" \
    -d '{
      "product_id": 1,
      "user_name": "Test User",
      "review_rating": 4,
      "review_text": "Trying to submit another review for the same product."
    }' | jq
  ```
- **VALIDATE**: All curl commands return expected responses

#### TASK 8.2: Manual Integration Test - Frontend UI

- START: Both servers
  ```bash
  # Terminal 1: Backend
  cd project_4/app/backend && uv run python run_api.py

  # Terminal 2: Frontend
  cd project_4/app/frontend && bun dev
  ```
- TEST SCENARIOS:
  1. **Product Grid**: Verify star ratings appear on product cards
  2. **Product Detail**: Navigate to product detail page
  3. **View Reviews**: See existing reviews and rating statistics
  4. **Rating Distribution**: Verify bar chart displays correctly
  5. **Submit Review**: Click "Write a Review" button
  6. **Form Validation**: Try submitting with invalid data (short text, no rating)
  7. **Successful Submit**: Submit valid review, verify it appears in list
  8. **Duplicate Prevention**: Try submitting same user+product, see error
  9. **Rating Update**: Verify average rating updates after new review
  10. **Review Text Optional**: Submit review with only rating (no text)
- **VALIDATE**: Manual verification in browser at http://localhost:3000

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
uv run pytest tests/test_reviews.py -v

# Expected: All review tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Terminal 1: Start backend
cd project_4/app/backend
uv run python run_api.py

# Terminal 2: Test API endpoints
curl http://localhost:8000/api/reviews/1 | jq '.total_count'
# Expected: Number of reviews for product 1

curl -X POST http://localhost:8000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"product_id": 2, "user_name": "Integration Test", "review_rating": 5, "review_text": "Testing the review submission endpoint with a valid review text."}' \
  | jq '.review_id'
# Expected: New review ID

# Terminal 3: Start frontend and test UI
cd project_4/app/frontend
bun dev
# Open http://localhost:3000 and test review features
```

---

## COMPLETION CHECKLIST

### Backend
- [ ] Review models created in app/models/review.py
- [ ] Review seed data created in app/data/seed_reviews.py
- [ ] Review service layer implemented in app/services/review_service.py
- [ ] Review API endpoints created in app/api/reviews.py
- [ ] Reviews router registered in app/main.py
- [ ] Review tests created and passing in tests/test_reviews.py
- [ ] Backend linting passes (ruff check)

### Frontend
- [ ] Review types created in src/types/review.ts
- [ ] API client functions added to src/lib/api-client.ts
- [ ] StarRating component created in src/components/StarRating.tsx
- [ ] ReviewCard component created in src/components/ReviewCard.tsx
- [ ] ReviewForm component created in src/components/ReviewForm.tsx
- [ ] ReviewList component created in src/components/ReviewList.tsx
- [ ] ProductCard updated with star rating display
- [ ] ProductDetailPage created with review integration
- [ ] Frontend linting passes (biome check)

### Integration
- [ ] Backend API manually tested with curl
- [ ] Frontend UI manually tested in browser
- [ ] All acceptance criteria met
- [ ] Rating display works on product cards
- [ ] Detail page shows reviews and allows submission
- [ ] Form validation prevents invalid submissions
- [ ] Duplicate review prevention works

---

## Notes

### Key Implementation Decisions

1. **Rating Type**: Use Literal[1, 2, 3, 4, 5] for discrete star ratings, ensure type safety

2. **Review Text Optional**: Allow reviews with just ratings (no text), but enforce 50-1000 chars when text is provided

3. **Duplicate Prevention**: Check user_name + product_id combination (case-insensitive) to prevent multiple reviews from same user

4. **Rating Distribution**: Store counts for each star level (1-5) for UI bar chart display

5. **Timestamp Handling**: Backend uses datetime.utcnow(), frontend receives ISO 8601 string, use date-fns for "time ago" display

6. **Helpful Count**: Include field for future "Was this helpful?" voting feature (not implemented in v1)

7. **In-Memory Database**: Reviews stored in memory (_REVIEWS_DATABASE list) matching products pattern

8. **Refresh Pattern**: Use refreshTrigger prop to re-fetch reviews after submission

9. **Star Rating Component**: Support both display mode (average ratings with decimals) and interactive mode (discrete 1-5 selection)

10. **Error Handling**: Return 409 Conflict for duplicate reviews, 400 for validation errors, proper structured logging throughout

### Future Enhancements (Out of Scope)

- Review editing/deletion
- "Helpful" voting system
- Image uploads with reviews
- Review moderation/flagging
- Verified purchase badges
- Review replies from sellers
- Sort/filter reviews (most helpful, highest/lowest rating)
- Pagination for large review lists
