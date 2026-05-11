from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.api.project_routes import get_project_repository
from app.schemas.export_schema import ExportProjectRequest, ExportProjectResult
from app.services.project_export_service import ProjectExportService
from app.storage.file_storage import get_export_file_path, sanitize_project_id
from app.storage.project_repository import ProjectRepository

router = APIRouter(prefix="/api/projects", tags=["project-export"])


def get_project_export_service(
    repository: ProjectRepository = Depends(get_project_repository),
) -> ProjectExportService:
    return ProjectExportService(repository)


@router.post("/{project_id}/export", response_model=ExportProjectResult)
def export_project(
    project_id: str,
    req: ExportProjectRequest,
    service: ProjectExportService = Depends(get_project_export_service),
) -> ExportProjectResult:
    try:
        result = service.export_project(project_id, req)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"message": "项目不存在"}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc

    if not result.success:
        raise HTTPException(status_code=500, detail={"message": result.error_message})

    return result


@router.get("/{project_id}/export/download")
def download_export(project_id: str) -> FileResponse:
    safe_project_id = sanitize_project_id(project_id)
    try:
        export_path = get_export_file_path(safe_project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc

    if not export_path.exists():
        raise HTTPException(status_code=404, detail={"message": "导出文件不存在"})

    return FileResponse(
        export_path,
        media_type="application/zip",
        filename=export_path.name,
    )
