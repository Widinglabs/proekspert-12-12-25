/**
 * ProductFilters component for filtering products in the catalog.
 *
 * Provides form controls for:
 * - Category selection (dropdown)
 * - Price range (min/max inputs)
 * - Keyword search (text input)
 * - Favorites filter (checkbox)
 * - Sort order (dropdown)
 *
 * Uses React Hook Form + Zod for form validation and state management.
 * Logs all filter operations with structured JSON for debugging.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logger } from "@/lib/logger";
import type { ProductCategory, ProductFilterParams } from "@/types/product";

/**
 * Zod schema for filter form validation.
 *
 * Validates:
 * - Prices are non-negative numbers (or empty)
 * - Category is one of the valid options (or empty for "All")
 * - Search keyword is max 100 characters
 * - Sort order is one of the valid options
 * - Min price <= max price when both are provided
 */
const filterFormSchema = z
  .object({
    minimum_price_usd: z.coerce
      .number()
      .min(0, "Price must be non-negative")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    maximum_price_usd: z.coerce
      .number()
      .min(0, "Price must be non-negative")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    category: z
      .enum(["electronics", "clothing", "home", "sports", "books"])
      .optional()
      .or(z.literal("").transform(() => undefined)),
    search_keyword: z
      .string()
      .max(100, "Search keyword must be 100 characters or less")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    sort_by: z
      .enum(["price_asc", "price_desc", "name_asc", "name_desc", "newest"])
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine(
    (data) => {
      if (data.minimum_price_usd !== undefined && data.maximum_price_usd !== undefined) {
        return data.minimum_price_usd <= data.maximum_price_usd;
      }
      return true;
    },
    {
      message: "Minimum price cannot exceed maximum price",
      path: ["maximum_price_usd"],
    }
  );

type FilterFormValues = z.infer<typeof filterFormSchema>;

/** Available product categories for the dropdown */
const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "home", label: "Home" },
  { value: "sports", label: "Sports" },
  { value: "books", label: "Books" },
];

interface ProductFiltersProps {
  /** Callback when filters are applied or cleared */
  onFilterChange: (filters: ProductFilterParams) => void;
  /** Whether the product list is currently loading */
  loading?: boolean;
  /** Whether to show only favorited products */
  showFavoritesOnly: boolean;
  /** Callback when favorites toggle is changed */
  onShowFavoritesToggle: (showFavoritesOnly: boolean) => void;
  /** Total number of favorited products */
  totalFavorites: number;
  /** Callback when page size is changed */
  onPageSizeChange: (pageSize: number) => void;
  /** Current page size */
  currentPageSize: number;
}

/**
 * Product filter form component.
 *
 * Renders filter controls and handles form submission/reset.
 * All filter operations are logged with structured JSON.
 *
 * @param onFilterChange - Callback invoked when filters change
 * @param loading - Disables form controls while loading
 * @param showFavoritesOnly - Whether to show only favorited products
 * @param onShowFavoritesToggle - Callback when favorites toggle changes
 * @param totalFavorites - Total number of favorited products
 */
<<<<<<< HEAD
export function ProductFilters({
  onFilterChange,
  loading = false,
  showFavoritesOnly,
  onShowFavoritesToggle,
  totalFavorites,
  onPageSizeChange,
  currentPageSize,
}: ProductFiltersProps) {
  // Generate unique ID for favorites checkbox for accessibility
  const favoritesCheckboxId = useId();

  const form = useForm<FilterFormValues>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: {
      minimum_price_usd: undefined,
      maximum_price_usd: undefined,
      category: undefined,
      search_keyword: "",
      sort_by: undefined,
    },
  });

  /**
   * Handle form submission - apply filters.
   */
  function onSubmit(values: FilterFormValues) {
    const filters: ProductFilterParams = {};

    if (values.minimum_price_usd !== undefined) {
      filters.minimum_price_usd = values.minimum_price_usd;
    }
    if (values.maximum_price_usd !== undefined) {
      filters.maximum_price_usd = values.maximum_price_usd;
    }
    if (values.category) {
      filters.category = values.category as ProductCategory;
    }
    if (values.search_keyword) {
      filters.search_keyword = values.search_keyword;
    }
    if (values.sort_by) {
      filters.sort_by = values.sort_by as ProductFilterParams["sort_by"];
    }

    logger.info("filters_applied", {
      category: filters.category ?? null,
      minimum_price_usd: filters.minimum_price_usd ?? null,
      maximum_price_usd: filters.maximum_price_usd ?? null,
      search_keyword: filters.search_keyword ?? null,
      sort_by: filters.sort_by ?? null,
      operation: "apply_filters",
    });

    onFilterChange(filters);
  }

  /**
   * Clear all filters and reset form to default values.
   */
  function handleClearFilters() {
    form.reset({
      minimum_price_usd: undefined,
      maximum_price_usd: undefined,
      category: undefined,
      search_keyword: "",
      sort_by: undefined,
    });

    logger.info("filters_cleared", {
      operation: "clear_filters",
    });

    onFilterChange({});
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mb-6 rounded-lg border bg-card p-4">
        {/* Favorites Toggle and Page Size - separate from main filter grid */}
        <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={favoritesCheckboxId}
              checked={showFavoritesOnly}
              onChange={(e) => {
                onShowFavoritesToggle(e.target.checked);
                logger.info("favorites_filter_toggled_ui", {
                  show_favorites_only: e.target.checked,
                  total_favorites: totalFavorites,
                  operation: "toggle_favorites_filter",
                });
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              disabled={loading}
            />
            <label htmlFor={favoritesCheckboxId} className="text-sm font-medium cursor-pointer select-none">
              Show Favorites Only{" "}
              {totalFavorites > 0 && <span className="text-muted-foreground">({totalFavorites})</span>}
            </label>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-sm font-medium whitespace-nowrap">
              Items per page:
            </label>
            <Select
              value={currentPageSize.toString()}
              onValueChange={(value) => {
                const newSize = Number.parseInt(value, 10);
                onPageSizeChange(newSize);
                logger.info("page_size_changed", {
                  new_page_size: newSize,
                  operation: "change_page_size",
                });
              }}
              disabled={loading}
            >
              <SelectTrigger id="page-size" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {/* Category Select */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "all" ? undefined : value)}
                  value={field.value ?? "all"}
                  disabled={loading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Minimum Price Input */}
          <FormField
            control={form.control}
            name="minimum_price_usd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Price ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    step="0.01"
                    disabled={loading}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Maximum Price Input */}
          <FormField
            control={form.control}
            name="maximum_price_usd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Price ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Any"
                    min={0}
                    step="0.01"
                    disabled={loading}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Search Keyword Input */}
          <FormField
            control={form.control}
            name="search_keyword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Search</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Search products..." maxLength={100} disabled={loading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sort By Select */}
          <FormField
            control={form.control}
            name="sort_by"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sort By</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "" ? undefined : value)}
                  value={field.value ?? ""}
                  disabled={loading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Default (Newest)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Default (Newest)</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="name_asc">Name: A-Z</SelectItem>
                    <SelectItem value="name_desc">Name: Z-A</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              Apply Filters
            </Button>
            <Button type="button" variant="outline" onClick={handleClearFilters} disabled={loading}>
              Clear
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
