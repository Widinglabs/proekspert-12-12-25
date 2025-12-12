/**
 * Product list page component for displaying the product catalog.
 *
 * Responsibilities:
 * - Fetch products from backend API on mount
 * - Manage loading, error, and success states
 * - Display product grid with filter controls
 * - Handle filter changes, pagination, favorites, and recently viewed
 *
 * State management:
 * - products: Array of Product objects from API
 * - loading: Boolean indicating API call in progress
 * - error: String with error message (null if no error)
 * - filters: Current filter parameters applied
 * - favoritedProductIds: Set of product IDs marked as favorites
 * - showFavoritesOnly: Boolean to filter favorites
 * - recentlyViewedProductIds: Array of recently viewed product IDs
 * - pagination: Metadata for pagination controls
 */

import { useCallback, useEffect, useState } from "react";
import { PaginationControls } from "@/components/PaginationControls";
import { ProductFilters } from "@/components/ProductFilters";
import { ProductGrid } from "@/components/ProductGrid";
import { RecentlyViewedProducts } from "@/components/RecentlyViewedProducts";
import { fetchProducts } from "@/lib/api-client";
import { loadFavorites, saveFavorites, toggleFavorite } from "@/lib/favorites";
import { logger } from "@/lib/logger";
import { getRecentlyViewedProductIds } from "@/lib/recently-viewed-storage";
import { ApiError } from "@/types/error";
import type { PaginationMetadata, Product, ProductFilterParams } from "@/types/product";

/**
 * Product list page component.
 *
 * Displays all products with filtering, pagination, favorites, and recently viewed.
 */
export function ProductListPage() {
  // State for products data
  const [products, setProducts] = useState<Product[]>([]);

  // State for loading indicator
  const [loading, setLoading] = useState<boolean>(true);

  // State for error message (null = no error)
  const [error, setError] = useState<string | null>(null);

  // State for current filter parameters
  const [filters, setFilters] = useState<ProductFilterParams>({});

  // State for recently viewed product IDs
  const [recentlyViewedProductIds, setRecentlyViewedProductIds] = useState<number[]>([]);

  // State for favorited product IDs (Set for O(1) lookup)
  const [favoritedProductIds, setFavoritedProductIds] = useState<Set<number>>(new Set());

  // State for favorites-only filter toggle
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);

  // State for pagination
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [paginationMetadata, setPaginationMetadata] = useState<PaginationMetadata | null>(null);

  /**
   * Fetch products from backend API with optional filters and pagination.
   *
   * Handles both ApiError (from backend) and network errors.
   * Updates state based on result.
   *
   * @param filterParams - Optional filter parameters to apply
   * @param page - Page number to fetch (defaults to current pageNumber state)
   * @param size - Page size (defaults to current pageSize state)
   */
  const loadProducts = useCallback(
    async (filterParams?: ProductFilterParams, page?: number, size?: number) => {
      const currentPage = page ?? pageNumber;
      const currentSize = size ?? pageSize;

      logger.info("product_list_page_loading", {
        operation: "load_products",
        filters: filterParams ?? null,
        page_number: currentPage,
        page_size: currentSize,
        component: "ProductListPage",
      });

      try {
        setLoading(true);
        setError(null);

        // Call backend API with filters and pagination
        const response = await fetchProducts({
          ...filterParams,
          page_number: currentPage,
          page_size: currentSize,
        });

        // Update state with fetched products and pagination metadata
        setProducts(response.products);
        setPaginationMetadata(response.pagination);

        logger.info("product_list_page_loaded", {
          products_count: response.products.length,
          total_count: response.total_count,
          page_number: response.pagination.page_number,
          total_pages: response.pagination.total_pages,
          operation: "load_products",
          filters: filterParams ?? null,
          component: "ProductListPage",
        });
      } catch (err) {
        // Extract error message based on error type
        const errorMessage =
          err instanceof ApiError
            ? err.errorResponse.error_message
            : err instanceof Error
              ? err.message
              : "An unknown error occurred while loading products";

        setError(errorMessage);

        logger.error("product_list_page_load_failed", {
          error_message: errorMessage,
          error_type: err instanceof ApiError ? "api_error" : "network_error",
          error_code: err instanceof ApiError ? err.errorResponse.error_code : undefined,
          operation: "load_products",
          filters: filterParams ?? null,
          component: "ProductListPage",
          fix_suggestion:
            err instanceof ApiError
              ? "Check backend logs for error details"
              : "Verify backend server is running at http://localhost:8000",
        });
      } finally {
        setLoading(false);
      }
    },
    [pageNumber, pageSize]
  );

  /**
   * Handle filter changes from ProductFilters component.
   *
   * Updates filter state, resets to page 1, and triggers a new product fetch.
   */
  const handleFilterChange = useCallback(
    (newFilters: ProductFilterParams) => {
      setFilters(newFilters);
      setPageNumber(1); // Reset to first page when filters change
      loadProducts(newFilters, 1, pageSize);
    },
    [loadProducts, pageSize]
  );

  /**
   * Handle toggling a product's favorite status.
   *
   * Updates state and persists to localStorage.
   */
  const handleToggleFavorite = useCallback((productId: number) => {
    setFavoritedProductIds((currentFavorites) => {
      const newFavorites = toggleFavorite(productId, currentFavorites);
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, []);

  /**
   * Handle toggling the "show favorites only" filter.
   *
   * Logs the operation for debugging.
   */
  const handleShowFavoritesToggle = useCallback(
    (showOnly: boolean) => {
      setShowFavoritesOnly(showOnly);
      logger.info("favorites_filter_toggled", {
        show_favorites_only: showOnly,
        total_favorites: favoritedProductIds.size,
        operation: "toggle_favorites_filter",
      });
    },
    [favoritedProductIds.size]
  );

  /**
   * Handle page number change from PaginationControls.
   */
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPageNumber(newPage);
      loadProducts(filters, newPage, pageSize);
    },
    [filters, pageSize, loadProducts]
  );

  /**
   * Handle page size change from PaginationControls.
   *
   * Resets to page 1 when page size changes to avoid invalid page numbers.
   */
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize);
      setPageNumber(1); // Reset to first page when page size changes
      loadProducts(filters, 1, newPageSize);
    },
    [filters, loadProducts]
  );

  // Load products on component mount only (intentionally empty dependency array)
  // biome-ignore lint/correctness/useExhaustiveDependencies: Initial load only
  useEffect(() => {
    loadProducts();
  }, []);

  // Load recently viewed IDs on component mount
  useEffect(() => {
    const viewedIds = getRecentlyViewedProductIds();
    setRecentlyViewedProductIds(viewedIds);
    logger.info("recently_viewed_loaded", {
      recently_viewed_count: viewedIds.length,
      component: "ProductListPage",
    });
  }, []);

  // Refresh recently viewed list when window regains focus
  useEffect(() => {
    const handleStorageChange = () => {
      const viewedIds = getRecentlyViewedProductIds();
      setRecentlyViewedProductIds(viewedIds);
    };

    window.addEventListener("focus", handleStorageChange);

    return () => {
      window.removeEventListener("focus", handleStorageChange);
    };
  }, []);

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const favorites = loadFavorites();
    setFavoritedProductIds(favorites);
  }, []);

  // Filter products based on favorites toggle
  const displayedProducts = showFavoritesOnly
    ? products.filter((product) => favoritedProductIds.has(product.product_id))
    : products;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header with product count */}
      <div className="mb-6">
        <p className="text-muted-foreground">
          {loading
            ? "Loading products..."
            : error
              ? "Error loading products"
              : showFavoritesOnly
                ? `Showing ${displayedProducts.length} favorite products`
                : paginationMetadata
                  ? `Browse our collection of ${paginationMetadata.total_count} products (${favoritedProductIds.size} favorites)`
                  : `Browse our collection of ${products.length} products (${favoritedProductIds.size} favorites)`}
        </p>
      </div>

      {/* Filter controls */}
      <ProductFilters
        onFilterChange={handleFilterChange}
        loading={loading}
        showFavoritesOnly={showFavoritesOnly}
        onShowFavoritesToggle={handleShowFavoritesToggle}
        totalFavorites={favoritedProductIds.size}
        onPageSizeChange={handlePageSizeChange}
        currentPageSize={pageSize}
      />

      {/* Recently Viewed Section - only show if products loaded and has viewed items */}
      {!loading && !error && recentlyViewedProductIds.length > 0 && (
        <RecentlyViewedProducts recently_viewed_product_ids={recentlyViewedProductIds} all_products={products} />
      )}

      {/* Error state - show error message with retry button */}
      {error ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg">
            <div className="flex items-start gap-3">
              {/* Error icon */}
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                role="img"
                aria-label="Error"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-lg">Error loading products</p>
                <p className="text-sm mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => loadProducts(filters)}
                  className="mt-3 text-sm underline hover:no-underline font-medium"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>

          {/* Helpful debug info */}
          <div className="mt-4 text-sm text-muted-foreground text-center">
            <p>Make sure the backend server is running:</p>
            <code className="block mt-1 bg-muted px-2 py-1 rounded text-xs">
              cd app/backend && uv run python run_api.py
            </code>
          </div>
        </div>
      ) : (
        // Success/Loading state - show product grid with pagination
        <>
          <ProductGrid
            products={displayedProducts}
            loading={loading}
            favoritedProductIds={favoritedProductIds}
            onToggleFavorite={handleToggleFavorite}
            showingFavoritesOnly={showFavoritesOnly}
          />
          {/* Pagination controls - only show when we have pagination metadata and no error */}
          {paginationMetadata && (
            <PaginationControls
              pagination={paginationMetadata}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              disabled={loading}
            />
          )}
        </>
      )}
    </div>
  );
}
