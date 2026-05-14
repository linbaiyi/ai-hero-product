from fastapi import APIRouter, Depends, HTTPException, Request

from app.clients.llm_client_factory import create_llm_client
from app.schemas.project_import_schema import ProjectImportResult
from app.schemas.project_skill_edit_schema import (
    EditableSkillSlot,
    ProjectSkillEditRequest,
    ProjectSkillEditResponse,
)
from app.schemas.project_schema import (
    ProjectListResponse,
    ProjectRecord,
    ProjectSaveRequest,
)
from app.services.project_import_service import ProjectImportService
from app.services.project_skill_edit_service import ProjectSkillEditService
from app.storage.project_repository import ProjectRepository

router = APIRouter(prefix="/api/projects", tags=["projects"])


def get_project_repository() -> ProjectRepository:
    return ProjectRepository()


def get_project_import_service(
    repository: ProjectRepository = Depends(get_project_repository),
) -> ProjectImportService:
    return ProjectImportService(repository)


def get_project_skill_edit_service(
    repository: ProjectRepository = Depends(get_project_repository),
) -> ProjectSkillEditService:
    return ProjectSkillEditService(repository, create_llm_client())


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


@router.post("/import", response_model=ProjectImportResult)
async def import_project(
    request: Request,
    service: ProjectImportService = Depends(get_project_import_service),
) -> ProjectImportResult:
    try:
        return service.import_project_archive(await request.body())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail={"message": f"项目导入失败：{exc}"}
        ) from exc


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


@router.post("/{project_id}/skills/{slot}/edit", response_model=ProjectSkillEditResponse)
def edit_project_skill(
    project_id: str,
    slot: EditableSkillSlot,
    req: ProjectSkillEditRequest,
    service: ProjectSkillEditService = Depends(get_project_skill_edit_service),
) -> ProjectSkillEditResponse:
    try:
        return service.edit_skill(project_id, slot, req)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"message": "项目不存在"}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail={"message": str(exc)}) from exc


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
