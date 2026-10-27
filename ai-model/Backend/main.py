from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router

IMAGE_DIR = Path(__file__).resolve().parents[2] / "static" / "assets" / "img"
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="PODCAST AI API",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

app.mount(
    "/images", StaticFiles(directory=str(IMAGE_DIR)), name="images"
)

@app.get("/")
def home():
    return {
        "message": "PODCAST AI Server Running"
    }
