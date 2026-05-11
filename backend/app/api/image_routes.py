from fastapi import APIRouter, HTTPException

from app.clients.image_client_factory import create_image_client
from app.schemas.image_generation_schema import (
    ImageGenerationBatchRequest,
    ImageGenerationRequest,
    ImageGenerationResult,
)
from app.services.image_generation_service import ImageGenerationService

router = APIRouter(prefix="/api/images", tags=["images"])


def get_image_generation_service() -> ImageGenerationService:
    return ImageGenerationService(image_client=create_image_client())


@router.post("/generate", response_model=ImageGenerationResult)
def generate_image(req: ImageGenerationRequest) -> ImageGenerationResult:
    try:
        service = get_image_generation_service()
        return service.generate_for_prompt(req)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail={"message": str(exc)}) from exc


@router.post("/generate-batch", response_model=list[ImageGenerationResult])
def generate_image_batch(
    req: ImageGenerationBatchRequest,
) -> list[ImageGenerationResult]:
    try:
        service = get_image_generation_service()
        return service.generate_for_prompt_batch(req)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail={"message": str(exc)}) from exc
