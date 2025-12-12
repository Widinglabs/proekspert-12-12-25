/**
 * Pagination controls component for navigating paginated product results.
 *
 * Provides:
 * - Page size selector (10, 25, 50 items per page)
 * - Previous/Next navigation buttons
 * - Page indicator ("Page X of Y")
 * - Item range display ("Showing X-Y of Z products")
 *
 * Accessibility:
 * - ARIA labels for navigation buttons
 * - Keyboard navigation support
 * - Clear disabled states
 */

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useId } from "react";
import { logger } from "@/lib/logger";
import type { PaginationMetadata } from "@/types/product";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

/**
 * Props for the PaginationControls component.
 */
interface PaginationControlsProps {
  /** Pagination metadata from the API response */
  pagination: PaginationMetadata;

  /** Callback when page number changes */
  onPageChange: (pageNumber: number) => void;

  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void;

  /** Whether controls should be disabled (e.g., during loading) */
  disabled?: boolean;
}

/** Available page size options */
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/**
 * Calculate the range of items displayed on the current page.
 *
 * @param pagination - Pagination metadata
 * @returns Object with startItem and endItem numbers
 */
function calculateItemRange(pagination: PaginationMetadata): { startItem: number; endItem: number } {
  if (pagination.total_count === 0) {
    return { startItem: 0, endItem: 0 };
  }

  const startItem = (pagination.page_number - 1) * pagination.page_size + 1;
  const endItem = Math.min(startItem + pagination.page_size - 1, pagination.total_count);

  return { startItem, endItem };
}

/**
 * Pagination controls component.
 *
 * Usage:
 * ```tsx
 * <PaginationControls
 *   pagination={paginationMetadata}
 *   onPageChange={handlePageChange}
 *   onPageSizeChange={handlePageSizeChange}
 *   disabled={isLoading}
 * />
 * ```
 */
export function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: PaginationControlsProps) {
  const pageSizeSelectId = useId();
  const { startItem, endItem } = calculateItemRange(pagination);

  /**
   * Handle previous page button click.
   */
  const handlePreviousPage = () => {
    if (pagination.has_previous_page && !disabled) {
      const newPageNumber = pagination.page_number - 1;
      logger.info("pagination_previous_clicked", {
        previous_page: pagination.page_number,
        new_page: newPageNumber,
        operation: "pagination_change",
      });
      onPageChange(newPageNumber);
    }
  };

  /**
   * Handle next page button click.
   */
  const handleNextPage = () => {
    if (pagination.has_next_page && !disabled) {
      const newPageNumber = pagination.page_number + 1;
      logger.info("pagination_next_clicked", {
        previous_page: pagination.page_number,
        new_page: newPageNumber,
        operation: "pagination_change",
      });
      onPageChange(newPageNumber);
    }
  };

  /**
   * Handle page size selection change.
   */
  const handlePageSizeSelect = (value: string) => {
    const newPageSize = Number.parseInt(value, 10);
    if (!Number.isNaN(newPageSize) && PAGE_SIZE_OPTIONS.includes(newPageSize as 10 | 25 | 50)) {
      logger.info("pagination_page_size_changed", {
        previous_page_size: pagination.page_size,
        new_page_size: newPageSize,
        operation: "pagination_change",
      });
      onPageSizeChange(newPageSize);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4 border-t mt-6">
      {/* Left section: Page size selector and item range */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <label htmlFor={pageSizeSelectId} className="text-sm text-muted-foreground whitespace-nowrap">
            Items per page:
          </label>
          <Select value={pagination.page_size.toString()} onValueChange={handlePageSizeSelect} disabled={disabled}>
            <SelectTrigger id={pageSizeSelectId} className="w-20" aria-label="Select items per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Item range display */}
        <span className="text-sm text-muted-foreground">
          {pagination.total_count > 0 ? (
            <>
              Showing {startItem}-{endItem} of {pagination.total_count} products
            </>
          ) : (
            "No products to display"
          )}
        </span>
      </div>

      {/* Right section: Navigation controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousPage}
          disabled={disabled || !pagination.has_previous_page}
          aria-label="Go to previous page"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Page indicator */}
        <span className="text-sm text-muted-foreground px-2 min-w-[100px] text-center">
          Page {pagination.page_number} of {pagination.total_pages || 1}
        </span>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={disabled || !pagination.has_next_page}
          aria-label="Go to next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
