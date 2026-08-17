from fastapi import APIRouter

from app.routers.events import router as events_router
from app.routers.health import router as health_router
from app.routers.orders import router as orders_router
from app.routers.inventory import router as inventory_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(orders_router, tags=["orders"])
api_router.include_router(inventory_router, tags=["inventory"])
api_router.include_router(events_router, tags=["events"])

