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
    sort_by: str | None = None,
    in_stock_only: bool = False,
    page_number: int = 1,
    page_size: int = 10,
) -> tuple[list[Product], int]:
    """
    Filter, sort, and paginate products based on the provided criteria.

    All filter parameters are optional. When multiple parameters are provided,
    they are combined with AND logic (all conditions must match). Sorting is
    applied after filtering, and pagination is applied last.

    Args:
        min_price_usd: Minimum price filter (inclusive). Products with price >= this value.
        max_price_usd: Maximum price filter (inclusive). Products with price <= this value.
        category: Filter by product category (exact match).
        search_keyword: Search in product name and description (case-insensitive).
        sort_by: Sort order for results. Options: price_asc, price_desc, name_asc, name_desc, newest.
        in_stock_only: If True, filter to products with stock_quantity > 0.
        page_number: Page number (1-based, default: 1).
        page_size: Number of items per page (default: 10).

    Returns:
        Tuple of (paginated_products, total_count) where:
        - paginated_products: List of Product objects for the requested page
        - total_count: Total number of products matching filter criteria (across all pages)

    Example:
        >>> products, total = filter_products(category="electronics", sort_by="price_asc", page_number=1, page_size=10)
        >>> all(p.product_category == "electronics" for p in products)
        True
        >>> len(products) <= 10
        True
    """
    logger.info(
        "filtering_products_started",
        min_price_usd=str(min_price_usd) if min_price_usd is not None else None,
        max_price_usd=str(max_price_usd) if max_price_usd is not None else None,
        category=category,
        search_keyword=search_keyword,
        sort_by=sort_by,
        in_stock_only=in_stock_only,
        page_number=page_number,
        page_size=page_size,
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

    # Filter by stock availability if requested
    if in_stock_only:
        results = [product for product in results if product.product_stock_quantity > 0]

    # Apply sorting if requested
    if sort_by == "price_asc":
        results.sort(key=lambda p: p.product_price_usd)
    elif sort_by == "price_desc":
        results.sort(key=lambda p: p.product_price_usd, reverse=True)
    elif sort_by == "name_asc":
        results.sort(key=lambda p: p.product_name.lower())
    elif sort_by == "name_desc":
        results.sort(key=lambda p: p.product_name.lower(), reverse=True)
    elif sort_by == "newest":
        results.sort(key=lambda p: p.product_id, reverse=True)
    # If sort_by is None or unrecognized, keep default order

    # Calculate total count before pagination
    total_count = len(results)

    # Apply pagination
    offset = (page_number - 1) * page_size
    paginated_results = results[offset : offset + page_size]

    logger.info(
        "filtering_products_completed",
        total_results=total_count,
        returned_count=len(paginated_results),
        sort_by=sort_by,
        in_stock_only=in_stock_only,
        page_number=page_number,
        page_size=page_size,
        operation="filter_products",
    )

    return paginated_results, total_count


def get_product_by_id(product_id: int) -> Product | None:
    """
    Retrieve a single product by its ID.

    Args:
        product_id: Unique identifier of the product to retrieve

    Returns:
        Product object if found, None if product_id doesn't exist

    Example:
        >>> product = get_product_by_id(1)
        >>> product.product_name
        'Wireless Bluetooth Mouse'
    """
    logger.info("retrieving_product_by_id", product_id=product_id, operation="get_product_by_id")

    for product in _PRODUCTS_DATABASE:
        if product.product_id == product_id:
            logger.info("product_found", product_id=product_id, product_name=product.product_name)
            return product

    logger.warning("product_not_found", product_id=product_id)
    return None


def get_related_products(product_id: int, limit: int = 4) -> list[Product]:
    """
    Get related products based on category.

    Returns products from the same category as the specified product,
    excluding the product itself. Results are limited to avoid overwhelming UI.

    Args:
        product_id: ID of the product to find related items for
        limit: Maximum number of related products to return (default 4)

    Returns:
        List of Product objects from same category (excluding current product)

    Example:
        >>> related = get_related_products(1, limit=3)
        >>> all(p.product_category == "electronics" for p in related)
        True
        >>> all(p.product_id != 1 for p in related)
        True
    """
    logger.info("finding_related_products", product_id=product_id, limit=limit)

    current_product = get_product_by_id(product_id)
    if current_product is None:
        logger.warning("related_products_base_not_found", product_id=product_id)
        return []

    results = [
        product
        for product in _PRODUCTS_DATABASE
        if product.product_category == current_product.product_category and product.product_id != product_id
    ][:limit]

    logger.info(
        "related_products_found",
        product_id=product_id,
        category=current_product.product_category,
        count=len(results),
    )

    return results
