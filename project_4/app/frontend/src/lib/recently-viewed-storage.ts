/**
 * LocalStorage utility for tracking recently viewed products.
 *
 * Stores product views with timestamps in browser localStorage.
 * Maintains a maximum of 10 most recently viewed products.
 *
 * Storage format:
 * ```json
 * [
 *   { "product_id": 123, "viewed_timestamp_iso": "2025-01-15T10:30:00.000Z" },
 *   { "product_id": 456, "viewed_timestamp_iso": "2025-01-15T10:25:00.000Z" }
 * ]
 * ```
 *
 * Error handling:
 * - Returns empty array on parse errors or localStorage failures
 * - Logs all operations for debugging
 */

import { logger } from "./logger";

/** Storage key for recently viewed products in localStorage */
const STORAGE_KEY = "product_catalog_recently_viewed";

/** Maximum number of recently viewed products to store */
const MAX_RECENTLY_VIEWED = 10;

/**
 * Represents a product view record in localStorage.
 *
 * Stores minimal data (ID + timestamp) to avoid data duplication.
 * Full product details are fetched from the already-loaded products list.
 */
interface RecentlyViewedProduct {
  /** Product identifier (matches Product.product_id) */
  product_id: number;

  /** ISO 8601 timestamp of when the product was viewed */
  viewed_timestamp_iso: string;
}

/**
 * Read recently viewed products from localStorage.
 *
 * @returns Array of recently viewed products, or empty array on error
 */
function readFromStorage(): RecentlyViewedProduct[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as RecentlyViewedProduct[];

    // Validate that parsed data is an array
    if (!Array.isArray(parsed)) {
      logger.warning("localStorage_invalid_format", {
        operation: "readFromStorage",
        fix_suggestion: "localStorage data is not an array, returning empty list",
      });
      return [];
    }

    return parsed;
  } catch (error) {
    logger.error("localStorage_read_error", {
      error_message: error instanceof Error ? error.message : String(error),
      operation: "readFromStorage",
      fix_suggestion: "Check browser localStorage permissions and clear corrupted data",
    });
    return [];
  }
}

/**
 * Write recently viewed products to localStorage.
 *
 * @param products - Array of recently viewed products to store
 */
function writeToStorage(products: RecentlyViewedProduct[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    logger.error("localStorage_write_error", {
      error_message: error instanceof Error ? error.message : String(error),
      operation: "writeToStorage",
      fix_suggestion: "Check browser localStorage quota and permissions",
    });
  }
}

/**
 * Track a product view in localStorage.
 *
 * Adds the product to the recently viewed list or updates its timestamp
 * if already present. Maintains most recent first order.
 * Enforces maximum limit of 10 products.
 *
 * @param product_id - The ID of the product being viewed
 *
 * Example:
 * ```typescript
 * trackProductView(123); // Product 123 is now most recently viewed
 * trackProductView(456); // Product 456 is now most recently viewed
 * trackProductView(123); // Product 123 moves back to most recent
 * ```
 */
export function trackProductView(product_id: number): void {
  const viewed_timestamp_iso = new Date().toISOString();

  // Read current list
  const currentList = readFromStorage();

  // Remove existing entry for this product (if any)
  const filteredList = currentList.filter((item) => item.product_id !== product_id);

  // Add new entry at the beginning (most recent first)
  const newEntry: RecentlyViewedProduct = {
    product_id,
    viewed_timestamp_iso,
  };

  const updatedList = [newEntry, ...filteredList];

  // Enforce maximum limit
  const limitedList = updatedList.slice(0, MAX_RECENTLY_VIEWED);

  // Save to storage
  writeToStorage(limitedList);

  logger.info("tracking_product_view", {
    product_id: product_id,
    operation: "trackProductView",
    total_recently_viewed: limitedList.length,
  });
}

/**
 * Get list of recently viewed product IDs.
 *
 * Returns product IDs in most-recent-first order.
 * Returns empty array if no products have been viewed or on error.
 *
 * @returns Array of product IDs (most recent first)
 *
 * Example:
 * ```typescript
 * const viewedIds = getRecentlyViewedProductIds();
 * // [456, 123, 789] - 456 was viewed most recently
 * ```
 */
export function getRecentlyViewedProductIds(): number[] {
  const products = readFromStorage();
  return products.map((item) => item.product_id);
}

/**
 * Clear all recently viewed products from localStorage.
 *
 * Removes the storage key entirely.
 * Useful for testing or user-initiated "clear history" actions.
 *
 * Example:
 * ```typescript
 * clearRecentlyViewedProducts();
 * getRecentlyViewedProductIds(); // []
 * ```
 */
export function clearRecentlyViewedProducts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);

    logger.info("cleared_recently_viewed", {
      operation: "clearRecentlyViewedProducts",
    });
  } catch (error) {
    logger.error("localStorage_clear_error", {
      error_message: error instanceof Error ? error.message : String(error),
      operation: "clearRecentlyViewedProducts",
      fix_suggestion: "Check browser localStorage permissions",
    });
  }
}
