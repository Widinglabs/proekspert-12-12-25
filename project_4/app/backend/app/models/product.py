"""Product data models for the e-commerce catalog API."""

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

# Define valid product categories as a type alias for reusability
ProductCategory = Literal["electronics", "clothing", "home", "sports", "books"]

# Define valid sort options for product listing
SortOrder = Literal["price_asc", "price_desc", "name_asc", "name_desc", "newest"]


class Product(BaseModel):
    """
    Represents a single product in the e-commerce catalog.

    This model uses verbose, intention-revealing names to make it easy for AI
    and humans to understand. All fields use the `product_` prefix for clarity.

    Attributes:
        product_id: Unique identifier for the product
        product_name: Display name of the product
        product_description: Detailed description of the product
        product_price_usd: Price in US dollars (uses Decimal for precision)
        product_category: One of the predefined product categories
        product_in_stock: Whether the product is currently available

    Examples:
        >>> Product(
        ...     product_id=1,
        ...     product_name="Wireless Mouse",
        ...     product_description="Ergonomic wireless mouse with USB receiver",
        ...     product_price_usd=Decimal("29.99"),
        ...     product_category="electronics",
        ...     product_in_stock=True
        ... )
    """

    product_id: int = Field(..., description="Unique product identifier", gt=0, examples=[1, 42, 1337])

    product_name: str = Field(
        ...,
        description="Display name of the product",
        min_length=1,
        max_length=200,
        examples=["Wireless Mouse", "Cotton T-Shirt", "Coffee Maker"],
    )

    product_description: str = Field(
        ...,
        description="Detailed description of the product features and specifications",
        min_length=1,
        max_length=1000,
        examples=["Ergonomic wireless mouse with USB receiver and long battery life"],
    )

    product_price_usd: Decimal = Field(
        ...,
        description="Product price in US dollars (uses Decimal for monetary precision)",
        gt=0,
        decimal_places=2,
        examples=["29.99", "199.99", "9.99"],
    )

    product_category: ProductCategory = Field(
        ...,
        description="Product category, must be one of the predefined categories",
        examples=["electronics", "clothing", "home", "sports", "books"],
    )

    product_in_stock: bool = Field(default=True, description="Whether the product is currently available for purchase")


class PaginationMetadata(BaseModel):
    """
    Pagination metadata for paginated API responses.

    Provides all information needed for clients to navigate paginated results,
    including current position and available navigation options.

    Attributes:
        page_number: Current page number (1-based indexing)
        page_size: Number of items per page
        total_count: Total number of items across all pages
        total_pages: Total number of pages
        has_previous_page: Whether a previous page exists
        has_next_page: Whether a next page exists

    Examples:
        >>> PaginationMetadata(
        ...     page_number=2,
        ...     page_size=10,
        ...     total_count=30,
        ...     total_pages=3,
        ...     has_previous_page=True,
        ...     has_next_page=True
        ... )
    """

    page_number: int = Field(..., description="Current page number (1-based)", ge=1)

    page_size: int = Field(..., description="Number of items per page", ge=1)

    total_count: int = Field(..., description="Total number of items across all pages", ge=0)

    total_pages: int = Field(..., description="Total number of pages", ge=0)

    has_previous_page: bool = Field(..., description="Whether a previous page exists")

    has_next_page: bool = Field(..., description="Whether a next page exists")


class ProductListResponse(BaseModel):
    """
    Response model for endpoints that return a paginated list of products.

    Using a wrapper object (instead of returning a raw list) makes the API
    more extensible - we can easily add metadata like total_count, pagination,
    etc. in the future without breaking changes.

    Attributes:
        products: List of product objects for the current page
        total_count: Total number of products matching criteria (across all pages)
        pagination: Pagination metadata for navigation

    Examples:
        >>> ProductListResponse(
        ...     products=[product1, product2, product3],
        ...     total_count=30,
        ...     pagination=PaginationMetadata(
        ...         page_number=1,
        ...         page_size=10,
        ...         total_count=30,
        ...         total_pages=3,
        ...         has_previous_page=False,
        ...         has_next_page=True
        ...     )
        ... )
    """

    products: list[Product] = Field(..., description="List of products for current page")

    total_count: int = Field(..., description="Total number of products matching criteria", ge=0)

    pagination: PaginationMetadata = Field(..., description="Pagination metadata")


class ProductFilterParameters(BaseModel):
    """
    Query parameters for filtering products in the catalog.

    All parameters are optional. When multiple parameters are provided,
    they are combined with AND logic (all conditions must match).

    Attributes:
        min_price_usd: Minimum price filter (inclusive)
        max_price_usd: Maximum price filter (inclusive)
        category: Filter by product category
        search_keyword: Search in product name and description (case-insensitive)

    Examples:
        >>> ProductFilterParameters(
        ...     min_price_usd=Decimal("25.00"),
        ...     max_price_usd=Decimal("100.00"),
        ...     category="electronics"
        ... )
    """

    min_price_usd: Decimal | None = Field(
        default=None,
        ge=0,
        description="Minimum price in USD (inclusive)",
        examples=["10.00", "25.00", "100.00"],
    )

    max_price_usd: Decimal | None = Field(
        default=None,
        ge=0,
        description="Maximum price in USD (inclusive)",
        examples=["50.00", "100.00", "500.00"],
    )

    category: ProductCategory | None = Field(
        default=None,
        description="Filter by product category",
        examples=["electronics", "clothing", "home"],
    )

    search_keyword: str | None = Field(
        default=None,
        max_length=100,
        description="Search keyword for product name and description (case-insensitive)",
        examples=["wireless", "cotton", "smart"],
    )

    sort_by: SortOrder | None = Field(
        default=None,
        description="Sort order for results (price_asc, price_desc, name_asc, name_desc, newest)",
        examples=["price_asc", "name_desc", "newest"],
    )
