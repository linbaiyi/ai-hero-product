from fastapi import APIRouter, HTTPException

from app.clients.llm_client_factory import create_llm_client
from app.schemas.vfx_schema import (
    VfxBreakdownBatchRequest,
    VfxBreakdownRequest,
    VfxDesign,
)
from app.services.vfx_breakdown_service import VfxBreakdownService

router = APIRouter(prefix="/api/vfx", tags=["vfx"])


def get_vfx_breakdown_service() -> VfxBreakdownService:
    return VfxBreakdownService(llm_client=create_llm_client())


@router.post("/breakdown", response_model=VfxDesign)
def breakdown_vfx(req: VfxBreakdownRequest) -> VfxDesign:
    try:
        service = get_vfx_breakdown_service()
        return service.generate_for_skill(req)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail={"message": str(exc)}) from exc


@router.post("/breakdown-batch", response_model=list[VfxDesign])
def breakdown_vfx_batch(req: VfxBreakdownBatchRequest) -> list[VfxDesign]:
    try:
        service = get_vfx_breakdown_service()
        return service.generate_for_skills(req)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail={"message": str(exc)}) from exc
