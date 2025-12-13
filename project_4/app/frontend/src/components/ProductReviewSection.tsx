/**
 * ProductReviewSection - Complete reviews section for a product.
 *
 * Combines ReviewList and ReviewForm into a cohesive section that can be
 * used in product detail pages, modals, or any other context.
 *
 * Features:
 * - Toggle for showing/hiding review form
 * - Auto-refresh review list after submission
 * - Error handling for submission failures
 * - Success toast/message on submission
 *
 * Backend integration:
 * - GET /api/reviews/{product_id} via ReviewList
 * - POST /api/reviews via ReviewForm
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { ReviewForm } from "./ReviewForm";
import { ReviewList } from "./ReviewList";

interface ProductReviewSectionProps {
  /** Product ID to show reviews for */
  productId: number;

  /** Optional product name to show in header */
  productName?: string;
}

/**
 * Complete reviews section for a product.
 *
 * Shows:
 * - Reviews list with rating statistics
 * - "Write a Review" toggle button
 * - Review submission form (when toggled)
 * - Success/error messages
 *
 * Example:
 * ```tsx
 * <ProductReviewSection
 *   productId={1}
 *   productName="Wireless Bluetooth Mouse"
 * />
 * ```
 */
export function ProductReviewSection({ productId, productName }: ProductReviewSectionProps) {
  // Form visibility state
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Refresh trigger for ReviewList
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Error/success message state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  /**
   * Handle successful review submission.
   * Hides form, shows success message, and triggers review list refresh.
   */
  const handleSubmitSuccess = () => {
    logger.info("review_section_submit_success", {
      product_id: productId,
      operation: "handleSubmitSuccess",
    });

    setShowReviewForm(false);
    setSubmitError(null);
    setSubmitSuccess(true);

    // Trigger review list refresh
    setRefreshTrigger((prev) => prev + 1);

    // Clear success message after 5 seconds
    setTimeout(() => setSubmitSuccess(false), 5000);
  };

  /**
   * Handle review submission error.
   * Shows error message to user.
   */
  const handleSubmitError = (error: Error) => {
    logger.error("review_section_submit_error", {
      product_id: productId,
      error_message: error.message,
      operation: "handleSubmitError",
    });

    setSubmitError(error.message);
    setSubmitSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ratings & Reviews</h2>
          {productName && <p className="text-sm text-gray-600 mt-1">for {productName}</p>}
        </div>
        <Button
          onClick={() => {
            setShowReviewForm(!showReviewForm);
            setSubmitError(null);
          }}
          variant={showReviewForm ? "outline" : "default"}
        >
          {showReviewForm ? "Cancel" : "Write a Review"}
        </Button>
      </div>

      {/* Success Message */}
      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          <p className="font-semibold">Thank you for your review!</p>
          <p className="text-sm">Your review has been submitted successfully.</p>
        </div>
      )}

      {/* Review Form (conditional) */}
      {showReviewForm && (
        <div>
          <ReviewForm productId={productId} onSubmitSuccess={handleSubmitSuccess} onSubmitError={handleSubmitError} />
          {submitError && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">{submitError}</div>
          )}
        </div>
      )}

      {/* Review List */}
      <ReviewList productId={productId} refreshTrigger={refreshTrigger} />
    </div>
  );
}
