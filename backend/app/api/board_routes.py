from fastapi import APIRouter

from app.renderers.vfx_board_renderer import VfxBoardRenderer
from app.schemas.board_schema import BoardRenderRequest, BoardRenderResult
from app.services.board_render_service import BoardRenderService

router = APIRouter(prefix="/api/boards", tags=["boards"])


def get_board_render_service() -> BoardRenderService:
    return BoardRenderService(renderer=VfxBoardRenderer())


@router.post("/render", response_model=BoardRenderResult)
def render_board(req: BoardRenderRequest) -> BoardRenderResult:
    service = get_board_render_service()
    return service.render_board(req)
