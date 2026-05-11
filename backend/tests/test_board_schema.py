import pytest
from pydantic import ValidationError

from app.schemas.board_schema import BoardRenderRequest, BoardRenderResult
from board_test_helpers import make_board_request


def test_valid_board_render_request_passes_validation():
    req = BoardRenderRequest(**make_board_request())

    assert req.project_id == "board_demo_001"
    assert req.width == 1600


def test_board_render_request_empty_project_id_fails():
    with pytest.raises(ValidationError):
        BoardRenderRequest(**make_board_request(project_id=""))


def test_board_render_request_empty_vfx_designs_fails():
    with pytest.raises(ValidationError):
        BoardRenderRequest(**make_board_request(vfx_designs=[]))


def test_board_render_request_width_too_small_fails():
    with pytest.raises(ValidationError):
        BoardRenderRequest(**make_board_request(width=999))


def test_board_render_request_height_too_large_fails():
    with pytest.raises(ValidationError):
        BoardRenderRequest(**make_board_request(height=4001))


def test_valid_board_render_result_passes_validation():
    result = BoardRenderResult(
        project_id="board_demo_001",
        board_path="outputs/boards/board_demo_001/vfx_board.png",
        file_name="vfx_board.png",
        width=1600,
        height=2400,
    )

    assert result.success is True


def test_board_render_result_empty_board_path_fails():
    with pytest.raises(ValidationError):
        BoardRenderResult(
            project_id="board_demo_001",
            board_path="",
            file_name="vfx_board.png",
            width=1600,
            height=2400,
        )
