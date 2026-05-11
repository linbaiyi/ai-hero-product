from pathlib import Path

from app.schemas.board_schema import BoardRenderRequest
from app.services.board_render_service import BoardRenderService
from board_test_helpers import make_board_request


class RecordingRenderer:
    def render(
        self,
        hero_design,
        vfx_designs,
        image_results,
        output_path: str,
        board_title=None,
        width: int = 1600,
        height: int = 2400,
    ) -> str:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        Path(output_path).write_bytes(b"fake-board")
        return output_path


class BrokenRenderer:
    def render(self, *args, **kwargs) -> str:
        raise RuntimeError("renderer crashed")


def test_render_board_returns_success_result():
    service = BoardRenderService(renderer=RecordingRenderer())
    req = BoardRenderRequest(**make_board_request(project_id="service_board_001"))

    result = service.render_board(req)

    assert result.success is True
    assert Path(result.board_path).exists()
    assert result.board_path.startswith("outputs/boards/service_board_001/")


def test_unsafe_project_id_is_sanitized_inside_outputs():
    service = BoardRenderService(renderer=RecordingRenderer())
    req = BoardRenderRequest(**make_board_request(project_id="../unsafe:path"))

    result = service.render_board(req)

    assert ".." not in result.board_path
    assert result.board_path.startswith("outputs/boards/")
    assert Path(result.board_path).resolve().is_relative_to(Path("outputs").resolve())


def test_broken_renderer_returns_failed_result():
    service = BoardRenderService(renderer=BrokenRenderer())
    req = BoardRenderRequest(**make_board_request(project_id="broken_board_001"))

    result = service.render_board(req)

    assert result.success is False
    assert "renderer crashed" in (result.error_message or "")
