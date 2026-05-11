from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.clients.llm_client_factory import create_llm_client
from app.schemas.playable_schema import HeroPlayableSpec
from app.services.playable_spec_service import (
    PlayableSpecService,
    build_safe_default_spec,
    validate_playable_spec as validate_playable_spec_payload,
)

router = APIRouter(prefix="/api/playable", tags=["playable"])


class PlayableGenerateRequest(BaseModel):
    hero_design: Any
    style: str = Field(default="3d_training_demo")
    complexity: str = Field(default="mvp")


class PlayableGenerateResponse(BaseModel):
    playable_spec: HeroPlayableSpec


class PlayableValidateRequest(BaseModel):
    playable_spec: Any


class PlayableValidateResponse(BaseModel):
    valid: bool
    errors: list[str]


def get_playable_spec_service() -> PlayableSpecService:
    return PlayableSpecService(llm_client=create_llm_client())


@router.post("/generate", response_model=PlayableGenerateResponse)
def generate_playable_spec(req: PlayableGenerateRequest) -> PlayableGenerateResponse:
    try:
        service = get_playable_spec_service()
        return PlayableGenerateResponse(
            playable_spec=service.generate(
                hero_design=req.hero_design,
                style=req.style,
                complexity=req.complexity,
            )
        )
    except (ValueError, RuntimeError) as exc:
        try:
            return PlayableGenerateResponse(
                playable_spec=HeroPlayableSpec.model_validate(build_safe_default_spec(req.hero_design))
            )
        except Exception as fallback_exc:
            raise HTTPException(status_code=500, detail={"message": str(exc)}) from fallback_exc


@router.post("/validate", response_model=PlayableValidateResponse)
def validate_playable_spec_route(req: PlayableValidateRequest) -> PlayableValidateResponse:
    valid, errors = validate_playable_spec_payload(req.playable_spec)
    return PlayableValidateResponse(valid=valid, errors=errors)
