"""
Review API endpoints.

This module defines all HTTP endpoints related to product review operations.
Each endpoint delegates business logic to the service layer.
"""

from fastapi import APIRouter, HTTPException, Path, status
from fastapi.responses import JSONResponse

from app.core.logging_config import StructuredLogger
from app.models.error import ErrorResponse
from app.models.review import Review, ReviewListResponse, ReviewSubmission
from app.services import review_service

# Initialize router for review endpoints
router = APIRouter(prefix="/reviews", tags=["reviews"])

# Initialize structured logger
logger = StructuredLogger(__name__)


@router.get(
    "/{product_id}",
    response_model=ReviewListResponse,
    responses={400: {"model": ErrorResponse}},
    summary="Get product reviews",
    description="Fetch all reviews for a specific product with rating statistics",
)
async def get_product_reviews(
    product_id: int = Path(..., gt=0, description="ID of the product to fetch reviews for"),
) -> ReviewListResponse | JSONResponse:
    """
    Retrieve all reviews for a product.

    This endpoint returns all reviews for the specified product, sorted by
    most recent first, along with aggregated rating statistics.

    Args:
        product_id: ID of the product (must be positive integer)

    Returns:
        ReviewListResponse containing reviews, total count, and rating stats

    Raises:
        HTTPException: 400 if product_id is invalid

    Example Response:
        {
            "reviews": [
                {
                    "review_id": 1,
                    "product_id": 1,
                    "user_name": "Alice Johnson",
                    "review_rating": 5,
                    "review_text": "Amazing product!",
                    "review_timestamp_utc": "2024-01-15T10:30:00",
                    "review_helpful_count": 8
                },
                ...
            ],
            "total_count": 5,
            "rating_stats": {
                "product_id": 1,
                "average_rating": 4.2,
                "total_review_count": 5,
                "rating_distribution": {"1": 0, "2": 0, "3": 1, "4": 2, "5": 2}
            }
        }
    """
    logger.info(
        "api_request_received",
        endpoint=f"/api/reviews/{product_id}",
        http_method="GET",
        product_id=product_id,
        operation="get_product_reviews",
    )

    # Validate product_id (Path validator handles > 0 check)
    if product_id <= 0:
        logger.error(
            "validation_failed",
            error_type="invalid_product_id",
            product_id=product_id,
            fix_suggestion="product_id must be a positive integer",
        )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                error_code="invalid_product_id",
                error_message="product_id must be a positive integer",
                error_details={"product_id": product_id},
            ).model_dump(),
        )

    # Fetch reviews and stats from service layer
    reviews = review_service.get_reviews_for_product(product_id)
    rating_stats = review_service.calculate_rating_stats(product_id)

    logger.info(
        "api_response_prepared",
        endpoint=f"/api/reviews/{product_id}",
        product_id=product_id,
        total_reviews=len(reviews),
        average_rating=rating_stats.average_rating,
        operation="get_product_reviews",
    )

    return ReviewListResponse(
        reviews=reviews,
        total_count=len(reviews),
        rating_stats=rating_stats,
    )


@router.post(
    "",
    response_model=Review,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
    summary="Submit product review",
    description="Submit a new review for a product with rating and optional text",
)
async def submit_product_review(
    submission: ReviewSubmission,
) -> Review | JSONResponse:
    """
    Submit a new product review.

    Creates a new review for the specified product. Each user can only
    submit one review per product (checked by user_name, case-insensitive).

    Args:
        submission: ReviewSubmission with product_id, user_name, rating, and optional text

    Returns:
        Created Review object

    Raises:
        HTTPException: 409 Conflict if user already reviewed this product

    Example Request Body:
        {
            "product_id": 1,
            "user_name": "Jane Smith",
            "review_rating": 5,
            "review_text": "Excellent product! Highly recommended for anyone."
        }

    Example Response:
        {
            "review_id": 19,
            "product_id": 1,
            "user_name": "Jane Smith",
            "review_rating": 5,
            "review_text": "Excellent product! Highly recommended for anyone.",
            "review_timestamp_utc": "2024-01-20T15:45:00",
            "review_helpful_count": 0
        }
    """
    logger.info(
        "api_request_received",
        endpoint="/api/reviews",
        http_method="POST",
        product_id=submission.product_id,
        user_name=submission.user_name,
        rating=submission.review_rating,
        has_text=submission.review_text is not None,
        operation="submit_product_review",
    )

    try:
        new_review = review_service.submit_review(submission)

        logger.info(
            "api_response_prepared",
            endpoint="/api/reviews",
            review_id=new_review.review_id,
            product_id=submission.product_id,
            operation="submit_product_review",
        )

        return new_review

    except ValueError as error:
        # Duplicate review error
        logger.error(
            "duplicate_review_error",
            product_id=submission.product_id,
            user_name=submission.user_name,
            error_message=str(error),
            fix_suggestion="Check if user already reviewed this product before submitting",
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
