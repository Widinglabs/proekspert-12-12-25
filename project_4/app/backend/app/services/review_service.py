"""
Review service containing business logic for product review operations.

This service layer separates business logic from API routing logic,
making the code more testable and maintainable.
"""

from datetime import UTC, datetime

from app.core.logging_config import StructuredLogger
from app.data.seed_reviews import _REVIEWS_DATABASE
from app.models.review import ProductRatingStats, Review, ReviewSubmission

# Initialize structured logger for this module
logger = StructuredLogger(__name__)


def get_reviews_for_product(product_id: int) -> list[Review]:
    """
    Fetch all reviews for a specific product, sorted by most recent first.

    This function returns all reviews associated with the given product ID,
    sorted by timestamp in descending order (newest first).

    Args:
        product_id: ID of the product to fetch reviews for

    Returns:
        List of Review objects for the product, sorted by timestamp descending

    Example:
        >>> reviews = get_reviews_for_product(product_id=1)
        >>> len(reviews) >= 0
        True
        >>> all(r.product_id == 1 for r in reviews)
        True
    """
    logger.info(
        "fetching_product_reviews",
        product_id=product_id,
        operation="get_reviews_for_product",
    )

    # Filter reviews for the specific product
    product_reviews = [review for review in _REVIEWS_DATABASE if review.product_id == product_id]

    # Sort by timestamp descending (most recent first)
    product_reviews.sort(key=lambda r: r.review_timestamp_utc, reverse=True)

    logger.info(
        "product_reviews_fetched",
        product_id=product_id,
        total_reviews=len(product_reviews),
        operation="get_reviews_for_product",
    )

    return product_reviews


def calculate_rating_stats(product_id: int) -> ProductRatingStats:
    """
    Calculate aggregated rating statistics for a product.

    Computes the average rating, total review count, and distribution
    of ratings across all star levels (1-5).

    Args:
        product_id: ID of the product

    Returns:
        ProductRatingStats with average rating and distribution

    Example:
        >>> stats = calculate_rating_stats(product_id=1)
        >>> 0 <= stats.average_rating <= 5
        True
        >>> stats.total_review_count >= 0
        True
    """
    logger.info(
        "calculating_rating_stats",
        product_id=product_id,
        operation="calculate_rating_stats",
    )

    reviews = get_reviews_for_product(product_id)

    # Return empty stats if no reviews
    if not reviews:
        return ProductRatingStats(
            product_id=product_id,
            average_rating=0.0,
            total_review_count=0,
            rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
        )

    # Calculate rating distribution
    rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    total_rating_sum = 0

    for review in reviews:
        rating_distribution[review.review_rating] += 1
        total_rating_sum += review.review_rating

    # Calculate average (rounded to 1 decimal place)
    average_rating = round(total_rating_sum / len(reviews), 1)

    logger.info(
        "rating_stats_calculated",
        product_id=product_id,
        average_rating=average_rating,
        total_reviews=len(reviews),
        operation="calculate_rating_stats",
    )

    return ProductRatingStats(
        product_id=product_id,
        average_rating=average_rating,
        total_review_count=len(reviews),
        rating_distribution=rating_distribution,
    )


def submit_review(submission: ReviewSubmission) -> Review:
    """
    Submit a new product review.

    Creates a new review from the submission data and adds it to the database.
    Checks for duplicate reviews (same user + product) and raises an error if found.

    Args:
        submission: ReviewSubmission data containing product_id, user_name, rating, text

    Returns:
        Created Review object

    Raises:
        ValueError: If user has already reviewed this product

    Example:
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
        rating=submission.review_rating,
        has_text=submission.review_text is not None,
        operation="submit_review",
    )

    # Check for duplicate review (same user + product, case-insensitive)
    existing_reviews = [
        review
        for review in _REVIEWS_DATABASE
        if review.product_id == submission.product_id and review.user_name.lower() == submission.user_name.lower()
    ]

    if existing_reviews:
        logger.error(
            "duplicate_review_detected",
            product_id=submission.product_id,
            user_name=submission.user_name,
            existing_review_id=existing_reviews[0].review_id,
            fix_suggestion="User has already reviewed this product. Each user can only submit one review per product.",
        )
        raise ValueError(f"User '{submission.user_name}' has already reviewed product {submission.product_id}")

    # Generate new review ID
    max_existing_id = max((review.review_id for review in _REVIEWS_DATABASE), default=0)
    new_review_id = max_existing_id + 1

    # Create the new review
    new_review = Review(
        review_id=new_review_id,
        product_id=submission.product_id,
        user_name=submission.user_name,
        review_rating=submission.review_rating,
        review_text=submission.review_text,
        review_timestamp_utc=datetime.now(UTC),
        review_helpful_count=0,
    )

    # Add to database
    _REVIEWS_DATABASE.append(new_review)

    logger.info(
        "review_submitted_successfully",
        review_id=new_review.review_id,
        product_id=submission.product_id,
        user_name=submission.user_name,
        operation="submit_review",
    )

    return new_review
