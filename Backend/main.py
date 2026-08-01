from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from api.routes import router

app = FastAPI(
    title="PODCAST AI API",
    version="1.0"
)
app.include_router(router)

app.mount(
    "/images", StaticFiles(directory="../AI/images"), name="images"
)

@app.get("/")
def home():
    return {
        "message": "PODCAST AI Server Running"
    }