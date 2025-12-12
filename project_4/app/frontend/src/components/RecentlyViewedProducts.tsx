/**
 * RecentlyViewedProducts component for displaying recently viewed products.
 *
 * Displays products that the user has previously clicked on in a horizontal
 * scrolling section. Products are shown in most-recent-first order.
 *
 * Features:
 * - Horizontal scroll container with gap between cards
 * - Uses ProductCard component for consistent display
 * - Returns null (hidden) when no products have been viewed
 * - Maintains order from recently_viewed_product_ids (most recent first)
 */

import { logger } from "@/lib/logger";
import type { Product } from "@/types/product";
import { ProductCard } from "./ProductCard";

interface RecentlyViewedProductsProps {
  /** Array of product IDs in most-recent-first order */
  recently_viewed_product_ids: number[];

  /** Full products list to filter from */
  all_products: Product[];
}

/**
 * Display recently viewed products in a horizontal scrolling section.
 *
 * Filters all_products to show only those in recently_viewed_product_ids,
 * preserving the order of recently_viewed_product_ids (most recent first).
 *
 * @param recently_viewed_product_ids - Product IDs to display (most recent first)
 * @param all_products - Full product list from API
 * @returns Section with horizontal product cards, or null if no products
 */
export function RecentlyViewedProducts({ recently_viewed_product_ids, all_products }: RecentlyViewedProductsProps) {
  // Return null if no recently viewed products (section hidden)
  if (recently_viewed_product_ids.length === 0) {
    return null;
  }

  // Create a map for quick product lookup by ID
  const productMap = new Map<number, Product>();
  for (const product of all_products) {
    productMap.set(product.product_id, product);
  }

  // Filter and order products based on recently_viewed_product_ids
  // Maintains most-recent-first order from the IDs array
  const filteredProducts: Product[] = [];
  for (const product_id of recently_viewed_product_ids) {
    const product = productMap.get(product_id);
    if (product) {
      filteredProducts.push(product);
    }
  }

  // Return null if no matching products found (all viewed products may have been removed from catalog)
  if (filteredProducts.length === 0) {
    return null;
  }

  logger.info("rendering_recently_viewed", {
    recently_viewed_count: filteredProducts.length,
    component: "RecentlyViewedProducts",
  });

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Recently Viewed</h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {filteredProducts.map((product) => (
          <div
            key={product.product_id}
            className="flex-shrink-0 w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
