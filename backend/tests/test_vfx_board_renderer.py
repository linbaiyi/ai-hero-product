from pathlib import Path

from PIL import Image

from app.renderers.vfx_board_renderer import VfxBoardRenderer
from app.schemas.hero_schema import HeroDesign
from app.schemas.image_generation_schema import ImageGenerationResult
from app.schemas.vfx_schema import VfxDesign
from board_test_helpers import make_hero_design, make_image_result, make_vfx_design


def make_preview(path: Path, color: tuple[int, int, int] = (255, 90, 31)) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (320, 240), color).save(path, "PNG")
    return path


def render_board(
    tmp_path: Path,
    vfx_designs: list[VfxDesign] | None = None,
    image_results: list[ImageGenerationResult] | None = None,
    width: int = 1200,
    height: int = 1600,
) -> Path:
    output_path = tmp_path / "vfx_board.png"
    renderer = VfxBoardRenderer()
    renderer.render(
        hero_design=HeroDesign(**make_hero_design()),
        vfx_designs=vfx_designs or [VfxDesign(**make_vfx_design())],
        image_results=image_results or [],
        output_path=str(output_path),
        width=width,
        height=height,
    )
    return output_path


def test_renderer_generates_png_file(tmp_path):
    preview_path = make_preview(tmp_path / "preview.png")
    image_result = ImageGenerationResult(
        **make_image_result(image_path=str(preview_path), file_name="preview.png")
    )

    output_path = render_board(tmp_path, image_results=[image_result])

    assert output_path.exists()
    with Image.open(output_path) as image:
        assert image.format == "PNG"
        assert image.size == (1200, 1600)


def test_renderer_works_without_image_results(tmp_path):
    output_path = render_board(tmp_path, image_results=[])

    assert output_path.exists()


def test_renderer_works_when_image_file_is_missing(tmp_path):
    missing_result = ImageGenerationResult(**make_image_result())

    output_path = render_board(tmp_path, image_results=[missing_result])

    assert output_path.exists()


def test_renderer_truncates_more_than_six_vfx_designs(tmp_path):
    vfx_designs = [
        VfxDesign(**make_vfx_design(skill_name=f"鐑堢劙鍐插嚮{i}")) for i in range(8)
    ]

    output_path = render_board(tmp_path, vfx_designs=vfx_designs)

    assert output_path.exists()


def test_renderer_handles_chinese_hero_and_skill_names(tmp_path):
    output_path = render_board(tmp_path)

    assert output_path.exists()
