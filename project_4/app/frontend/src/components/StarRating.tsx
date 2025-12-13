/**
 * StarRating component for displaying and selecting star ratings.
 *
 * Features:
 * - Display mode: Shows filled/partial stars for average ratings
 * - Interactive mode: Allows clicking stars to select rating
 * - Customizable size and appearance
 * - Accessible with proper ARIA labels
 *
 * Backend connection:
 * - Works with ReviewRating type (1-5 integers)
 * - Used in ProductCard, ReviewCard, ReviewForm components
 */

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
 * // Display only with average rating
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
    // Calculate fill percentage for this star (0-100%)
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
        className={`relative inline-block ${
          interactive
            ? "cursor-pointer hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 rounded"
            : "cursor-default"
        }`}
        aria-label={
          interactive ? `Rate ${starValue} star${starValue !== 1 ? "s" : ""}` : `${starValue} of ${maxStars} stars`
        }
      >
        {/* Background star (empty) */}
        <Star size={size} className="text-gray-300" fill="currentColor" strokeWidth={0} />
        {/* Foreground star (filled) - positioned absolutely with clipping */}
        <div className="absolute top-0 left-0 overflow-hidden" style={{ width: `${fillPercentage}%` }}>
          <Star size={size} className="text-yellow-400" fill="currentColor" strokeWidth={0} />
        </div>
      </button>
    );
  });

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`${rating.toFixed(1)} out of ${maxStars} stars`}
      >
        {stars}
      </div>
      {showNumber && <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>}
    </div>
  );
}
