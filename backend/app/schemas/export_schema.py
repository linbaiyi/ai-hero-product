from pydantic import BaseModel, field_validator


class ExportProjectRequest(BaseModel):
    include_json: bool = True
    include_markdown: bool = True
    include_images: bool = True
    include_board: bool = True
    include_playable: bool = True


class ExportProjectResult(BaseModel):
    project_id: str
    export_path: str
    file_name: str
    success: bool = True
    error_message: str | None = None

    @field_validator("project_id", "export_path", "file_name")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("字段不能为空")
        return value
