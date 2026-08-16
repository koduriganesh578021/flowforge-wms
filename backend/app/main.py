from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import Base, engine
from app.routers import api_router

# Ensure model metadata is loaded before create_all.
from app import models  # noqa: F401


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="FlowForge WMS Backend", version="0.1.0", lifespan=lifespan)
app.include_router(api_router)

