from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from app.clients.image_client import ImageClient
from app.clients.image_client_factory import create_image_client
from app.schemas.runtime_vfx_generation_schema import (
    RuntimeVfxGeneratedAsset,
    RuntimeVfxGenerationRequest,
    RuntimeVfxGenerationResponse,
)
from app.schemas.runtime_vfx_prompt_schema import RuntimeVfxPromptItem
from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec
from app.services.runtime_vfx_image_postprocess import cleanup_runtime_vfx_texture
from app.services.runtime_vfx_prompt_service import RuntimeVfxPromptService
from app.storage.file_storage import (
    get_runtime_vfx_output_dir,
    sanitize_file_name,
    sanitize_project_id,
)


USAGE_PRIORITY = {
    "projectile": 0,
    "ground_decal": 1,
    "impact": 2,
    "aura": 3,
    "trail": 4,
    "summon_body": 0,
}

REQUIRED_USAGE_BY_SKILL_TYPE = {
    "projectile": ["projectile"],
    "aoe": ["ground_decal", "impact"],
    "aoe_dot": ["ground_decal"],
    "dash": ["trail", "impact"],
    "buff": ["aura"],
    "summon": ["summon_body"],
}

DEFAULT_RENDER_MODE_BY_USAGE = {
    "projectile": "sprite",
    "impact": "sprite",
    "ground_decal": "ground_plane",
    "aura": "aura_ring",
    "trail": "sprite_trail",
    "summon_body": "sprite",
}

DEFAULT_SCALE_BY_USAGE = {
    "projectile": 1.2,
    "impact": 2.5,
    "ground_decal": 4.0,
    "aura": 2.0,
    "trail": 0.8,
    "summon_body": 1.6,
}

DEFAULT_DURATION_BY_USAGE = {
    "projectile": 0.8,
    "impact": 0.35,
    "ground_decal": 4.0,
    "aura": 3.0,
    "trail": 0.25,
    "summon_body": 8.0,
}

MIN_ATLAS_SIZE = 1024


@dataclass(frozen=True)
class SelectedPrompt:
    item: RuntimeVfxPromptItem
    asset_key: str


@dataclass(frozen=True)
class AtlasGrid:
    columns: int
    rows: int


@dataclass(frozen=True)
class AtlasCellBox:
    left: int
    upper: int
    right: int
    lower: int

    @property
    def width(self) -> int:
        return self.right - self.left

    @property
    def height(self) -> int:
        return self.lower - self.upper


class RuntimeVfxGenerationService:
    def __init__(
        self,
        image_client: ImageClient | None = None,
        prompt_service: RuntimeVfxPromptService | None = None,
    ) -> None:
        self.image_client = image_client or create_image_client()
        self.prompt_service = prompt_service or RuntimeVfxPromptService()

    def generate(
        self, request: RuntimeVfxGenerationRequest | dict
    ) -> RuntimeVfxGenerationResponse:
        req = (
            request
            if isinstance(request, RuntimeVfxGenerationRequest)
            else RuntimeVfxGenerationRequest.model_validate(request)
        )
        width, height = _parse_image_size(req.image_size)
        prompt_response = self.prompt_service.generate_prompts(
            {
                "playable_spec": req.playable_spec.model_dump(),
                "runtime_vfx_asset_spec": (
                    req.runtime_vfx_asset_spec.model_dump()
                    if req.runtime_vfx_asset_spec
                    else None
                ),
                "transparent_background": req.transparent_background,
            }
        )

        selected, warnings = select_prompt_items(
            prompt_response.prompts,
            max_textures=req.max_textures,
        )
        output_dir, asset_base_path = _runtime_output_location(
            hero_id=req.playable_spec.hero.id,
            project_id=req.project_id,
        )

        generated_assets: list[RuntimeVfxGeneratedAsset] = []
        assets_by_slot: dict[str, dict[str, dict]] = {slot: {} for slot in ["Q", "W", "E", "R"]}

        atlas_width = max(width, MIN_ATLAS_SIZE)
        atlas_height = max(height, MIN_ATLAS_SIZE)
        grid = _atlas_grid(len(selected))
        atlas_path = output_dir / "_runtime_vfx_atlas.png"

        try:
            self.image_client.generate_image(
                prompt=_build_atlas_prompt(selected, req.transparent_background),
                negative_prompt=_build_atlas_negative_prompt(),
                save_path=str(atlas_path),
                width=atlas_width,
                height=atlas_height,
            )
        except Exception as exc:
            raise RuntimeError(
                f"Runtime VFX texture generation failed: atlas generation failed: {exc}"
            ) from exc

        try:
            _crop_atlas_textures(
                atlas_path=atlas_path,
                selected=selected,
                output_dir=output_dir,
                grid=grid,
            )
        except Exception as exc:
            raise RuntimeError(f"Runtime VFX atlas slicing failed: {exc}") from exc

        for index, selected_prompt in enumerate(selected):
            item = selected_prompt.item
            file_name = f"{item.slot}_{sanitize_file_name(item.usage)}.png"
            asset_path = f"{asset_base_path}/{file_name}"
            cell_box = _atlas_cell_box(index, atlas_width, atlas_height, grid)

            generated_assets.append(
                RuntimeVfxGeneratedAsset(
                    slot=item.slot,
                    skill_name=item.skill_name,
                    skill_type=item.skill_type,
                    usage=item.usage,
                    render_mode=item.render_mode,
                    path=asset_path,
                    prompt=item.prompt,
                    width=cell_box.width,
                    height=cell_box.height,
                )
            )
            assets_by_slot[item.slot][selected_prompt.asset_key] = {
                "path": asset_path,
                "usage": item.usage,
                "blend_mode": "additive",
                "render_mode": DEFAULT_RENDER_MODE_BY_USAGE[item.usage],
                "scale": DEFAULT_SCALE_BY_USAGE[item.usage],
                "duration": DEFAULT_DURATION_BY_USAGE[item.usage],
                "loop": _should_loop(item.skill_type, item.usage),
                "color_tint": _color_for_slot(req, item.slot),
            }

        runtime_vfx_asset_spec = RuntimeVfxAssetSpec.model_validate(
            {
                "version": "1.0",
                "hero_id": req.playable_spec.hero.id,
                "map_profile": req.playable_spec.runtime.map_profile,
                "assets_base_path": "runtime_vfx/",
                "skills": {
                    skill.slot: {
                        "skill_name": skill.name,
                        "skill_type": skill.type,
                        "assets": assets_by_slot[skill.slot],
                    }
                    for skill in req.playable_spec.skills
                },
            }
        )

        return RuntimeVfxGenerationResponse(
            runtime_vfx_asset_spec=runtime_vfx_asset_spec,
            generated_assets=generated_assets,
            warnings=warnings,
        )


def select_prompt_items(
    prompt_items: list[RuntimeVfxPromptItem],
    max_textures: int,
) -> tuple[list[SelectedPrompt], list[str]]:
    selected: list[SelectedPrompt] = []
    warnings: list[str] = []
    selected_ids: set[tuple[str, str]] = set()
    items_by_slot = _items_by_slot(prompt_items)

    for slot in ["Q", "W", "E", "R"]:
        slot_items = items_by_slot.get(slot, [])
        if not slot_items:
            continue
        skill_type = slot_items[0].skill_type
        required_item = _first_required_item(slot_items, skill_type)
        if required_item is None:
            continue
        if len(selected) >= max_textures:
            raise RuntimeError(
                "max_textures is too low to generate the minimum valid RuntimeVfxAssetSpec"
            )
        selected.append(SelectedPrompt(required_item, required_item.usage))
        selected_ids.add((required_item.slot, required_item.usage))

    remaining = [
        item
        for item in prompt_items
        if (item.slot, item.usage) not in selected_ids
    ]
    remaining.sort(key=lambda item: (USAGE_PRIORITY[item.usage], item.slot))

    for item in remaining:
        if len(selected) >= max_textures:
            warnings.append(f"Skipped {item.slot} {item.usage} due to max_textures limit")
            continue
        selected.append(SelectedPrompt(item, item.usage))
        selected_ids.add((item.slot, item.usage))

    return selected, warnings


def _items_by_slot(
    prompt_items: list[RuntimeVfxPromptItem],
) -> dict[str, list[RuntimeVfxPromptItem]]:
    items: dict[str, list[RuntimeVfxPromptItem]] = {}
    for item in prompt_items:
        items.setdefault(item.slot, []).append(item)
    return items


def _first_required_item(
    items: list[RuntimeVfxPromptItem],
    skill_type: str,
) -> RuntimeVfxPromptItem | None:
    required_usages = REQUIRED_USAGE_BY_SKILL_TYPE[skill_type]
    for usage in required_usages:
        for item in items:
            if item.usage == usage:
                return item
    return None


def _runtime_output_location(hero_id: str, project_id: str | None) -> tuple[Path, str]:
    if project_id:
        safe_id = sanitize_project_id(project_id)
        relative_base = f"runtime_vfx/{safe_id}"
    else:
        safe_id = sanitize_project_id(hero_id)
        relative_base = f"runtime_vfx/generated/{safe_id}"

    return get_runtime_vfx_output_dir(relative_base), relative_base


def _parse_image_size(image_size: str) -> tuple[int, int]:
    width_text, height_text = image_size.split("x", maxsplit=1)
    return int(width_text), int(height_text)


def _should_loop(skill_type: str, usage: str) -> bool:
    return usage == "aura" or (usage == "ground_decal" and skill_type == "aoe_dot")


def _color_for_slot(req: RuntimeVfxGenerationRequest, slot: str) -> str:
    for skill in req.playable_spec.skills:
        if skill.slot == slot:
            return skill.vfx.color
    return "#ffffff"


def _atlas_grid(item_count: int) -> AtlasGrid:
    if item_count <= 0:
        return AtlasGrid(columns=1, rows=1)
    if item_count <= 4:
        return AtlasGrid(columns=2, rows=2)
    if item_count <= 9:
        return AtlasGrid(columns=3, rows=3)

    columns = 4
    rows = (item_count + columns - 1) // columns
    return AtlasGrid(columns=columns, rows=rows)


def _build_atlas_prompt(
    selected: list[SelectedPrompt],
    transparent_background: bool,
) -> str:
    grid = _atlas_grid(len(selected))
    atlas_size = MIN_ATLAS_SIZE
    background = (
        "transparent background, real alpha transparency, transparent PNG with real alpha channel, PNG with alpha if supported"
        if transparent_background
        else "black background suitable for additive blending"
    )
    cells = [
        (
            f"Cell {index}: {selected_prompt.item.slot} {selected_prompt.item.usage}, "
            f"{selected_prompt.item.skill_type} skill, "
            f"{selected_prompt.item.render_mode} render target, "
            f"style from {selected_prompt.item.skill_name}. "
            f"{_atlas_cell_instruction(index - 1, atlas_size, atlas_size, grid)} "
            f"Exact texture prompt for this cell: {selected_prompt.item.prompt}"
        )
        for index, selected_prompt in enumerate(selected, start=1)
    ]

    return "\n".join(
        [
            (
                f"Create one 1024x1024 game VFX texture atlas arranged as a "
                f"{grid.columns} by {grid.rows} grid."
            ),
            "Each grid cell contains exactly one isolated runtime VFX texture asset.",
            (
                "For a 3 by 3 atlas, each effect cell is roughly 341 by 341 pixels, "
                "about 11.11 percent of the full 1024x1024 canvas."
            ),
            (
                "The visible effect should occupy the centered 65 to 75 percent of its own cell, "
                "with 12 to 18 percent transparent padding on every side."
            ),
            "Keep every effect centered inside its exact pixel cell with generous padding for clean cropping.",
            "Each cell must have transparent padding and each effect must not touch cell edges or overlap another cell.",
            "Place cells in strict reading order: left to right, then top to bottom.",
            "Do not draw checkerboard background, transparency preview pattern, visible grid lines, white background, gray background, colored square background, or rectangular tile background.",
            (
                "For any ground_decal cell: use strict top-down view, flat circular ground decal, "
                "flat magic circle texture, painted-on-ground area marker; no dome, no sphere, "
                "no shield, no hemisphere, no vertical wall, no 3D object, no perspective view, "
                "no mound, no raised barrier."
            ),
            "No visible grid lines in final cropped cells.",
            background,
            "single effect element per cell, clean alpha edges, additive blending style",
            "no character, no environment, no text, no logo, no watermark, no UI frame",
            *cells,
        ]
    )


def _build_atlas_negative_prompt() -> str:
    return (
        "text, logo, watermark, character, environment, scenery, user interface, "
        "frame, labels, cropped effect, overlapping cells, dirty alpha edges, "
        "checkerboard background, transparency preview pattern, white background, "
        "gray background, colored square background, rectangular tile background, visible grid lines, "
        "dome, sphere, shield, hemisphere, vertical wall, 3D object, perspective view, mound, raised barrier"
    )


def _crop_atlas_textures(
    atlas_path: Path,
    selected: list[SelectedPrompt],
    output_dir: Path,
    grid: AtlasGrid,
) -> None:
    with Image.open(atlas_path) as source_image:
        atlas = source_image.convert("RGBA")
        for index, selected_prompt in enumerate(selected):
            item = selected_prompt.item
            box = _atlas_cell_box(index, atlas.width, atlas.height, grid)
            texture = atlas.crop((box.left, box.upper, box.right, box.lower))
            file_name = f"{item.slot}_{sanitize_file_name(item.usage)}.png"
            texture_path = output_dir / file_name
            texture.save(texture_path, format="PNG")
            cleanup_runtime_vfx_texture(str(texture_path))


def _atlas_cell_box(
    index: int,
    atlas_width: int,
    atlas_height: int,
    grid: AtlasGrid,
) -> AtlasCellBox:
    column = index % grid.columns
    row = index // grid.columns
    left = round(column * atlas_width / grid.columns)
    right = round((column + 1) * atlas_width / grid.columns)
    upper = round(row * atlas_height / grid.rows)
    lower = round((row + 1) * atlas_height / grid.rows)
    return AtlasCellBox(left=left, upper=upper, right=right, lower=lower)


def _atlas_cell_instruction(
    index: int,
    atlas_width: int,
    atlas_height: int,
    grid: AtlasGrid,
) -> str:
    box = _atlas_cell_box(index, atlas_width, atlas_height, grid)
    content_margin_x = round(box.width * 0.15)
    content_margin_y = round(box.height * 0.15)
    content_left = box.left + content_margin_x
    content_right = box.right - content_margin_x
    content_upper = box.upper + content_margin_y
    content_lower = box.lower - content_margin_y
    return (
        f"Use pixel cell x={box.left}-{box.right}, y={box.upper}-{box.lower}; "
        f"keep the visible effect centered inside x={content_left}-{content_right}, "
        f"y={content_upper}-{content_lower}."
    )
