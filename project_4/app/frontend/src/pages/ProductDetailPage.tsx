/**
 * Product detail page component for displaying individual product information.
 *
 * Responsibilities:
 * - Fetch single product by ID from backend API
 * - Fetch related products from the same category
 * - Handle loading, error, and 404 states
 * - Display product details with related products section
 *
 * URL pattern: /products/:productId
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductGrid } from "@/components/ProductGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchProductById, fetchRelatedProducts } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { ApiError } from "@/types/error";
import type { Product } from "@/types/product";

/**
 * Product detail page component.
 *
 * Displays full product information with related products.
 */
export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  useEffect(() => {
    async function loadProductData() {
      if (!productId) {
        setError("No product ID provided");
        setLoading(false);
        return;
      }

      const id = Number.parseInt(productId, 10);
      if (Number.isNaN(id)) {
        setError("Invalid product ID");
        setLoading(false);
        return;
      }

      logger.info("product_detail_page_loading", {
        product_id: id,
        operation: "load_product_detail",
        component: "ProductDetailPage",
      });

      try {
        setLoading(true);
        setError(null);
        setIsNotFound(false);

        const productData = await fetchProductById(id);
        setProduct(productData);

        logger.info("product_detail_page_product_loaded", {
          product_id: id,
          product_name: productData.product_name,
          component: "ProductDetailPage",
        });

        // Fetch related products
        const relatedData = await fetchRelatedProducts(id, 4);
        setRelatedProducts(relatedData.products);

        logger.info("product_detail_page_related_loaded", {
          product_id: id,
          related_count: relatedData.total_count,
          component: "ProductDetailPage",
        });
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 404) {
          setIsNotFound(true);
          setError("Product not found");
          logger.warning("product_detail_page_not_found", {
            product_id: id,
            component: "ProductDetailPage",
          });
        } else {
          const errorMessage =
            err instanceof ApiError
              ? err.errorResponse.error_message
              : err instanceof Error
                ? err.message
                : "An unknown error occurred";

          setError(errorMessage);

          logger.error("product_detail_page_load_failed", {
            product_id: id,
            error_message: errorMessage,
            error_type: err instanceof ApiError ? "api_error" : "network_error",
            component: "ProductDetailPage",
            fix_suggestion: "Verify backend server is running",
          });
        }
      } finally {
        setLoading(false);
      }
    }

    loadProductData();
  }, [productId]);

  // Category badge color mapping (same as ProductCard)
  const categoryColors: Record<string, string> = {
    electronics: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    clothing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    home: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    sports: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    books: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  // Category placeholder background colors (for image placeholder)
  const categoryBackgrounds: Record<string, string> = {
    electronics: "bg-blue-200 dark:bg-blue-800",
    clothing: "bg-purple-200 dark:bg-purple-800",
    home: "bg-green-200 dark:bg-green-800",
    sports: "bg-orange-200 dark:bg-orange-800",
    books: "bg-yellow-200 dark:bg-yellow-800",
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-muted rounded mb-6" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="h-24 bg-muted rounded" />
              <div className="h-10 bg-muted rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 404 Not Found state
  if (isNotFound) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4">Product Not Found</h2>
        <p className="text-muted-foreground mb-8">The product you're looking for doesn't exist or has been removed.</p>
        <Link to="/" className="text-primary hover:underline">
          Return to Product Catalog
        </Link>
      </div>
    );
  }

  // Error state (non-404)
  if (error && !isNotFound) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg">
            <p className="font-semibold">Error loading product</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 text-sm underline hover:no-underline font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state - product found
  if (!product) {
    return null;
  }

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.parseFloat(product.product_price_usd));

  const categoryColor = categoryColors[product.product_category] || "bg-gray-100 text-gray-800";
  const categoryBackground = categoryBackgrounds[product.product_category] || "bg-gray-200";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          role="img"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Catalog
      </Button>

      {/* Product details */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Product image placeholder */}
        <div
          className={`aspect-square rounded-lg ${categoryBackground} flex items-center justify-center`}
          role="img"
          aria-label={`${product.product_category} product image placeholder`}
        >
          <span className="text-6xl font-bold opacity-20">{product.product_name.charAt(0).toUpperCase()}</span>
        </div>

        {/* Product info */}
        <div className="flex flex-col">
          <div className="flex items-start gap-3 mb-4">
            <h1 className="text-3xl font-bold flex-1">{product.product_name}</h1>
            <span className={`px-3 py-1 text-sm font-medium rounded-md ${categoryColor}`}>
              {product.product_category}
            </span>
          </div>

          <p className="text-muted-foreground mb-6">{product.product_description}</p>

          <div className="mt-auto space-y-4">
            <p className="text-4xl font-bold">{formattedPrice}</p>

            {product.product_in_stock ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" role="img" aria-label="In stock">
                  <title>In stock</title>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">In Stock</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" role="img" aria-label="Out of stock">
                  <title>Out of stock</title>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Out of Stock</span>
              </div>
            )}

            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Product Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Product ID</dt>
                    <dd className="font-medium">{product.product_id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="font-medium capitalize">{product.product_category}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Availability</dt>
                    <dd className="font-medium">{product.product_in_stock ? "Available" : "Unavailable"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Related products section */}
      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <ProductGrid products={relatedProducts} loading={false} />
        </section>
      )}
    </div>
  );
}
