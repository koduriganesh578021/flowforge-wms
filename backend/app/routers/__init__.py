from fastapi import APIRouter

from app.routers.health import router as health_router
from app.routers.orders import router as orders_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(orders_router, tags=["orders"])

