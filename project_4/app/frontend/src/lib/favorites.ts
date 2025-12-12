/**
 * Favorites localStorage management utility.
 *
 * Provides functions for persisting and retrieving favorite product IDs
 * in the browser's localStorage. Uses Set<number> for O(1) lookup performance.
 *
 * Storage schema:
 * - Key: "product_favorites"
 * - Value: JSON stringified array of product IDs (e.g., [1, 5, 12, 23])
 *
 * Example usage:
 * ```typescript
 * const favorites = loadFavorites();
 * const newFavorites = toggleFavorite(productId, favorites);
 * saveFavorites(newFavorites);
 * ```
 */

import { logger } from "@/lib/logger";

/** LocalStorage key for favorites (follows product_ prefix convention) */
const FAVORITES_STORAGE_KEY = "product_favorites";

/**
 * Load favorites from localStorage.
 *
 * Parses the stored JSON array and converts to Set for O(1) lookup.
 * Returns empty Set if no favorites stored or if parsing fails.
 *
 * @returns Set of favorited product IDs
 *
 * Example:
 * ```typescript
 * const favorites = loadFavorites();
 * if (favorites.has(productId)) {
 *   console.log("Product is favorited");
 * }
 * ```
 */
export function loadFavorites(): Set<number> {
  try {
    const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);

    if (!storedFavorites) {
      logger.info("favorites_loaded", {
        total_favorites: 0,
        operation: "loadFavorites",
        source: "empty_storage",
      });
      return new Set<number>();
    }

    const parsedFavorites = JSON.parse(storedFavorites) as unknown;

    // Validate that parsed data is an array of numbers
    if (!Array.isArray(parsedFavorites)) {
      logger.warning("favorites_load_invalid_format", {
        operation: "loadFavorites",
        expected_type: "array",
        actual_type: typeof parsedFavorites,
        fix_suggestion: "Clear localStorage key 'product_favorites' to reset",
      });
      return new Set<number>();
    }

    // Filter to ensure only valid numbers
    const validIds = parsedFavorites.filter(
      (item): item is number => typeof item === "number" && Number.isInteger(item) && item > 0
    );

    const favorites = new Set<number>(validIds);

    logger.info("favorites_loaded", {
      total_favorites: favorites.size,
      operation: "loadFavorites",
      source: "localStorage",
    });

    return favorites;
  } catch (error) {
    logger.error("favorites_load_failed", {
      operation: "loadFavorites",
      error_message: error instanceof Error ? error.message : "Unknown error",
      fix_suggestion: "Clear localStorage key 'product_favorites' to reset corrupted data",
    });
    return new Set<number>();
  }
}

/**
 * Save favorites to localStorage.
 *
 * Converts Set to Array for JSON serialization and stores in localStorage.
 * Handles quota exceeded errors gracefully.
 *
 * @param favorites - Set of product IDs to save
 *
 * Example:
 * ```typescript
 * const favorites = new Set([1, 5, 12]);
 * saveFavorites(favorites);
 * ```
 */
export function saveFavorites(favorites: Set<number>): void {
  try {
    const favoritesArray = Array.from(favorites);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoritesArray));

    logger.info("favorites_saved", {
      total_favorites: favorites.size,
      operation: "saveFavorites",
    });
  } catch (error) {
    logger.error("favorites_save_failed", {
      operation: "saveFavorites",
      error_message: error instanceof Error ? error.message : "Unknown error",
      total_favorites: favorites.size,
      fix_suggestion: "localStorage quota may be exceeded - try clearing some browser data",
    });
  }
}

/**
 * Toggle a product's favorite status.
 *
 * Creates a new Set (immutable pattern) with the product added or removed.
 * Does NOT persist to localStorage - caller should call saveFavorites().
 *
 * @param productId - The product ID to toggle
 * @param currentFavorites - Current Set of favorited product IDs
 * @returns New Set with product toggled
 *
 * Example:
 * ```typescript
 * const newFavorites = toggleFavorite(42, currentFavorites);
 * saveFavorites(newFavorites);
 * setFavoritedProductIds(newFavorites);
 * ```
 */
export function toggleFavorite(productId: number, currentFavorites: Set<number>): Set<number> {
  const newFavorites = new Set(currentFavorites);
  const wasRemoved = newFavorites.has(productId);

  if (wasRemoved) {
    newFavorites.delete(productId);
  } else {
    newFavorites.add(productId);
  }

  logger.info("favorite_toggled", {
    product_id: productId,
    action: wasRemoved ? "removed" : "added",
    total_favorites: newFavorites.size,
    operation: "toggleFavorite",
  });

  return newFavorites;
}
