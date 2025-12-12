"""
Product API endpoints.

This module defines all HTTP endpoints related to product operations.
Each endpoint delegates business logic to the service layer.
"""

from decimal import Decimal

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.core.logging_config import StructuredLogger
from app.models.error import ErrorResponse
from app.models.product import ProductListResponse
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
) -> ProductListResponse | JSONResponse:
    """
    Get products from the catalog with optional filtering.

    This endpoint returns products matching the provided filter criteria.
    All filter parameters are optional. When no filters are provided,
    all products are returned.

    Args:
        min_price_usd: Minimum price filter (inclusive)
        max_price_usd: Maximum price filter (inclusive)
        category: Filter by product category (electronics, clothing, home, sports, books)
        search_keyword: Search keyword for product name and description (case-insensitive)
        sort_by: Sort order (price_asc, price_desc, name_asc, name_desc, newest)

    Returns:
        ProductListResponse containing list of filtered products and total count

    Raises:
        HTTPException: 400 error if min_price_usd > max_price_usd

    Example Response:
        {
            "products": [
                {
                    "product_id": 1,
                    "product_name": "Wireless Bluetooth Mouse",
                    "product_description": "Ergonomic wireless mouse...",
                    "product_price_usd": "29.99",
                    "product_category": "electronics",
                    "product_in_stock": true
                },
                ...
            ],
            "total_count": 8
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
        operation="get_products",
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

    # Delegate to service layer for filtering and sorting
    products = product_service.filter_products(
        min_price_usd=min_price_usd,
        max_price_usd=max_price_usd,
        category=category,
        search_keyword=search_keyword,
        sort_by=sort_by,
    )

    logger.info(
        "api_response_prepared",
        endpoint="/api/products",
        products_count=len(products),
        sort_by=sort_by,
        operation="get_products",
    )

    return ProductListResponse(products=products, total_count=len(products))
