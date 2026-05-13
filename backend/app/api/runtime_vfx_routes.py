from fastapi import APIRouter

from app.schemas.runtime_vfx_prompt_schema import (
    RuntimeVfxPromptRequest,
    RuntimeVfxPromptResponse,
)
from app.services.runtime_vfx_prompt_service import RuntimeVfxPromptService

router = APIRouter(prefix="/api/runtime-vfx", tags=["runtime-vfx"])


@router.post("/prompts", response_model=RuntimeVfxPromptResponse)
def generate_runtime_vfx_prompts(
    request: RuntimeVfxPromptRequest,
) -> RuntimeVfxPromptResponse:
    return RuntimeVfxPromptService().generate_prompts(request)
