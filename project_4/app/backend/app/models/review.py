"""Review data models for the product catalog API."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Define valid review ratings as a type alias for reusability
ReviewRating = Literal[1, 2, 3, 4, 5]


class Review(BaseModel):
    """
    Represents a product review with rating and optional text.

    This model uses verbose, intention-revealing names to make it easy for AI
    and humans to understand. All fields use the `review_` prefix for clarity.

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

    review_id: int = Field(..., gt=0, description="Unique review identifier", examples=[1, 42, 100])

    product_id: int = Field(..., gt=0, description="Product being reviewed", examples=[1, 5, 10])

    user_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the reviewer",
        examples=["John Doe", "Jane Smith", "Alex Johnson"],
    )

    review_rating: ReviewRating = Field(
        ...,
        description="Star rating (1-5)",
        examples=[1, 3, 5],
    )

    review_text: str | None = Field(
        default=None,
        min_length=50,
        max_length=1000,
        description="Optional written review text (50-1000 chars when provided)",
        examples=["Excellent product, exactly as described! Very happy with my purchase."],
    )

    review_timestamp_utc: datetime = Field(
        ...,
        description="Review submission timestamp (UTC)",
    )

    review_helpful_count: int = Field(
        default=0,
        ge=0,
        description="Number of users who found this review helpful",
        examples=[0, 5, 12],
    )


class ProductRatingStats(BaseModel):
    """
    Aggregated rating statistics for a product.

    Used to display average rating, total count, and distribution of ratings.

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

    average_rating: float = Field(
        ...,
        ge=0,
        le=5,
        description="Average rating (0.0-5.0, 0.0 when no reviews)",
        examples=[0.0, 3.5, 4.8],
    )

    total_review_count: int = Field(
        ...,
        ge=0,
        description="Total number of reviews",
        examples=[0, 10, 50],
    )

    rating_distribution: dict[int, int] = Field(
        ...,
        description="Count of reviews per star level (1-5)",
        examples=[{1: 0, 2: 1, 3: 2, 4: 3, 5: 4}],
    )


class ReviewListResponse(BaseModel):
    """
    Response model for endpoints returning lists of reviews.

    Using a wrapper object (instead of returning a raw list) makes the API
    more extensible - we can easily add metadata and statistics.

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

    rating_stats: ProductRatingStats = Field(..., description="Rating statistics for the product")


class ReviewSubmission(BaseModel):
    """
    Request model for submitting a new review.

    Used as the request body for POST /api/reviews endpoint.

    Attributes:
        product_id: ID of product to review
        user_name: Name of reviewer
        review_rating: Star rating (1-5)
        review_text: Optional written review (50-1000 chars when provided)

    Examples:
        >>> ReviewSubmission(
        ...     product_id=1,
        ...     user_name="Jane Smith",
        ...     review_rating=4,
        ...     review_text="Good product, fast shipping. Would buy again!"
        ... )
    """

    product_id: int = Field(..., gt=0, description="Product ID to review", examples=[1, 5, 10])

    user_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Reviewer name",
        examples=["Jane Smith", "John Doe"],
    )

    review_rating: ReviewRating = Field(
        ...,
        description="Star rating (1-5)",
        examples=[1, 3, 5],
    )

    review_text: str | None = Field(
        default=None,
        min_length=50,
        max_length=1000,
        description="Optional review text (50-1000 chars when provided)",
        examples=["Good product, fast shipping. Would definitely recommend to others!"],
    )
