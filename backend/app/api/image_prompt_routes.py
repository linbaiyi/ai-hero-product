from fastapi import APIRouter, HTTPException

from app.clients.llm_client_factory import create_llm_client
from app.schemas.image_prompt_schema import (
    ImagePromptBatchRequest,
    ImagePromptRequest,
    ImagePromptResult,
)
from app.services.image_prompt_service import ImagePromptService

router = APIRouter(prefix="/api/image-prompts", tags=["image-prompts"])


def get_image_prompt_service() -> ImagePromptService:
    return ImagePromptService(llm_client=create_llm_client())


@router.post("/generate", response_model=ImagePromptResult)
def generate_image_prompt(req: ImagePromptRequest) -> ImagePromptResult:
    try:
        service = get_image_prompt_service()
        return service.generate_for_vfx(req)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail={"message": str(exc)}) from exc


@router.post("/generate-batch", response_model=list[ImagePromptResult])
def generate_image_prompt_batch(
    req: ImagePromptBatchRequest,
) -> list[ImagePromptResult]:
    try:
        service = get_image_prompt_service()
        return service.generate_for_vfx_batch(req)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail={"message": str(exc)}) from exc
