"""
Product service containing business logic for product operations.

This service layer separates business logic from API routing logic,
making the code more testable and maintainable.
"""

from decimal import Decimal

from app.core.logging_config import StructuredLogger
from app.data.seed_products import get_seed_products
from app.models.product import Product

# Initialize structured logger for this module
logger = StructuredLogger(__name__)

# In-memory product storage (in a real app, this would be a database)
_PRODUCTS_DATABASE: list[Product] = get_seed_products()


def get_all_products() -> list[Product]:
    """
    Retrieve all products from the catalog.

    This function returns all available products without any filtering.
    It logs the operation for debugging and monitoring purposes.

    Returns:
        List of all Product objects in the catalog

    Example:
        >>> products = get_all_products()
        >>> len(products)
        30
        >>> products[0].product_name
        'Wireless Bluetooth Mouse'
    """
    logger.info(
        "retrieving_all_products", total_products_in_database=len(_PRODUCTS_DATABASE), operation="get_all_products"
    )

    logger.info(
        "products_retrieved_successfully", products_returned=len(_PRODUCTS_DATABASE), operation="get_all_products"
    )

    return _PRODUCTS_DATABASE


def filter_products(
    min_price_usd: Decimal | None = None,
    max_price_usd: Decimal | None = None,
    category: str | None = None,
    search_keyword: str | None = None,
) -> list[Product]:
    """
    Filter products based on the provided criteria.

    All filter parameters are optional. When multiple parameters are provided,
    they are combined with AND logic (all conditions must match).

    Args:
        min_price_usd: Minimum price filter (inclusive). Products with price >= this value.
        max_price_usd: Maximum price filter (inclusive). Products with price <= this value.
        category: Filter by product category (exact match).
        search_keyword: Search in product name and description (case-insensitive).

    Returns:
        List of Product objects matching all provided filter criteria.

    Example:
        >>> products = filter_products(category="electronics", min_price_usd=Decimal("20.00"))
        >>> all(p.product_category == "electronics" for p in products)
        True
        >>> all(p.product_price_usd >= Decimal("20.00") for p in products)
        True
    """
    logger.info(
        "filtering_products_started",
        min_price_usd=str(min_price_usd) if min_price_usd is not None else None,
        max_price_usd=str(max_price_usd) if max_price_usd is not None else None,
        category=category,
        search_keyword=search_keyword,
        operation="filter_products",
    )

    # Start with all products
    results = list(_PRODUCTS_DATABASE)

    # Apply minimum price filter
    if min_price_usd is not None:
        results = [product for product in results if product.product_price_usd >= min_price_usd]

    # Apply maximum price filter
    if max_price_usd is not None:
        results = [product for product in results if product.product_price_usd <= max_price_usd]

    # Apply category filter
    if category is not None:
        results = [product for product in results if product.product_category == category]

    # Apply keyword search (case-insensitive search in name and description)
    if search_keyword is not None:
        keyword_lower = search_keyword.lower()
        results = [
            product
            for product in results
            if keyword_lower in product.product_name.lower() or keyword_lower in product.product_description.lower()
        ]

    logger.info(
        "filtering_products_completed",
        total_results=len(results),
        operation="filter_products",
    )

    return results
