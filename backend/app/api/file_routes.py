from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.storage.file_storage import resolve_output_file

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/{file_path:path}")
def serve_output_file(file_path: str) -> FileResponse:
    try:
        output_file = resolve_output_file(file_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    if not output_file.exists() or not output_file.is_file():
        raise HTTPException(status_code=404, detail="文件不存在")

    if output_file.suffix.lower() != ".png":
        raise HTTPException(status_code=403, detail="当前仅允许访问 PNG 图片")

    return FileResponse(
        path=Path(output_file),
        media_type="image/png",
        filename=output_file.name,
    )
