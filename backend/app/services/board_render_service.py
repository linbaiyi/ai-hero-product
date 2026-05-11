from app.renderers.vfx_board_renderer import VfxBoardRenderer
from app.schemas.board_schema import BoardRenderRequest, BoardRenderResult
from app.storage.file_storage import (
    get_board_output_dir,
    sanitize_project_id,
    to_backend_relative_path,
)


class BoardRenderService:
    def __init__(self, renderer: VfxBoardRenderer) -> None:
        self.renderer = renderer

    def render_board(self, req: BoardRenderRequest) -> BoardRenderResult:
        project_id = sanitize_project_id(req.project_id)
        output_dir = get_board_output_dir(project_id)
        output_path = output_dir / "vfx_board.png"

        try:
            self.renderer.render(
                hero_design=req.hero_design,
                vfx_designs=req.vfx_designs,
                image_results=req.image_results,
                output_path=str(output_path),
                board_title=req.board_title,
                width=req.width,
                height=req.height,
            )
            return BoardRenderResult(
                project_id=project_id,
                board_path=to_backend_relative_path(output_path),
                file_name=output_path.name,
                width=req.width,
                height=req.height,
                success=True,
            )
        except Exception as exc:
            return BoardRenderResult(
                project_id=project_id,
                board_path=to_backend_relative_path(output_path),
                file_name=output_path.name,
                width=req.width,
                height=req.height,
                success=False,
                error_message=str(exc),
            )
