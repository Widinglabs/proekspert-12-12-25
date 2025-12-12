/**
 * ProductFilters component for filtering products in the catalog.
 *
 * Provides form controls for:
 * - Category selection (dropdown)
 * - Price range (min/max inputs)
 * - Keyword search (text input)
 *
 * Uses React Hook Form + Zod for form validation and state management.
 * Logs all filter operations with structured JSON for debugging.
 */

import { zodResolver } from "@hookform/resolvers/zod";
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
}

/**
 * Product filter form component.
 *
 * Renders filter controls and handles form submission/reset.
 * All filter operations are logged with structured JSON.
 *
 * @param onFilterChange - Callback invoked when filters change
 * @param loading - Disables form controls while loading
 */
export function ProductFilters({ onFilterChange, loading = false }: ProductFiltersProps) {
  const form = useForm<FilterFormValues>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: {
      minimum_price_usd: undefined,
      maximum_price_usd: undefined,
      category: undefined,
      search_keyword: "",
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

    logger.info("filters_applied", {
      category: filters.category ?? null,
      minimum_price_usd: filters.minimum_price_usd ?? null,
      maximum_price_usd: filters.maximum_price_usd ?? null,
      search_keyword: filters.search_keyword ?? null,
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
    });

    logger.info("filters_cleared", {
      operation: "clear_filters",
    });

    onFilterChange({});
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mb-6 rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
