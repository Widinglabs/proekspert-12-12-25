"""
Product API endpoints.

This module defines all HTTP endpoints related to product operations.
Each endpoint delegates business logic to the service layer.
"""

from decimal import Decimal

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.models.product import ProductListResponse
from app.models.error import ErrorResponse
from app.services import product_service
from app.core.logging_config import StructuredLogger

# Initialize router for product endpoints
router = APIRouter(prefix="/api/products", tags=["products"])

# Initialize structured logger
logger = StructuredLogger(__name__)


@router.get("", response_model=ProductListResponse)
async def get_products(
    min_price_usd: Decimal | None = Query(default=None, ge=0),
    max_price_usd: Decimal | None = Query(default=None, ge=0),
    category: str | None = Query(default=None),
    search_keyword: str | None = Query(default=None),
) -> ProductListResponse | JSONResponse:
    """
    Get products from the catalog with optional filtering.

    Args:
        min_price_usd: Minimum price filter (inclusive)
        max_price_usd: Maximum price filter (inclusive)
        category: Filter by product category
        search_keyword: Search in product name or description (case-insensitive)

    Returns:
        ProductListResponse containing filtered products and total count

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
            "total_count": 30
        }
    """
    logger.info(
        "api_request_received",
        endpoint="/api/products",
        http_method="GET",
        min_price_usd=str(min_price_usd) if min_price_usd else None,
        max_price_usd=str(max_price_usd) if max_price_usd else None,
        category=category,
        search_keyword=search_keyword,
        operation="get_products"
    )

    # Validate price range
    if min_price_usd is not None and max_price_usd is not None:
        if min_price_usd > max_price_usd:
            logger.info(
                "invalid_price_range",
                min_price_usd=str(min_price_usd),
                max_price_usd=str(max_price_usd),
                operation="get_products"
            )
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error_code="invalid_price_range",
                    error_message="Minimum price cannot exceed maximum price",
                    error_details={
                        "min_price_usd": str(min_price_usd),
                        "max_price_usd": str(max_price_usd),
                    },
                ).model_dump(),
            )

    # Delegate to service layer for business logic
    products = product_service.filter_products(
        min_price_usd=min_price_usd,
        max_price_usd=max_price_usd,
        category=category,
        search_keyword=search_keyword,
    )

    logger.info(
        "api_response_prepared",
        endpoint="/api/products",
        products_count=len(products),
        operation="get_products"
    )

    return ProductListResponse(
        products=products,
        total_count=len(products)
    )
