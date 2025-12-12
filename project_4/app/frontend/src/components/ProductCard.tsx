/**
 * ProductCard component for displaying a single product.
 *
 * Uses shadcn Card component for consistent styling and layout.
 * Displays all product information with proper formatting and badges.
 *
 * Backend model (app/models/product.py):
 * ```python
 * class Product(BaseModel):
 *     product_id: int
 *     product_name: str
 *     product_description: str
 *     product_price_usd: Decimal
 *     product_category: ProductCategory
 *     product_stock_quantity: int
 * ```
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { trackProductView } from "@/lib/recently-viewed-storage";
import { fetchProductReviews } from "@/lib/api-client";
import type { Product } from "@/types/product";
import type { ProductRatingStats } from "@/types/review";
import { StarRating } from "./StarRating";

interface ProductCardProps {
  /** Product object to display (matches backend Product model) */
  product: Product;
  /** Whether this product is favorited */
  isFavorited: boolean;
  /** Callback when favorite button is clicked */
  onToggleFavorite: (productId: number) => void;
}

/**
 * Display a single product in a card layout.
 *
 * Features:
 * - Product name and description
 * - Formatted price in USD
 * - Category badge with color coding
 * - Stock status indicator with quantity-based alerts
 * - Heart icon to toggle favorite status
 * - Click tracking for recently viewed
 * - Link to product detail page
 * - Average rating display (if reviews exist)
 * - Responsive layout
 *
 * @param product - Product data from API
 * @param isFavorited - Whether product is in favorites
 * @param onToggleFavorite - Callback to toggle favorite status
 */
export function ProductCard({ product, isFavorited, onToggleFavorite }: ProductCardProps) {
  // State for rating statistics
  const [ratingStats, setRatingStats] = useState<ProductRatingStats | null>(null);

  // Fetch rating stats for this product on mount
  useEffect(() => {
    fetchProductReviews(product.product_id)
      .then((data) => setRatingStats(data.rating_stats))
      .catch(() => setRatingStats(null));
  }, [product.product_id]);

  /**
   * Handle product card click to track view in localStorage.
   */
  const handleProductClick = () => {
    logger.info("product_card_clicked", {
      product_id: product.product_id,
      product_name: product.product_name,
      component: "ProductCard",
    });
    trackProductView(product.product_id);
  };

  // Format price as USD currency
  // Backend sends Decimal as string, parse to number for formatting
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(product.product_price_usd));

  // Category badge color mapping
  // Each category gets a distinct color for visual distinction
  const categoryColors: Record<string, string> = {
    electronics: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    clothing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    home: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    sports: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    books: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  const categoryColor = categoryColors[product.product_category] || "bg-gray-100 text-gray-800";

  /**
   * Handle favorite button click.
   * Prevents event propagation and logs the operation.
   */
  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.preventDefault(); // Prevent Link navigation when clicking favorite button
    onToggleFavorite(product.product_id);
    logger.info(isFavorited ? "favorite_removed" : "favorite_added", {
      product_id: product.product_id,
      product_name: product.product_name,
      operation: "toggle_favorite_from_card",
    });
  };

  return (
    <Link
      to={`/products/${product.product_id}`}
      className="block h-full"
      onClick={handleProductClick}
    >
      <Card className="h-full flex flex-col transition-shadow hover:shadow-lg cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-2">{product.product_name}</CardTitle>
              {/* Star rating display (if reviews exist) */}
              {ratingStats && ratingStats.total_review_count > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={ratingStats.average_rating} size={14} />
                  <span className="text-sm text-gray-600">({ratingStats.total_review_count})</span>
                </div>
              )}
              <span
                className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap ${categoryColor}`}
              >
                {product.product_category}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={handleFavoriteClick}
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorited ? (
                // Filled heart for favorited
                <svg className="w-5 h-5 fill-red-500 text-red-500" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              ) : (
                // Outline heart for not favorited
                <svg
                  className="w-5 h-5 text-gray-400 hover:text-red-500 transition-colors"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Product description with line clamping */}
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{product.product_description}</p>

          {/* Price and stock status - pushed to bottom */}
          <div className="mt-auto flex items-center justify-between pt-4 border-t">
            <span className="text-2xl font-bold">{formattedPrice}</span>
            {/* Stock status with quantity-based display */}
            {product.product_stock_quantity === 0 ? (
              // Out of stock
              <span className="text-sm text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" role="img" aria-label="Out of stock">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                Out of Stock
              </span>
            ) : product.product_stock_quantity <= 5 ? (
              // Low stock warning (1-5 items)
              <span className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  role="img"
                  aria-label="Low stock warning"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Only {product.product_stock_quantity} left!
              </span>
            ) : (
              // Normal stock (6+ items)
              <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" role="img" aria-label="In stock">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                In Stock
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
