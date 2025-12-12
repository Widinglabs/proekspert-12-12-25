/**
 * Review types matching backend Pydantic models EXACTLY.
 *
 * Backend definitions (app/models/review.py):
 * - ReviewRating = Literal[1, 2, 3, 4, 5]
 * - Review model with strict field types
 * - ProductRatingStats for aggregated statistics
 * - ReviewListResponse wrapper
 * - ReviewSubmission for POST requests
 *
 * IMPORTANT: These types must stay in sync with backend models.
 * Any changes to backend models require updating these types.
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

  /** Optional written review text (50-1000 characters when provided, null if not provided) */
  review_text: string | null;

  /** Review submission timestamp (ISO 8601 UTC string from backend datetime) */
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

  /** Average rating (0.0-5.0, 0.0 when no reviews) */
  average_rating: number;

  /** Total number of reviews */
  total_review_count: number;

  /** Count of reviews per star level (keys: "1", "2", "3", "4", "5") */
  rating_distribution: Record<string, number>;
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
