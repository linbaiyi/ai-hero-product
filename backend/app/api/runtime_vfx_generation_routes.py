from fastapi import APIRouter, HTTPException

from app.schemas.runtime_vfx_generation_schema import (
    RuntimeVfxGenerationRequest,
    RuntimeVfxGenerationResponse,
)
from app.services.runtime_vfx_generation_service import RuntimeVfxGenerationService

router = APIRouter(prefix="/api/runtime-vfx", tags=["runtime-vfx"])


@router.post("/generate", response_model=RuntimeVfxGenerationResponse)
def generate_runtime_vfx_textures(
    request: RuntimeVfxGenerationRequest,
) -> RuntimeVfxGenerationResponse:
    try:
        return RuntimeVfxGenerationService().generate(request)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail={"message": str(exc)}) from exc
