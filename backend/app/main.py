from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.board_routes import router as board_router
from app.api.export_routes import router as export_router
from app.api.file_routes import router as file_router
from app.api.hero_routes import router as hero_router
from app.api.image_routes import router as image_router
from app.api.image_prompt_routes import router as image_prompt_router
from app.api.playable_routes import router as playable_router
from app.api.project_routes import router as project_router
from app.api.vfx_routes import router as vfx_router
from app.config import settings

app = FastAPI(title=settings.app_name, version=settings.app_version)

# Development CORS is limited to local Vite origins. Production should tighten
# this list to the packaged desktop app or trusted frontend origins only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hero_router)
app.include_router(image_router)
app.include_router(image_prompt_router)
app.include_router(vfx_router)
app.include_router(file_router)
app.include_router(board_router)
app.include_router(export_router)
app.include_router(project_router)
app.include_router(playable_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-game-hero-designer-backend",
        "version": settings.app_version,
    }
