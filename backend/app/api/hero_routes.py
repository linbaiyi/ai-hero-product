from fastapi import APIRouter, HTTPException

from app.clients.llm_client_factory import create_llm_client
from app.schemas.hero_schema import HeroDesign
from app.schemas.request_schema import HeroGenerateRequest
from app.services.hero_generation_service import HeroGenerationService

router = APIRouter(prefix="/api/hero", tags=["hero"])


def get_hero_generation_service() -> HeroGenerationService:
    return HeroGenerationService(llm_client=create_llm_client())


@router.post("/generate", response_model=HeroDesign)
def generate_hero(req: HeroGenerateRequest) -> HeroDesign:
    try:
        service = get_hero_generation_service()
        return service.generate(req)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail={"message": str(exc)}) from exc
