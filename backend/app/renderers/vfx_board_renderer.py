from pathlib import Path
from textwrap import shorten

from PIL import Image, ImageDraw, ImageFont, ImageOps

from app.schemas.hero_schema import HeroDesign
from app.schemas.image_generation_schema import ImageGenerationResult
from app.schemas.vfx_schema import VfxDesign


class VfxBoardRenderer:
    def render(
        self,
        hero_design: HeroDesign,
        vfx_designs: list[VfxDesign],
        image_results: list[ImageGenerationResult],
        output_path: str,
        board_title: str | None = None,
        width: int = 1600,
        height: int = 2400,
    ) -> str:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        image = Image.new("RGB", (width, height), "#07080d")
        draw = ImageDraw.Draw(image)
        fonts = _load_fonts(width)

        _draw_background(draw, width, height)
        current_y = _draw_header(
            draw,
            hero_design,
            board_title or f"{hero_design.hero_name} 技能特效设计稿",
            fonts,
            width,
        )
        current_y = _draw_skill_cards(
            image,
            draw,
            vfx_designs[:6],
            image_results,
            fonts,
            width,
            height,
            current_y + 32,
        )
        _draw_footer(draw, hero_design, fonts, width, height, current_y + 24)

        image.save(output, format="PNG")
        return str(output)


def _load_fonts(width: int) -> dict[str, ImageFont.FreeTypeFont | ImageFont.ImageFont]:
    candidates = [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]

    def load(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
        for candidate in candidates:
            if Path(candidate).exists():
                return ImageFont.truetype(candidate, size=size)
        return ImageFont.load_default()

    scale = max(0.8, width / 1600)
    return {
        "title": load(int(48 * scale)),
        "subtitle": load(int(24 * scale)),
        "section": load(int(28 * scale)),
        "body": load(int(20 * scale)),
        "small": load(int(16 * scale)),
        "tiny": load(int(14 * scale)),
    }


def _draw_background(draw: ImageDraw.ImageDraw, width: int, height: int) -> None:
    for y in range(height):
        shade = int(7 + (y / height) * 12)
        draw.line((0, y, width, y), fill=(shade, shade + 1, shade + 6))

    draw.rectangle((28, 28, width - 28, height - 28), outline="#7d5b1f", width=3)
    draw.rectangle((48, 48, width - 48, height - 48), outline="#2b2415", width=1)


def _draw_header(
    draw: ImageDraw.ImageDraw,
    hero: HeroDesign,
    title: str,
    fonts: dict[str, ImageFont.FreeTypeFont | ImageFont.ImageFont],
    width: int,
) -> int:
    x = 82
    y = 76
    max_width = width - 164

    draw.text((x, y), title, font=fonts["title"], fill="#ffd75a")
    y += 64
    draw.text(
        (x, y),
        "HERO SKILL VFX DESIGN BOARD",
        font=fonts["subtitle"],
        fill="#c9b98a",
    )
    y += 42
    draw.text((x, y), hero.hero_title, font=fonts["body"], fill="#d8dbe6")
    y += 34

    meta = f"定位 {hero.role}  |  难度 {hero.difficulty}/5  |  标签 {' / '.join(hero.core_tags)}"
    draw_wrapped_text(draw, meta, x, y, max_width, fonts["body"], "#f3e3a3", 30, 2)
    y += 68
    y = draw_wrapped_text(
        draw,
        f"战斗风格：{hero.combat_style}",
        x,
        y,
        max_width,
        fonts["small"],
        "#aeb6c8",
        26,
        3,
    )
    draw.line((x, y + 18, width - x, y + 18), fill="#59431a", width=2)
    return y + 34


def _draw_skill_cards(
    board: Image.Image,
    draw: ImageDraw.ImageDraw,
    vfx_designs: list[VfxDesign],
    image_results: list[ImageGenerationResult],
    fonts: dict[str, ImageFont.FreeTypeFont | ImageFont.ImageFont],
    width: int,
    height: int,
    start_y: int,
) -> int:
    margin_x = 82
    gap = 28
    columns = 2
    card_width = (width - margin_x * 2 - gap) // columns
    available_height = max(700, height - start_y - 360)
    rows = max(1, min(3, (len(vfx_designs) + 1) // 2))
    card_height = min(470, (available_height - gap * (rows - 1)) // rows)

    by_skill = {result.skill_name: result for result in image_results}

    for index, vfx in enumerate(vfx_designs):
        row = index // columns
        col = index % columns
        x = margin_x + col * (card_width + gap)
        y = start_y + row * (card_height + gap)
        _draw_skill_card(
            board,
            draw,
            vfx,
            by_skill.get(vfx.skill_name),
            fonts,
            x,
            y,
            card_width,
            card_height,
        )

    return start_y + rows * card_height + (rows - 1) * gap


def _draw_skill_card(
    board: Image.Image,
    draw: ImageDraw.ImageDraw,
    vfx: VfxDesign,
    image_result: ImageGenerationResult | None,
    fonts: dict[str, ImageFont.FreeTypeFont | ImageFont.ImageFont],
    x: int,
    y: int,
    width: int,
    height: int,
) -> None:
    draw.rounded_rectangle(
        (x, y, x + width, y + height),
        radius=18,
        fill="#10131d",
        outline="#846326",
        width=2,
    )
    draw.text((x + 22, y + 18), vfx.skill_name, font=fonts["section"], fill="#ffe27a")
    draw.text((x + 22, y + 56), vfx.vfx_category, font=fonts["small"], fill="#c9b98a")

    preview_x = x + 22
    preview_y = y + 88
    preview_w = int(width * 0.42)
    preview_h = min(210, height - 130)
    _draw_preview(board, draw, image_result, preview_x, preview_y, preview_w, preview_h, fonts)

    text_x = preview_x + preview_w + 22
    text_w = width - preview_w - 66
    current_y = preview_y
    keywords = " / ".join(vfx.visual_keywords[:5])
    current_y = draw_wrapped_text(
        draw,
        f"关键词：{keywords}",
        text_x,
        current_y,
        text_w,
        fonts["small"],
        "#d6d1c2",
        22,
        3,
    )
    current_y += 8

    for stage in vfx.stages[:3]:
        title = f"{stage.stage}: {stage.description}"
        current_y = draw_wrapped_text(
            draw,
            title,
            text_x,
            current_y,
            text_w,
            fonts["tiny"],
            "#aeb6c8",
            20,
            2,
        )
        current_y += 5

    palette_y = y + height - 72
    swatch_x = x + 22
    for name, color in list(vfx.color_palette.items())[:4]:
        draw.rounded_rectangle(
            (swatch_x, palette_y, swatch_x + 36, palette_y + 26),
            radius=5,
            fill=color,
            outline="#d8c16a",
        )
        draw.text((swatch_x, palette_y + 32), name[:8], font=fonts["tiny"], fill="#8f98aa")
        swatch_x += 58

    camera = shorten(vfx.camera_suggestion, width=46, placeholder="...")
    draw.text((text_x, palette_y + 2), camera, font=fonts["tiny"], fill="#c8ceda")


def _draw_preview(
    board: Image.Image,
    draw: ImageDraw.ImageDraw,
    image_result: ImageGenerationResult | None,
    x: int,
    y: int,
    width: int,
    height: int,
    fonts: dict[str, ImageFont.FreeTypeFont | ImageFont.ImageFont],
) -> None:
    draw.rounded_rectangle(
        (x, y, x + width, y + height),
        radius=14,
        fill="#06070b",
        outline="#3d3320",
        width=2,
    )

    if not image_result or not image_result.success:
        label = "暂无预览图" if not image_result else "预览图生成失败"
        _draw_centered_text(draw, label, x, y, width, height, fonts["small"], "#8f98aa")
        return

    image_path = Path(image_result.image_path)
    if not image_path.exists():
        _draw_centered_text(draw, "暂无预览图", x, y, width, height, fonts["small"], "#8f98aa")
        return

    try:
        with Image.open(image_path) as preview:
            fitted = ImageOps.contain(preview.convert("RGB"), (width - 10, height - 10))
            paste_x = x + (width - fitted.width) // 2
            paste_y = y + (height - fitted.height) // 2
            board.paste(fitted, (paste_x, paste_y))
    except Exception:
        _draw_centered_text(draw, "暂无预览图", x, y, width, height, fonts["small"], "#8f98aa")


def _draw_footer(
    draw: ImageDraw.ImageDraw,
    hero: HeroDesign,
    fonts: dict[str, ImageFont.FreeTypeFont | ImageFont.ImageFont],
    width: int,
    height: int,
    start_y: int,
) -> None:
    x = 82
    y = min(start_y, height - 300)
    max_width = width - 164
    draw.line((x, y, width - x, y), fill="#59431a", width=2)
    y += 28
    y = draw_wrapped_text(
        draw,
        f"连招逻辑：{hero.combo_logic}",
        x,
        y,
        max_width,
        fonts["body"],
        "#f1df9a",
        30,
        3,
    )
    y += 10
    draw_wrapped_text(
        draw,
        f"平衡总结：{hero.balance_summary}",
        x,
        y,
        max_width,
        fonts["body"],
        "#c8ceda",
        30,
        3,
    )
    slogan = "从英雄机制到技能特效，从策划方案到视觉设计稿。"
    draw.text((x, height - 96), slogan, font=fonts["body"], fill="#ffd75a")


def draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int,
    y: int,
    max_width: int,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: str,
    line_height: int,
    max_lines: int | None = None,
) -> int:
    lines = _wrap_text(draw, text, max_width, font, max_lines)
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        y += line_height
    return y


def _wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    max_lines: int | None,
) -> list[str]:
    lines: list[str] = []
    current = ""

    for char in text:
        candidate = current + char
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width or not current:
            current = candidate
            continue

        lines.append(current)
        current = char
        if max_lines and len(lines) >= max_lines:
            lines[-1] = lines[-1].rstrip("，。,. ") + "..."
            return lines

    if current:
        lines.append(current)

    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip("，。,. ") + "..."

    return lines


def _draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int,
    y: int,
    width: int,
    height: int,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: str,
) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    draw.text(
        (x + (width - text_width) / 2, y + (height - text_height) / 2),
        text,
        font=font,
        fill=fill,
    )
