"""
Product API endpoints.

This module defines all HTTP endpoints related to product operations.
Each endpoint delegates business logic to the service layer.
"""

from decimal import Decimal
from math import ceil

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.core.logging_config import StructuredLogger
from app.models.error import ErrorResponse
from app.models.product import PaginationMetadata, Product, ProductListResponse
from app.services import product_service

# Initialize router for product endpoints
router = APIRouter(prefix="/api/products", tags=["products"])

# Initialize structured logger
logger = StructuredLogger(__name__)


@router.get("", response_model=ProductListResponse, responses={400: {"model": ErrorResponse}})
async def get_products(
    min_price_usd: Decimal | None = Query(default=None, ge=0, description="Minimum price in USD (inclusive)"),
    max_price_usd: Decimal | None = Query(default=None, ge=0, description="Maximum price in USD (inclusive)"),
    category: str | None = Query(default=None, description="Filter by product category"),
    search_keyword: str | None = Query(default=None, max_length=100, description="Search in name and description"),
    sort_by: str | None = Query(
        default=None,
        description="Sort order: price_asc, price_desc, name_asc, name_desc, newest",
        pattern="^(price_asc|price_desc|name_asc|name_desc|newest)$",
    ),
    in_stock_only: bool = Query(default=False, description="Show only products with stock available"),
    page_number: int = Query(default=1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(default=10, ge=1, le=100, description="Items per page (10, 25, or 50)"),
) -> ProductListResponse | JSONResponse:
    """
    Get products from the catalog with optional filtering, sorting, and pagination.

    This endpoint returns products matching the provided filter criteria.
    All filter parameters are optional. When no filters are provided,
    all products are returned. Results are paginated with configurable page size.

    Args:
        min_price_usd: Minimum price filter (inclusive)
        max_price_usd: Maximum price filter (inclusive)
        category: Filter by product category (electronics, clothing, home, sports, books)
        search_keyword: Search keyword for product name and description (case-insensitive)
        sort_by: Sort order (price_asc, price_desc, name_asc, name_desc, newest)
        in_stock_only: Show only products with stock available (stock_quantity > 0)
        page_number: Page number (1-based, default: 1)
        page_size: Items per page (10, 25, or 50, default: 10)

    Returns:
        ProductListResponse containing list of filtered products, total count, and pagination metadata

    Raises:
        HTTPException: 400 error if min_price_usd > max_price_usd
        HTTPException: 400 error if page_size is not 10, 25, or 50

    Example Response:
        {
            "products": [
                {
                    "product_id": 1,
                    "product_name": "Wireless Bluetooth Mouse",
                    "product_description": "Ergonomic wireless mouse...",
                    "product_price_usd": "29.99",
                    "product_category": "electronics",
                    "product_stock_quantity": 15
                },
                ...
            ],
            "total_count": 30,
            "pagination": {
                "page_number": 1,
                "page_size": 10,
                "total_count": 30,
                "total_pages": 3,
                "has_previous_page": false,
                "has_next_page": true
            }
        }
    """
    logger.info(
        "api_request_received",
        endpoint="/api/products",
        http_method="GET",
        min_price_usd=str(min_price_usd) if min_price_usd is not None else None,
        max_price_usd=str(max_price_usd) if max_price_usd is not None else None,
        category=category,
        search_keyword=search_keyword,
        sort_by=sort_by,
        in_stock_only=in_stock_only,
        page_number=page_number,
        page_size=page_size,
        operation="get_products",
    )

    # Validate page_size is one of allowed values
    allowed_page_sizes = [10, 25, 50]
    if page_size not in allowed_page_sizes:
        logger.error(
            "validation_failed",
            error_type="invalid_page_size",
            page_size=page_size,
            allowed_values=allowed_page_sizes,
            fix_suggestion="page_size must be one of: 10, 25, 50",
        )
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error_code="invalid_page_size",
                error_message="Page size must be one of: 10, 25, 50",
                error_details={"page_size": page_size, "allowed_values": allowed_page_sizes},
            ).model_dump(),
        )

    # Validate price range
    if min_price_usd is not None and max_price_usd is not None and min_price_usd > max_price_usd:
        logger.error(
            "validation_failed",
            error_type="invalid_price_range",
            min_price_usd=str(min_price_usd),
            max_price_usd=str(max_price_usd),
            fix_suggestion="Ensure min_price_usd <= max_price_usd",
        )
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error_code="invalid_price_range",
                error_message="Minimum price cannot exceed maximum price",
                error_details={"min_price_usd": str(min_price_usd), "max_price_usd": str(max_price_usd)},
            ).model_dump(),
        )

    # Delegate to service layer for filtering, sorting, and pagination
    products, total_count = product_service.filter_products(
        min_price_usd=min_price_usd,
        max_price_usd=max_price_usd,
        category=category,
        search_keyword=search_keyword,
        sort_by=sort_by,
        in_stock_only=in_stock_only,
        page_number=page_number,
        page_size=page_size,
    )

    # Build pagination metadata
    total_pages = ceil(total_count / page_size) if total_count > 0 else 0
    pagination_metadata = PaginationMetadata(
        page_number=page_number,
        page_size=page_size,
        total_count=total_count,
        total_pages=total_pages,
        has_previous_page=page_number > 1,
        has_next_page=page_number < total_pages,
    )

    logger.info(
        "api_response_prepared",
        endpoint="/api/products",
        products_count=len(products),
        total_count=total_count,
        sort_by=sort_by,
        in_stock_only=in_stock_only,
        page_number=page_number,
        page_size=page_size,
        total_pages=total_pages,
        operation="get_products",
    )

    return ProductListResponse(
        products=products,
        total_count=total_count,
        pagination=pagination_metadata,
    )


@router.get("/{product_id}", response_model=Product, responses={404: {"model": ErrorResponse}})
async def get_product_by_id(
    product_id: int,
) -> Product | JSONResponse:
    """
    Get a single product by its ID.

    Args:
        product_id: Unique identifier of the product (must be positive integer)

    Returns:
        Product object with full details

    Raises:
        HTTPException: 404 error if product_id doesn't exist

    Example Response:
        {
            "product_id": 1,
            "product_name": "Wireless Bluetooth Mouse",
            "product_description": "Ergonomic wireless mouse...",
            "product_price_usd": "29.99",
            "product_category": "electronics",
            "product_stock_quantity": 15
        }
    """
    logger.info(
        "api_request_received",
        endpoint=f"/api/products/{product_id}",
        http_method="GET",
        product_id=product_id,
        operation="get_product_by_id",
    )

    product = product_service.get_product_by_id(product_id)

    if product is None:
        logger.warning(
            "product_not_found_api",
            product_id=product_id,
            endpoint=f"/api/products/{product_id}",
            fix_suggestion="Verify product_id exists in the catalog",
        )
        return JSONResponse(
            status_code=404,
            content=ErrorResponse(
                error_code="product_not_found",
                error_message=f"Product with ID {product_id} not found",
                error_details={"product_id": product_id},
            ).model_dump(),
        )

    logger.info(
        "api_response_prepared",
        endpoint=f"/api/products/{product_id}",
        product_id=product_id,
        product_name=product.product_name,
        operation="get_product_by_id",
    )

    return product


@router.get("/{product_id}/related", response_model=ProductListResponse, responses={404: {"model": ErrorResponse}})
async def get_related_products_endpoint(
    product_id: int,
    limit: int = Query(default=4, ge=1, le=10, description="Maximum number of related products to return"),
) -> ProductListResponse | JSONResponse:
    """
    Get related products for a specific product.

    Returns products from the same category as the specified product,
    excluding the product itself.

    Args:
        product_id: ID of the product to find related items for
        limit: Maximum number of related products (1-10, default 4)

    Returns:
        ProductListResponse with related products

    Raises:
        HTTPException: 404 if product_id doesn't exist
    """
    logger.info(
        "api_request_received",
        endpoint=f"/api/products/{product_id}/related",
        http_method="GET",
        product_id=product_id,
        limit=limit,
        operation="get_related_products",
    )

    # Verify the product exists
    product = product_service.get_product_by_id(product_id)
    if product is None:
        logger.warning(
            "product_not_found_api",
            product_id=product_id,
            endpoint=f"/api/products/{product_id}/related",
            fix_suggestion="Verify product_id exists before requesting related products",
        )
        return JSONResponse(
            status_code=404,
            content=ErrorResponse(
                error_code="product_not_found",
                error_message=f"Product with ID {product_id} not found",
                error_details={"product_id": product_id},
            ).model_dump(),
        )

    related_products = product_service.get_related_products(product_id, limit)

    logger.info(
        "api_response_prepared",
        endpoint=f"/api/products/{product_id}/related",
        product_id=product_id,
        related_products_count=len(related_products),
        operation="get_related_products",
    )

    return ProductListResponse(products=related_products, total_count=len(related_products))
