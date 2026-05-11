from fastapi import APIRouter, Depends, HTTPException

from app.schemas.project_schema import (
    ProjectListResponse,
    ProjectRecord,
    ProjectSaveRequest,
)
from app.storage.project_repository import ProjectRepository

router = APIRouter(prefix="/api/projects", tags=["projects"])


def get_project_repository() -> ProjectRepository:
    return ProjectRepository()


@router.post("/save", response_model=ProjectRecord)
def save_project(
    req: ProjectSaveRequest,
    repository: ProjectRepository = Depends(get_project_repository),
) -> ProjectRecord:
    try:
        return repository.save_project(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail={"message": f"项目保存失败：{exc}"}
        ) from exc


@router.get("", response_model=ProjectListResponse)
def list_projects(
    repository: ProjectRepository = Depends(get_project_repository),
) -> ProjectListResponse:
    projects = repository.list_projects()
    return ProjectListResponse(projects=projects, total=len(projects))


@router.get("/{project_id}", response_model=ProjectRecord)
def get_project(
    project_id: str,
    repository: ProjectRepository = Depends(get_project_repository),
) -> ProjectRecord:
    try:
        return repository.get_project(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"message": "项目不存在"}) from exc


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    repository: ProjectRepository = Depends(get_project_repository),
) -> dict[str, str | bool]:
    try:
        deleted = repository.delete_project(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc

    if not deleted:
        raise HTTPException(status_code=404, detail={"message": "项目不存在"})

    return {"project_id": project_id, "deleted": True}
