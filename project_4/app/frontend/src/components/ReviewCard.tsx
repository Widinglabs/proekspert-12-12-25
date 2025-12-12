/**
 * ReviewCard component for displaying a single product review.
 *
 * Backend model (app/models/review.py):
 * ```python
 * class Review(BaseModel):
 *     review_id: int
 *     product_id: int
 *     user_name: str
 *     review_rating: ReviewRating
 *     review_text: str | None
 *     review_timestamp_utc: datetime
 *     review_helpful_count: int
 * ```
 *
 * Features:
 * - Displays reviewer name and rating
 * - Shows review text if provided
 * - Shows relative time (e.g., "3 days ago")
 * - Shows helpful count badge
 */

import { formatDistanceToNow } from "date-fns";
import { ThumbsUp } from "lucide-react";
import type { Review } from "@/types/review";
import { StarRating } from "./StarRating";

interface ReviewCardProps {
  /** Review data to display (matches backend Review model) */
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
  // Format timestamp as relative time (e.g., "3 days ago")
  const timeAgo = formatDistanceToNow(new Date(review.review_timestamp_utc), {
    addSuffix: true,
  });

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      {/* Header: Name, Rating, and Time */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-900">{review.user_name}</h4>
          <StarRating rating={review.review_rating} size={14} />
        </div>
        <span className="text-sm text-gray-500">{timeAgo}</span>
      </div>

      {/* Review Text (if provided) */}
      {review.review_text && <p className="text-gray-700 mb-3 leading-relaxed">{review.review_text}</p>}

      {/* Helpful Count (if any) */}
      {review.review_helpful_count > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <ThumbsUp size={14} />
          <span>
            {review.review_helpful_count} {review.review_helpful_count === 1 ? "person" : "people"} found this helpful
          </span>
        </div>
      )}
    </div>
  );
}
