"""
Main FastAPI application entry point.

This module initializes the FastAPI app, configures middleware,
sets up logging, and registers all API routers.
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logging_config import setup_logging, StructuredLogger
from app.api import products

# Configure structured JSON logging
setup_logging(log_level=settings.log_level)

# Initialize logger for this module
logger = StructuredLogger(__name__)


@asynccontextmanager
async def application_lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Manage application lifespan events (startup and shutdown).

    This context manager handles initialization on startup and cleanup on shutdown,
    logging both events for monitoring and debugging purposes.

    Args:
        app: The FastAPI application instance

    Yields:
        None: Control flow during application runtime
    """
    # Startup: Log application initialization
    logger.info(
        "application_startup",
        application_name=settings.application_name,
        application_version=settings.application_version,
        log_level=settings.log_level,
        cors_enabled=settings.enable_cors,
    )

    yield

    # Shutdown: Log application termination
    logger.info("application_shutdown", application_name=settings.application_name)


# Create FastAPI application instance with lifespan handler
app = FastAPI(
    title=settings.application_name,
    version=settings.application_version,
    description="E-commerce product catalog API with filtering and search capabilities",
    lifespan=application_lifespan,
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Custom exception handler for HTTPException.

    If the detail is a dictionary (e.g., from ErrorResponse.model_dump()),
    return it directly instead of wrapping it in a 'detail' field.

    Args:
        request: The incoming request
        exc: The HTTPException that was raised

    Returns:
        JSONResponse with the error details
    """
    if isinstance(exc.detail, dict):
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail
        )
    else:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )


# Configure CORS (Cross-Origin Resource Sharing) if enabled
if settings.enable_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, specify exact origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("cors_middleware_enabled", allow_origins="*", allow_methods="*")

# Register API routers
app.include_router(products.router)
logger.info("api_router_registered", router_prefix="/api/products", router_tag="products")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint for monitoring and load balancers.

    Returns:
        Dictionary with status indicating the application is running

    Example Response:
        {"status": "healthy"}
    """
    logger.info("health_check_request", endpoint="/health")

    return {"status": "healthy"}
