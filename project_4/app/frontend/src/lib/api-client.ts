/**
 * Type-safe API client for communicating with FastAPI backend.
 *
 * Backend endpoints (app/api/products.py, app/main.py):
 * - GET /api/products - Get all products
 * - GET /health - Health check
 *
 * Configuration:
 * - API_BASE_URL: Backend URL from environment or default
 *
 * Error handling:
 * - Network errors: Throws standard Error
 * - API errors: Throws ApiError with ErrorResponse
 */

import { ApiError, type ErrorResponse } from "@/types/error";
import type { Product, ProductFilterParams, ProductListResponse } from "@/types/product";
import type { Review, ReviewListResponse, ReviewSubmission } from "@/types/review";
import { logger } from "./logger";

/**
 * Backend API base URL.
 *
 * Default: http://localhost:8000 (matching backend run_api.py port)
 * TODO: Make this configurable via build-time environment variable
 */
const API_BASE_URL = "http://localhost:8000";

/**
 * Build query string from filter parameters.
 *
 * Maps frontend filter param names to backend query param names:
 * - minimum_price_usd -> min_price_usd
 * - maximum_price_usd -> max_price_usd
 * - category -> category
 * - search_keyword -> search_keyword
 * - sort_by -> sort_by
 * - in_stock_only -> in_stock_only
 * - page_number -> page_number
 * - page_size -> page_size
 *
 * @param filters - Optional filter parameters
 * @returns Query string (without leading ?) or empty string if no filters
 */
function buildFilterQueryString(filters?: ProductFilterParams): string {
  if (!filters) {
    return "";
  }

  const params = new URLSearchParams();

  if (filters.minimum_price_usd !== undefined) {
    params.append("min_price_usd", filters.minimum_price_usd.toString());
  }
  if (filters.maximum_price_usd !== undefined) {
    params.append("max_price_usd", filters.maximum_price_usd.toString());
  }
  if (filters.category) {
    params.append("category", filters.category);
  }
  if (filters.search_keyword) {
    params.append("search_keyword", filters.search_keyword);
  }
  if (filters.sort_by) {
    params.append("sort_by", filters.sort_by);
  }
  if (filters.in_stock_only) {
    params.append("in_stock_only", "true");
  }
  if (filters.page_number !== undefined) {
    params.append("page_number", filters.page_number.toString());
  }
  if (filters.page_size !== undefined) {
    params.append("page_size", filters.page_size.toString());
  }

  return params.toString();
}

/**
 * Fetch products from the catalog API with optional filtering.
 *
 * Backend endpoint: GET /api/products
 * Response model: ProductListResponse
 *
 * @param filters - Optional filter parameters for price, category, and keyword search
 * @returns ProductListResponse with products array and total count
 * @throws ApiError if backend returns error response (4xx/5xx)
 * @throws Error if network failure or unable to reach backend
 *
 * Example usage:
 * ```typescript
 * try {
 *   // Fetch all products
 *   const allProducts = await fetchProducts();
 *
 *   // Fetch filtered products
 *   const filtered = await fetchProducts({
 *     category: "electronics",
 *     minimum_price_usd: 25,
 *     maximum_price_usd: 100
 *   });
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(`API Error: ${error.errorResponse.error_code}`);
 *   } else {
 *     console.error('Network error');
 *   }
 * }
 * ```
 */
export async function fetchProducts(filters?: ProductFilterParams): Promise<ProductListResponse> {
  const endpoint = "/api/products";
  const queryString = buildFilterQueryString(filters);
  const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;

  logger.info("fetching_products", {
    endpoint,
    url,
    filters: filters ?? null,
    operation: "fetchProducts",
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Handle non-OK responses (4xx, 5xx)
    if (!response.ok) {
      let errorData: ErrorResponse;

      try {
        // Try to parse error response from backend
        errorData = await response.json();
      } catch {
        // Fallback if response isn't JSON
        errorData = {
          error_code: "unknown_error",
          error_message: `HTTP ${response.status}: ${response.statusText}`,
          timestamp_utc: new Date().toISOString(),
        };
      }

      logger.error("fetch_products_failed", {
        endpoint,
        status_code: response.status,
        error_code: errorData.error_code,
        error_message: errorData.error_message,
        operation: "fetchProducts",
      });

      throw new ApiError(response.status, errorData);
    }

    // Parse successful response
    const data: ProductListResponse = await response.json();

    logger.info("products_fetched_successfully", {
      endpoint,
      products_count: data.products.length,
      total_count: data.total_count,
      page_number: data.pagination.page_number,
      page_size: data.pagination.page_size,
      total_pages: data.pagination.total_pages,
      operation: "fetchProducts",
    });

    return data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors (fetch failed completely)
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("network_error", {
      endpoint,
      error_message: errorMessage,
      error_type: "network_failure",
      fix_suggestion: `Check that backend server is running at ${API_BASE_URL}`,
      operation: "fetchProducts",
    });

    throw new Error(`Network error while fetching products: ${errorMessage}`);
  }
}

/**
 * Health check for the backend API.
 *
 * Backend endpoint: GET /health
 * Expected response: { "status": "healthy" }
 *
 * @returns true if backend is healthy and reachable
 * @returns false if backend is down or unhealthy
 *
 * Example usage:
 * ```typescript
 * const isHealthy = await checkHealth();
 * if (!isHealthy) {
 *   console.warn('Backend is not responding');
 * }
 * ```
 */
export async function checkHealth(): Promise<boolean> {
  const endpoint = "/health";
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const isHealthy = data.status === "healthy";

    logger.info("health_check_completed", {
      endpoint,
      is_healthy: isHealthy,
      operation: "checkHealth",
    });

    return isHealthy;
  } catch (error) {
    logger.warning("health_check_failed", {
      endpoint,
      error_message: error instanceof Error ? error.message : String(error),
      operation: "checkHealth",
    });

    return false;
  }
}

/**
 * Fetch a single product by its ID.
 *
 * Backend endpoint: GET /api/products/{product_id}
 * Response model: Product
 *
 * @param productId - Unique identifier of the product to fetch
 * @returns Product object with full details
 * @throws ApiError if product not found (404) or other API error
 * @throws Error if network failure
 *
 * Example usage:
 * ```typescript
 * try {
 *   const product = await fetchProductById(1);
 *   console.log(product.product_name);
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 404) {
 *     console.error('Product not found');
 *   }
 * }
 * ```
 */
export async function fetchProductById(productId: number): Promise<Product> {
  const endpoint = `/api/products/${productId}`;
  const url = `${API_BASE_URL}${endpoint}`;

  logger.info("fetching_product_by_id", {
    endpoint,
    product_id: productId,
    operation: "fetchProductById",
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorData: ErrorResponse;

      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error_code: "unknown_error",
          error_message: `HTTP ${response.status}: ${response.statusText}`,
          timestamp_utc: new Date().toISOString(),
        };
      }

      const isNotFound = response.status === 404;

      logger.error("fetch_product_by_id_failed", {
        endpoint,
        product_id: productId,
        status_code: response.status,
        error_code: errorData.error_code,
        error_message: errorData.error_message,
        is_not_found: isNotFound,
        operation: "fetchProductById",
      });

      throw new ApiError(response.status, errorData);
    }

    const data: Product = await response.json();

    logger.info("product_fetched_successfully", {
      endpoint,
      product_id: productId,
      product_name: data.product_name,
      operation: "fetchProductById",
    });

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("network_error", {
      endpoint,
      product_id: productId,
      error_message: errorMessage,
      error_type: "network_failure",
      fix_suggestion: `Check that backend server is running at ${API_BASE_URL}`,
      operation: "fetchProductById",
    });

    throw new Error(`Network error while fetching product ${productId}: ${errorMessage}`);
  }
}

/**
 * Fetch related products for a specific product.
 *
 * Backend endpoint: GET /api/products/{product_id}/related
 * Response model: ProductListResponse
 *
 * @param productId - ID of product to find related items for
 * @param limit - Maximum number of related products (default 4)
 * @returns ProductListResponse with related products
 * @throws ApiError if product not found or API error
 * @throws Error if network failure
 *
 * Example usage:
 * ```typescript
 * const related = await fetchRelatedProducts(1, 4);
 * console.log(`Found ${related.total_count} related products`);
 * ```
 */
export async function fetchRelatedProducts(productId: number, limit: number = 4): Promise<ProductListResponse> {
  const endpoint = `/api/products/${productId}/related`;
  const url = `${API_BASE_URL}${endpoint}?limit=${limit}`;

  logger.info("fetching_related_products", {
    endpoint,
    product_id: productId,
    limit,
    operation: "fetchRelatedProducts",
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorData: ErrorResponse;

      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error_code: "unknown_error",
          error_message: `HTTP ${response.status}: ${response.statusText}`,
          timestamp_utc: new Date().toISOString(),
        };
      }

      logger.error("fetch_related_products_failed", {
        endpoint,
        product_id: productId,
        status_code: response.status,
        error_code: errorData.error_code,
        operation: "fetchRelatedProducts",
      });

      throw new ApiError(response.status, errorData);
    }

    const data: ProductListResponse = await response.json();

    logger.info("related_products_fetched_successfully", {
      endpoint,
      product_id: productId,
      related_products_count: data.total_count,
      operation: "fetchRelatedProducts",
    });

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("network_error", {
      endpoint,
      product_id: productId,
      error_message: errorMessage,
      error_type: "network_failure",
      fix_suggestion: `Check that backend server is running at ${API_BASE_URL}`,
      operation: "fetchRelatedProducts",
    });

    throw new Error(`Network error while fetching related products for ${productId}: ${errorMessage}`);
  }
}

/**
 * Fetch all reviews for a specific product.
 *
 * Backend endpoint: GET /api/reviews/{product_id}
 * Response model: ReviewListResponse
 *
 * @param productId - ID of the product to fetch reviews for
 * @returns ReviewListResponse with reviews, total count, and rating statistics
 * @throws ApiError if backend returns error response (4xx/5xx)
 * @throws Error if network failure or unable to reach backend
 *
 * Example usage:
 * ```typescript
 * try {
 *   const reviewData = await fetchProductReviews(1);
 *   console.log(`Average rating: ${reviewData.rating_stats.average_rating}`);
 *   console.log(`Total reviews: ${reviewData.total_count}`);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(`API Error: ${error.errorResponse.error_code}`);
 *   }
 * }
 * ```
 */
export async function fetchProductReviews(productId: number): Promise<ReviewListResponse> {
  const endpoint = `/api/reviews/${productId}`;
  const url = `${API_BASE_URL}${endpoint}`;

  logger.info("fetching_product_reviews", {
    endpoint,
    product_id: productId,
    operation: "fetchProductReviews",
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Handle non-OK responses (4xx, 5xx)
    if (!response.ok) {
      let errorData: ErrorResponse;

      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error_code: "unknown_error",
          error_message: `HTTP ${response.status}: ${response.statusText}`,
          timestamp_utc: new Date().toISOString(),
        };
      }

      logger.error("fetch_product_reviews_failed", {
        endpoint,
        product_id: productId,
        status_code: response.status,
        error_code: errorData.error_code,
        error_message: errorData.error_message,
        fix_suggestion: "Check if product_id is valid and backend is running",
        operation: "fetchProductReviews",
      });

      throw new ApiError(response.status, errorData);
    }

    // Parse successful response
    const data: ReviewListResponse = await response.json();

    logger.info("product_reviews_fetched_successfully", {
      endpoint,
      product_id: productId,
      total_reviews: data.total_count,
      average_rating: data.rating_stats.average_rating,
      operation: "fetchProductReviews",
    });

    return data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("network_error", {
      endpoint,
      product_id: productId,
      error_message: errorMessage,
      error_type: "network_failure",
      fix_suggestion: `Check that backend server is running at ${API_BASE_URL}`,
      operation: "fetchProductReviews",
    });

    throw new Error(`Network error while fetching reviews: ${errorMessage}`);
  }
}

/**
 * Submit a new product review.
 *
 * Backend endpoint: POST /api/reviews
 * Request model: ReviewSubmission
 * Response model: Review (the created review)
 *
 * @param submission - ReviewSubmission data containing product_id, user_name, rating, and optional text
 * @returns Created Review object
 * @throws ApiError if submission fails (validation error or duplicate review)
 * @throws Error if network failure
 *
 * Example usage:
 * ```typescript
 * try {
 *   const newReview = await submitProductReview({
 *     product_id: 1,
 *     user_name: "John Doe",
 *     review_rating: 5,
 *     review_text: "Excellent product! Highly recommended."
 *   });
 *   console.log(`Review created with ID: ${newReview.review_id}`);
 * } catch (error) {
 *   if (error instanceof ApiError && error.statusCode === 409) {
 *     console.error('You have already reviewed this product');
 *   }
 * }
 * ```
 */
export async function submitProductReview(submission: ReviewSubmission): Promise<Review> {
  const endpoint = "/api/reviews";
  const url = `${API_BASE_URL}${endpoint}`;

  logger.info("submitting_product_review", {
    endpoint,
    product_id: submission.product_id,
    user_name: submission.user_name,
    rating: submission.review_rating,
    has_text: !!submission.review_text,
    operation: "submitProductReview",
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submission),
    });

    // Handle non-OK responses (4xx, 5xx)
    if (!response.ok) {
      let errorData: ErrorResponse;

      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error_code: "unknown_error",
          error_message: `HTTP ${response.status}: ${response.statusText}`,
          timestamp_utc: new Date().toISOString(),
        };
      }

      logger.error("submit_review_failed", {
        endpoint,
        product_id: submission.product_id,
        user_name: submission.user_name,
        status_code: response.status,
        error_code: errorData.error_code,
        error_message: errorData.error_message,
        fix_suggestion:
          response.status === 409
            ? "User has already reviewed this product"
            : "Check review data validation requirements",
        operation: "submitProductReview",
      });

      throw new ApiError(response.status, errorData);
    }

    // Parse successful response
    const data: Review = await response.json();

    logger.info("review_submitted_successfully", {
      endpoint,
      review_id: data.review_id,
      product_id: submission.product_id,
      operation: "submitProductReview",
    });

    return data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("network_error", {
      endpoint,
      product_id: submission.product_id,
      error_message: errorMessage,
      error_type: "network_failure",
      fix_suggestion: `Check that backend server is running at ${API_BASE_URL}`,
      operation: "submitProductReview",
    });

    throw new Error(`Network error while submitting review: ${errorMessage}`);
  }
}
