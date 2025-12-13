"""
Sample review data for the product catalog.

This module contains 18 sample reviews across various products to provide
realistic test data for the review API. Reviews spread across 6 products
with varying ratings from 1-5 stars.
"""

from datetime import UTC, datetime, timedelta

from app.models.review import Review


def get_seed_reviews() -> list[Review]:
    """
    Return a list of sample reviews for the catalog.

    The reviews are spread across multiple products with a range of ratings
    and some with/without review text. Timestamps are varied over the past 30 days.

    Returns:
        List of Review objects ready to use in the API

    Example:
        >>> reviews = get_seed_reviews()
        >>> len(reviews)
        18
        >>> reviews[0].review_rating in (1, 2, 3, 4, 5)
        True
    """
    now = datetime.now(UTC)

    return [
        # Product 1: Wireless Bluetooth Mouse (5 reviews)
        Review(
            review_id=1,
            product_id=1,
            user_name="Alice Johnson",
            review_rating=5,
            review_text="Amazing wireless mouse! Very comfortable for long work sessions and the battery life is excellent. Highly recommend for anyone looking for a reliable mouse.",
            review_timestamp_utc=now - timedelta(days=25),
            review_helpful_count=8,
        ),
        Review(
            review_id=2,
            product_id=1,
            user_name="Bob Smith",
            review_rating=4,
            review_text="Good mouse overall. Responsive and pairs easily with my laptop. Only minor complaint is the scroll wheel could be smoother. Still worth the price.",
            review_timestamp_utc=now - timedelta(days=20),
            review_helpful_count=3,
        ),
        Review(
            review_id=3,
            product_id=1,
            user_name="Carol Davis",
            review_rating=5,
            review_text=None,
            review_timestamp_utc=now - timedelta(days=15),
            review_helpful_count=1,
        ),
        Review(
            review_id=4,
            product_id=1,
            user_name="David Wilson",
            review_rating=3,
            review_text="Decent mouse for the price. It works as advertised but nothing special. The ergonomics are okay but I expected better grip material at this price point.",
            review_timestamp_utc=now - timedelta(days=8),
            review_helpful_count=2,
        ),
        Review(
            review_id=5,
            product_id=1,
            user_name="Emma Brown",
            review_rating=4,
            review_text=None,
            review_timestamp_utc=now - timedelta(days=3),
            review_helpful_count=0,
        ),
        # Product 2: Mechanical Gaming Keyboard (3 reviews)
        Review(
            review_id=6,
            product_id=2,
            user_name="Frank Miller",
            review_rating=5,
            review_text="Best gaming keyboard I have ever owned! The RGB lighting is beautiful and the blue switches have the perfect tactile feel. Great for both gaming and typing.",
            review_timestamp_utc=now - timedelta(days=22),
            review_helpful_count=12,
        ),
        Review(
            review_id=7,
            product_id=2,
            user_name="Grace Lee",
            review_rating=4,
            review_text="Love the keyboard but it is quite loud with the blue switches. If you work in a quiet office, you might want to consider a quieter option. Quality is top notch though.",
            review_timestamp_utc=now - timedelta(days=14),
            review_helpful_count=6,
        ),
        Review(
            review_id=8,
            product_id=2,
            user_name="Henry Chen",
            review_rating=5,
            review_text=None,
            review_timestamp_utc=now - timedelta(days=5),
            review_helpful_count=0,
        ),
        # Product 9: Classic Cotton T-Shirt (3 reviews)
        Review(
            review_id=9,
            product_id=9,
            user_name="Isabella Garcia",
            review_rating=5,
            review_text="Super soft organic cotton! I have washed it multiple times and it still holds its shape. The fit is perfect and the color has not faded at all. Ordering more!",
            review_timestamp_utc=now - timedelta(days=28),
            review_helpful_count=5,
        ),
        Review(
            review_id=10,
            product_id=9,
            user_name="Jack Thompson",
            review_rating=4,
            review_text=None,
            review_timestamp_utc=now - timedelta(days=18),
            review_helpful_count=1,
        ),
        Review(
            review_id=11,
            product_id=9,
            user_name="Karen Martinez",
            review_rating=3,
            review_text="T-shirt is fine but runs a bit small. I would recommend ordering one size up. The cotton quality is good but sizing is inconsistent with other brands I own.",
            review_timestamp_utc=now - timedelta(days=10),
            review_helpful_count=4,
        ),
        # Product 16: Stainless Steel French Press (4 reviews)
        Review(
            review_id=12,
            product_id=16,
            user_name="Liam Anderson",
            review_rating=5,
            review_text="Makes the best coffee! The double wall insulation keeps coffee hot for hours. Build quality is excellent and it is easy to clean. A must have for coffee lovers.",
            review_timestamp_utc=now - timedelta(days=26),
            review_helpful_count=9,
        ),
        Review(
            review_id=13,
            product_id=16,
            user_name="Mia Robinson",
            review_rating=5,
            review_text=None,
            review_timestamp_utc=now - timedelta(days=19),
            review_helpful_count=2,
        ),
        Review(
            review_id=14,
            product_id=16,
            user_name="Noah Jackson",
            review_rating=4,
            review_text="Great French press with excellent heat retention. The only downside is that the filter could be finer to catch more grounds, but overall very happy with the purchase.",
            review_timestamp_utc=now - timedelta(days=11),
            review_helpful_count=3,
        ),
        Review(
            review_id=15,
            product_id=16,
            user_name="Olivia White",
            review_rating=2,
            review_text="Disappointed with this purchase. The lid does not seal properly and coffee grounds get into my cup. Returning it. Maybe I got a defective unit but not taking the risk again.",
            review_timestamp_utc=now - timedelta(days=4),
            review_helpful_count=7,
        ),
        # Product 28: The Pragmatic Programmer (2 reviews)
        Review(
            review_id=16,
            product_id=28,
            user_name="Peter Taylor",
            review_rating=5,
            review_text="Essential reading for any software developer! The tips and practices in this book are timeless. I find myself referring back to it regularly even after years of experience.",
            review_timestamp_utc=now - timedelta(days=29),
            review_helpful_count=15,
        ),
        Review(
            review_id=17,
            product_id=28,
            user_name="Quinn Adams",
            review_rating=5,
            review_text="Changed how I think about programming. The pragmatic approach and practical advice have improved my code quality significantly. Worth every penny and highly recommend.",
            review_timestamp_utc=now - timedelta(days=12),
            review_helpful_count=8,
        ),
        # Product 23: Yoga Mat with Carrying Strap (1 review)
        Review(
            review_id=18,
            product_id=23,
            user_name="Rachel Moore",
            review_rating=4,
            review_text="Good quality yoga mat with nice thickness. The alignment marks are helpful for beginners. The carrying strap is a nice addition but could be sturdier.",
            review_timestamp_utc=now - timedelta(days=7),
            review_helpful_count=2,
        ),
    ]


# In-memory database for reviews - initialized once
_REVIEWS_DATABASE: list[Review] = get_seed_reviews()
