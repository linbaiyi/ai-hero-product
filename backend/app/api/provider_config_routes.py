from fastapi import APIRouter, HTTPException

from app.schemas.provider_config_schema import (
    ProviderConnectionTestResponse,
    ProviderConfigResponse,
    ProviderConfigUpdateRequest,
    ProviderModelListResponse,
    ProviderProbeRequest,
)
from app.services.provider_config_service import (
    get_provider_config,
    list_provider_models,
    test_provider_connection,
    update_provider_config,
)

router = APIRouter(prefix="/api/provider-config", tags=["provider-config"])


@router.get("", response_model=ProviderConfigResponse)
def read_provider_config() -> ProviderConfigResponse:
    try:
        return get_provider_config()
    except ValueError as exc:
        raise HTTPException(status_code=500, detail={"message": str(exc)}) from exc


@router.put("", response_model=ProviderConfigResponse)
def save_provider_config(
    request: ProviderConfigUpdateRequest,
) -> ProviderConfigResponse:
    try:
        return update_provider_config(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc


@router.post("/models", response_model=ProviderModelListResponse)
def read_provider_models(request: ProviderProbeRequest) -> ProviderModelListResponse:
    try:
        return list_provider_models(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail={"message": str(exc)}) from exc


@router.post("/test", response_model=ProviderConnectionTestResponse)
def test_provider(request: ProviderProbeRequest) -> ProviderConnectionTestResponse:
    try:
        return test_provider_connection(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail={"message": str(exc)}) from exc
