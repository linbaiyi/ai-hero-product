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
    "zone_tick": 1,
    "impact": 2,
    "hit_flash": 2,
    "aura": 3,
    "summon_body": 3,
    "summon_spawn": 3,
    "summon_idle": 3,
    "summon_expire": 3,
    "burn_loop": 3,
    "poison_cloud": 3,
    "mark_sigil": 3,
    "mark_sigial": 3,
    "stun_stars": 3,
    "status_loop": 3,
    "trail": 4,
    "cast_flash": 5,
    "cast_circle": 5,
}

REQUIRED_USAGE_BY_SKILL_TYPE = {
    "projectile": ["projectile", "cast_flash"],
    "aoe": ["ground_decal", "impact", "cast_circle"],
    "aoe_dot": ["ground_decal"],
    "dash": ["trail", "impact"],
    "buff": ["aura"],
    "summon": ["summon_body", "summon_spawn"],
}

DEFAULT_RENDER_MODE_BY_USAGE = {
    "projectile": "sprite",
    "impact": "sprite",
    "hit_flash": "sprite",
    "ground_decal": "ground_plane",
    "aura": "aura_ring",
    "trail": "sprite_trail",
    "summon_body": "sprite",
    "cast_flash": "sprite",
    "cast_circle": "ground_plane",
    "zone_tick": "ground_plane",
    "summon_spawn": "sprite",
    "summon_idle": "aura_ring",
    "summon_expire": "sprite",
    "status_loop": "sprite",
    "burn_loop": "sprite",
    "poison_cloud": "sprite",
    "mark_sigil": "ground_plane",
    "mark_sigial": "ground_plane",
    "stun_stars": "sprite",
}

DEFAULT_SCALE_BY_USAGE = {
    "projectile": 1.2,
    "impact": 2.5,
    "hit_flash": 1.4,
    "ground_decal": 4.0,
    "aura": 2.0,
    "trail": 0.8,
    "summon_body": 1.6,
    "cast_flash": 1.5,
    "cast_circle": 2.5,
    "zone_tick": 3.5,
    "summon_spawn": 2.0,
    "summon_idle": 1.8,
    "summon_expire": 2.5,
    "status_loop": 1.0,
    "burn_loop": 1.0,
    "poison_cloud": 1.2,
    "mark_sigil": 1.4,
    "mark_sigial": 1.4,
    "stun_stars": 1.0,
}

DEFAULT_DURATION_BY_USAGE = {
    "projectile": 0.8,
    "impact": 0.35,
    "hit_flash": 0.22,
    "ground_decal": 4.0,
    "aura": 3.0,
    "trail": 0.25,
    "summon_body": 8.0,
    "cast_flash": 0.25,
    "cast_circle": 0.6,
    "zone_tick": 0.8,
    "summon_spawn": 0.35,
    "summon_idle": 8.0,
    "summon_expire": 0.45,
    "status_loop": 1.0,
    "burn_loop": 1.0,
    "poison_cloud": 1.0,
    "mark_sigil": 1.5,
    "mark_sigial": 1.5,
    "stun_stars": 1.0,
}

MIN_ATLAS_SIZE = 1024
MAX_TEXTURES_PER_ATLAS = 9


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
                "hero_design": (
                    req.hero_design.model_dump() if req.hero_design else None
                ),
                "vfx_designs": [
                    vfx_design.model_dump() for vfx_design in req.vfx_designs
                ],
                "source_request": (
                    req.source_request.model_dump() if req.source_request else None
                ),
                "element_theme": req.element_theme,
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
        selected_batches = _chunk_selected_prompts(selected, MAX_TEXTURES_PER_ATLAS)
        atlas_paths: list[Path] = []
        cell_boxes_by_asset_key: dict[tuple[str, str], AtlasCellBox] = {}

        for batch_index, selected_batch in enumerate(selected_batches):
            grid = _atlas_grid(len(selected_batch))
            atlas_path = _atlas_path_for_batch(
                output_dir=output_dir,
                batch_index=batch_index,
                batch_count=len(selected_batches),
            )
            atlas_paths.append(atlas_path)

            try:
                self.image_client.generate_image(
                    prompt=_build_atlas_prompt(selected_batch, req.transparent_background),
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
                    selected=selected_batch,
                    output_dir=output_dir,
                    grid=grid,
                )
            except Exception as exc:
                raise RuntimeError(f"Runtime VFX atlas slicing failed: {exc}") from exc

            for cell_index, selected_prompt in enumerate(selected_batch):
                cell_boxes_by_asset_key[
                    (selected_prompt.item.slot, selected_prompt.asset_key)
                ] = _atlas_cell_box(cell_index, atlas_width, atlas_height, grid)

        for selected_prompt in selected:
            item = selected_prompt.item
            safe_asset_key = sanitize_file_name(selected_prompt.asset_key)
            file_name = f"{item.slot}_{safe_asset_key}.png"
            asset_path = f"{asset_base_path}/{file_name}"
            cell_box = cell_boxes_by_asset_key[(item.slot, selected_prompt.asset_key)]

            generated_assets.append(
                RuntimeVfxGeneratedAsset(
                    slot=item.slot,
                    skill_name=item.skill_name,
                    skill_type=item.skill_type,
                    usage=item.usage,
                    render_mode=item.render_mode,
                    trigger=item.trigger,
                    action=item.action,
                    effect_index=item.effect_index,
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
                "color_tint": item.color_tint or _color_for_slot(req, item.slot),
                "trigger": item.trigger,
                "action": item.action,
                "effect_index": item.effect_index,
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
        _delete_stale_runtime_vfx_files(
            output_dir=output_dir,
            keep_file_names={
                Path(asset.path).name for asset in generated_assets
            }
            | {atlas_path.name for atlas_path in atlas_paths},
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
        for required_item in _minimum_required_items(slot_items, skill_type):
            required_key = _asset_key_for_prompt_item(required_item)
            required_id = (required_item.slot, required_key)
            if required_id in selected_ids:
                continue
            if len(selected) >= max_textures:
                raise RuntimeError(
                    "max_textures is too low to generate the minimum valid RuntimeVfxAssetSpec"
                )
            selected.append(SelectedPrompt(required_item, required_key))
            selected_ids.add(required_id)

    remaining = [
        item
        for item in prompt_items
        if (item.slot, _asset_key_for_prompt_item(item)) not in selected_ids
    ]
    remaining.sort(key=lambda item: (USAGE_PRIORITY.get(item.usage, 99), item.slot))

    for item in remaining:
        asset_key = _asset_key_for_prompt_item(item)
        if len(selected) >= max_textures:
            warnings.append(f"Skipped {item.slot} {asset_key} due to max_textures limit")
            continue
        selected.append(SelectedPrompt(item, asset_key))
        selected_ids.add((item.slot, asset_key))

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


def _minimum_required_items(
    items: list[RuntimeVfxPromptItem],
    skill_type: str,
) -> list[RuntimeVfxPromptItem]:
    required: list[RuntimeVfxPromptItem] = []
    primary = _first_required_item(items, skill_type)
    if primary is not None:
        required.append(primary)

    for item in items:
        if _is_stage_critical_item(item):
            required.append(item)

    return _dedupe_prompt_items(required)


def _is_stage_critical_item(item: RuntimeVfxPromptItem) -> bool:
    if item.action == "spawn_zone" and item.usage in {
        "ground_decal",
        "zone_tick",
        "burn_loop",
        "poison_cloud",
        "status_loop",
    }:
        return True
    if item.action == "spawn_vfx_event" and item.usage == "hit_flash":
        return True
    if item.action == "apply_status" and item.usage in {
        "burn_loop",
        "poison_cloud",
        "mark_sigil",
        "mark_sigial",
        "stun_stars",
        "status_loop",
    }:
        return True
    if item.trigger in {"on_zone_tick", "on_status_tick"} and item.usage in {
        "zone_tick",
        "burn_loop",
        "poison_cloud",
        "status_loop",
    }:
        return True
    if item.trigger in {"on_summon_expire", "on_summon_death"} and item.usage in {
        "summon_expire",
        "hit_flash",
        "ground_decal",
    }:
        return True
    return False


def _dedupe_prompt_items(
    items: list[RuntimeVfxPromptItem],
) -> list[RuntimeVfxPromptItem]:
    seen: set[tuple[str, str]] = set()
    result: list[RuntimeVfxPromptItem] = []
    for item in items:
        key = (item.slot, _asset_key_for_prompt_item(item))
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _asset_key_for_prompt_item(item: RuntimeVfxPromptItem) -> str:
    parts = [item.usage]
    if item.trigger:
        parts.append(item.trigger.removeprefix("on_"))
    if item.action:
        parts.append(item.action)
    if item.effect_index is not None:
        parts.append(str(item.effect_index))
    return "_".join(parts)


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
    return usage in {
        "aura",
        "summon_idle",
        "burn_loop",
        "poison_cloud",
        "status_loop",
    } or usage == "ground_decal" and skill_type == "aoe_dot"


def _color_for_slot(req: RuntimeVfxGenerationRequest, slot: str) -> str:
    for skill in req.playable_spec.skills:
        if skill.slot == slot:
            for vfx_design in req.vfx_designs:
                if vfx_design.skill_name == skill.name:
                    for key in ("main", "primary", "core", "dominant", "secondary"):
                        value = vfx_design.color_palette.get(key)
                        if value:
                            return value
                    for value in vfx_design.color_palette.values():
                        if value:
                            return value
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


def _chunk_selected_prompts(
    selected: list[SelectedPrompt],
    batch_size: int,
) -> list[list[SelectedPrompt]]:
    if batch_size <= 0:
        raise ValueError("batch_size must be positive")
    return [selected[index : index + batch_size] for index in range(0, len(selected), batch_size)]


def _atlas_path_for_batch(
    output_dir: Path,
    batch_index: int,
    batch_count: int,
) -> Path:
    if batch_count <= 1:
        return output_dir / "_runtime_vfx_atlas.png"
    return output_dir / f"_runtime_vfx_atlas_{batch_index + 1}.png"


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
            f"Cell {index}: {selected_prompt.item.slot} {selected_prompt.asset_key}, "
            f"{selected_prompt.item.skill_type} skill, "
            f"{selected_prompt.item.render_mode} render target, "
            f"trigger {selected_prompt.item.trigger or 'default'}, "
            f"action {selected_prompt.item.action or 'default'}, "
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
            file_name = f"{item.slot}_{sanitize_file_name(selected_prompt.asset_key)}.png"
            texture_path = output_dir / file_name
            texture.save(texture_path, format="PNG")
            cleanup_runtime_vfx_texture(str(texture_path))


def _delete_stale_runtime_vfx_files(output_dir: Path, keep_file_names: set[str]) -> None:
    resolved_output_dir = output_dir.resolve()
    for file_path in resolved_output_dir.glob("*.png"):
        resolved_file = file_path.resolve()
        if not resolved_file.is_relative_to(resolved_output_dir):
            continue
        if resolved_file.name in keep_file_names:
            continue
        try:
            resolved_file.unlink()
        except OSError:
            continue


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
