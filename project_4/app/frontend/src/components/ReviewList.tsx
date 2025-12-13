/**
 * ReviewList component that fetches and displays product reviews.
 *
 * Backend endpoint: GET /api/reviews/{product_id}
 * Response model: ReviewListResponse
 *
 * Features:
 * - Displays rating statistics (average, count, distribution)
 * - Lists all reviews in cards
 * - Loading and error states
 * - Auto-refetch when refreshTrigger changes
 * - Rating distribution bar chart
 */

import { useEffect, useState } from "react";
import { fetchProductReviews } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import type { ReviewListResponse } from "@/types/review";
import { ReviewCard } from "./ReviewCard";
import { StarRating } from "./StarRating";

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
      logger.info("review_list_loading", {
        product_id: productId,
        operation: "loadReviews",
      });

      setLoading(true);
      setError(null);

      try {
        const reviewData = await fetchProductReviews(productId);
        setData(reviewData);
        logger.info("review_list_loaded", {
          product_id: productId,
          total_reviews: reviewData.total_count,
          operation: "loadReviews",
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load reviews";
        setError(errorMessage);
        logger.error("review_list_error", {
          error_message: errorMessage,
          product_id: productId,
          fix_suggestion: "Check backend availability",
          operation: "loadReviews",
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
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
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
          <div className="text-4xl font-bold text-gray-900">{rating_stats.average_rating.toFixed(1)}</div>
          <div>
            <StarRating rating={rating_stats.average_rating} size={20} />
            <p className="text-sm text-gray-600 mt-1">
              Based on {rating_stats.total_review_count} review{rating_stats.total_review_count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Rating Distribution Bar Chart */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = rating_stats.rating_distribution[String(stars)] || 0;
            const percentage =
              rating_stats.total_review_count > 0 ? (count / rating_stats.total_review_count) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-12">
                  {stars} star{stars !== 1 ? "s" : ""}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Customer Reviews</h3>
        {reviews.map((review) => (
          <ReviewCard key={review.review_id} review={review} />
        ))}
      </div>
    </div>
  );
}
