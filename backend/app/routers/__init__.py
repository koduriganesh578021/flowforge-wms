from fastapi import APIRouter

from app.routers.analytics import router as analytics_router
from app.routers.events import router as events_router
from app.routers.exceptions import router as exceptions_router
from app.routers.health import router as health_router
from app.routers.orders import router as orders_router
from app.routers.inventory import router as inventory_router
from app.routers.simulator import router as simulator_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(orders_router, tags=["orders"])
api_router.include_router(inventory_router, tags=["inventory"])
api_router.include_router(events_router, tags=["events"])
api_router.include_router(exceptions_router, tags=["exceptions"])
api_router.include_router(simulator_router, tags=["simulator"])
api_router.include_router(analytics_router, tags=["analytics"])

