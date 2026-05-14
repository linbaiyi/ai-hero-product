from pydantic import BaseModel

from app.schemas.project_schema import ProjectRecord


class ProjectImportResult(BaseModel):
    project_id: str
    imported: bool = True
    project: ProjectRecord
