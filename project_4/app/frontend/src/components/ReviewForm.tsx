/**
 * ReviewForm component for submitting product reviews.
 *
 * Backend endpoint: POST /api/reviews
 * Request model: ReviewSubmission
 *
 * Features:
 * - Interactive star rating selection
 * - User name input with validation
 * - Optional review text (50-1000 chars when provided)
 * - Form validation with Zod
 * - Loading state and error handling
 * - Submit success callback for refreshing review list
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitProductReview } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import type { ReviewRating, ReviewSubmission } from "@/types/review";
import { StarRating } from "./StarRating";

/**
 * Zod schema for review form validation.
 *
 * Rules:
 * - user_name: Required, 1-100 characters
 * - review_rating: Required, integer 1-5
 * - review_text: Optional, but 50-1000 chars when provided
 */
const reviewFormSchema = z.object({
  user_name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  review_rating: z.number().int().min(1, "Please select a rating").max(5, "Rating must be between 1 and 5"),
  review_text: z
    .string()
    .max(1000, "Review must be 1000 characters or less")
    .optional()
    .transform((val) => (val === "" ? undefined : val))
    .refine((val) => val === undefined || val.length >= 50, {
      message: "Review must be at least 50 characters when provided",
    }),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

interface ReviewFormProps {
  /** Product ID being reviewed */
  productId: number;

  /** Callback when review is submitted successfully */
  onSubmitSuccess: () => void;

  /** Callback when submission fails */
  onSubmitError: (error: Error) => void;

  /** Whether form is currently in loading state */
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
export function ReviewForm({ productId, onSubmitSuccess, onSubmitError, loading = false }: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      user_name: "",
      review_rating: 0,
      review_text: "",
    },
  });

  const reviewText = form.watch("review_text") || "";

  const handleSubmit = async (values: ReviewFormData) => {
    logger.info("review_form_submit_started", {
      product_id: productId,
      rating: values.review_rating,
      has_text: !!values.review_text,
      operation: "handleSubmit",
    });

    setIsSubmitting(true);

    try {
      const submission: ReviewSubmission = {
        product_id: productId,
        user_name: values.user_name,
        review_rating: values.review_rating as ReviewRating,
        review_text: values.review_text,
      };

      await submitProductReview(submission);

      logger.info("review_form_submit_success", {
        product_id: productId,
        operation: "handleSubmit",
      });

      form.reset();
      onSubmitSuccess();
    } catch (error) {
      logger.error("review_form_submit_error", {
        error_message: error instanceof Error ? error.message : "Unknown error",
        product_id: productId,
        fix_suggestion: "Check form validation and backend availability",
        operation: "handleSubmit",
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
        <h3 className="text-lg font-semibold text-gray-900">Write a Review</h3>

        {/* User Name */}
        <FormField
          control={form.control}
          name="user_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} disabled={isSubmitting || loading} />
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
                  size={28}
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
                {reviewText.length}/1000 characters
                {reviewText.length > 0 && reviewText.length < 50 && " (minimum 50 if adding text)"}
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
