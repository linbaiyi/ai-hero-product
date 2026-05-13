import json
import zipfile
from pathlib import Path

from app.schemas.export_schema import ExportProjectRequest, ExportProjectResult
from app.schemas.project_schema import ProjectRecord
from app.storage.file_storage import (
    get_export_file_path,
    resolve_runtime_vfx_file,
    resolve_output_file,
    sanitize_file_name,
    sanitize_project_id,
    to_backend_relative_path,
)
from app.storage.project_repository import ProjectRepository


DEFAULT_TRAINING_MAP = {
    "id": "default_training_arena",
    "name": "默认英雄训练场",
    "width": 40,
    "depth": 40,
    "hero_spawn": {"x": 0, "z": 0},
    "enemies": [
        {
            "id": "dummy_1",
            "name": "静态木桩 1",
            "type": "dummy",
            "position": {"x": 8, "z": 0},
            "max_hp": 500,
            "radius": 0.8,
            "behavior": "static",
        },
        {
            "id": "dummy_2",
            "name": "静态木桩 2",
            "type": "dummy",
            "position": {"x": 12, "z": 4},
            "max_hp": 500,
            "radius": 0.8,
            "behavior": "static",
        },
        {
            "id": "dummy_3",
            "name": "静态木桩 3",
            "type": "dummy",
            "position": {"x": 12, "z": -4},
            "max_hp": 500,
            "radius": 0.8,
            "behavior": "static",
        },
        {
            "id": "melee_1",
            "name": "近战测试怪",
            "type": "melee",
            "position": {"x": -8, "z": 5},
            "max_hp": 300,
            "radius": 0.9,
            "behavior": "static",
        },
        {
            "id": "ranged_1",
            "name": "远程测试怪",
            "type": "ranged",
            "position": {"x": -10, "z": -6},
            "max_hp": 250,
            "radius": 0.8,
            "behavior": "static",
        },
    ],
    "obstacles": [
        {
            "id": "box_1",
            "position": {"x": 4, "z": 5},
            "width": 2,
            "depth": 4,
            "height": 1,
        },
        {
            "id": "box_2",
            "position": {"x": -5, "z": -4},
            "width": 4,
            "depth": 2,
            "height": 1,
        },
        {
            "id": "box_3",
            "position": {"x": 0, "z": 10},
            "width": 6,
            "depth": 1.5,
            "height": 1,
        },
    ],
}


class ProjectExportService:
    def __init__(self, project_repository: ProjectRepository) -> None:
        self.project_repository = project_repository

    def export_project(
        self, project_id: str, req: ExportProjectRequest
    ) -> ExportProjectResult:
        safe_project_id = sanitize_project_id(project_id)
        record = self.project_repository.get_project(safe_project_id)
        export_path = get_export_file_path(safe_project_id)

        try:
            with zipfile.ZipFile(export_path, "w", zipfile.ZIP_DEFLATED) as archive:
                if req.include_json:
                    archive.writestr(
                        "project.json",
                        json.dumps(record.model_dump(), ensure_ascii=False, indent=2),
                    )

                if req.include_markdown:
                    archive.writestr("docs/hero_design.md", _build_hero_markdown(record))
                    archive.writestr("docs/vfx_design.md", _build_vfx_markdown(record))

                if req.include_images:
                    _add_images_to_zip(archive, record)

                if req.include_board:
                    _add_board_to_zip(archive, record)

                if req.include_playable:
                    _add_playable_to_zip(archive, record)

                if req.include_runtime_vfx:
                    _add_runtime_vfx_to_zip(archive, record)
        except Exception as exc:
            return ExportProjectResult(
                project_id=safe_project_id,
                export_path=to_backend_relative_path(export_path),
                file_name=export_path.name,
                success=False,
                error_message=f"项目导出失败：{exc}",
            )

        return ExportProjectResult(
            project_id=safe_project_id,
            export_path=to_backend_relative_path(export_path),
            file_name=export_path.name,
        )


def _build_hero_markdown(record: ProjectRecord) -> str:
    hero = record.hero_design
    lines = [
        f"# {hero.hero_name}",
        "",
        f"- 英雄称号：{hero.hero_title}",
        f"- 定位：{hero.role}",
        f"- 难度：{hero.difficulty}",
        f"- 核心标签：{', '.join(hero.core_tags)}",
        "",
        "## 背景故事",
        hero.background,
        "",
        "## 战斗风格",
        hero.combat_style,
        "",
        "## 技能列表",
    ]

    for skill in hero.skills:
        lines.extend(
            [
                "",
                f"### {skill.slot} · {skill.name}",
                f"- 类型：{skill.type}",
                f"- 描述：{skill.description}",
                f"- 机制：{skill.mechanics}",
                f"- 冷却：{skill.cooldown}",
                f"- 消耗：{skill.cost}",
                f"- 伤害类型：{skill.damage_type}",
                f"- 平衡说明：{skill.balance_notes}",
            ]
        )

    lines.extend(
        [
            "",
            "## 连招逻辑",
            hero.combo_logic,
            "",
            "## 克制关系",
            hero.counterplay,
            "",
            "## 平衡性总结",
            hero.balance_summary,
            "",
        ]
    )
    return "\n".join(lines)


def _build_vfx_markdown(record: ProjectRecord) -> str:
    lines = ["# 技能特效拆解", ""]
    prompt_by_skill = {
        prompt.skill_name: prompt.prompt for prompt in record.image_prompts
    }

    for vfx in record.vfx_designs:
        lines.extend(
            [
                f"## {vfx.skill_name}",
                "",
                f"- VFX 分类：{vfx.vfx_category}",
                f"- 视觉关键词：{', '.join(vfx.visual_keywords)}",
                f"- 色彩方案：{json.dumps(vfx.color_palette, ensure_ascii=False)}",
                f"- 镜头建议：{vfx.camera_suggestion}",
                f"- 声音建议：{vfx.sound_suggestion}",
                "",
                "### 阶段拆解",
            ]
        )

        for stage in vfx.stages:
            lines.append(f"- **{stage.stage}**：{stage.description}")

        image_prompt = vfx.image_prompt or prompt_by_skill.get(vfx.skill_name)
        if image_prompt:
            lines.extend(["", "### 图像 Prompt", image_prompt])

        lines.append("")

    return "\n".join(lines)


def _add_images_to_zip(archive: zipfile.ZipFile, record: ProjectRecord) -> None:
    used_names: set[str] = set()

    for index, image_result in enumerate(record.image_results, start=1):
        if not image_result.success:
            continue

        source_path = _existing_output_file(image_result.image_path)
        if source_path is None:
            continue

        safe_name = sanitize_file_name(image_result.file_name or image_result.skill_name)
        if not safe_name.lower().endswith(".png"):
            safe_name = f"{safe_name}.png"
        if safe_name in used_names:
            safe_name = f"{index}_{safe_name}"
        used_names.add(safe_name)
        archive.write(source_path, f"images/{safe_name}")


def _add_board_to_zip(archive: zipfile.ZipFile, record: ProjectRecord) -> None:
    if not record.board_result or not record.board_result.success:
        return

    source_path = _existing_output_file(record.board_result.board_path)
    if source_path is None:
        return

    archive.write(source_path, "board/vfx_board.png")


def _add_playable_to_zip(archive: zipfile.ZipFile, record: ProjectRecord) -> None:
    archive.writestr(
        "playable/README.md",
        _build_playable_readme(record),
    )
    archive.writestr(
        "playable/default_training_map.json",
        json.dumps(DEFAULT_TRAINING_MAP, ensure_ascii=False, indent=2),
    )

    if record.playable_spec is not None:
        archive.writestr(
            "playable/hero_playable_spec.json",
            json.dumps(record.playable_spec.model_dump(), ensure_ascii=False, indent=2),
        )


def _add_runtime_vfx_to_zip(archive: zipfile.ZipFile, record: ProjectRecord) -> None:
    warnings: list[str] = []

    if record.runtime_vfx_asset_spec is None:
        archive.writestr(
            "playable/runtime_vfx/README.md",
            _build_runtime_vfx_readme(record, ["当前项目尚未生成 runtime_vfx_asset_spec。"]),
        )
        return

    archive.writestr(
        "playable/runtime_vfx/runtime_vfx_asset_spec.json",
        json.dumps(
            record.runtime_vfx_asset_spec.model_dump(),
            ensure_ascii=False,
            indent=2,
        ),
    )

    used_names: set[str] = set()
    for slot, skill in record.runtime_vfx_asset_spec.skills.items():
        for asset_key, asset in skill.assets.items():
            source_path = _existing_runtime_vfx_file(asset.path)
            if source_path is None:
                warnings.append(f"Missing or unsafe texture: {slot} {asset_key} -> {asset.path}")
                continue

            safe_name = sanitize_file_name(f"{slot}_{asset.usage}.png")
            if safe_name in used_names:
                safe_name = sanitize_file_name(f"{slot}_{asset_key}_{asset.usage}.png")
            used_names.add(safe_name)
            archive.write(source_path, f"playable/runtime_vfx/textures/{safe_name}")

    archive.writestr(
        "playable/runtime_vfx/README.md",
        _build_runtime_vfx_readme(record, warnings),
    )


def _build_playable_readme(record: ProjectRecord) -> str:
    lines = [
        "# Playable Hero Demo Package",
        "",
        "## Contents",
        "",
        "- `hero_playable_spec.json`: AI-generated playable hero configuration.",
        "- `default_training_map.json`: Default training arena configuration.",
        "- `README.md`: Package notes and runtime instructions.",
        "",
    ]

    if record.playable_spec is None:
        lines.extend(
            [
                "## Playable Spec",
                "",
                "当前项目尚未生成 playable_spec。",
                "请在桌面端 Blueprint 页面点击“生成试玩配置”后重新导出。",
                "",
            ]
        )
    else:
        spec = record.playable_spec
        lines.extend(
            [
                "## Hero",
                "",
                f"- Name: {spec.hero.name}",
                f"- Role: {spec.hero.role}",
                f"- Skill count: {len(spec.skills)}",
                "",
                "## Skills",
                "",
            ]
        )
        for skill in spec.skills:
            lines.append(f"- {skill.slot}: {skill.name} (`{skill.type}`)")
        lines.append("")

    lines.extend(
        [
            "## Runtime",
            "",
            "This package is not a standalone game executable.",
            "It must be loaded by the AI Game Hero Design Assistant Playtest Runtime or a compatible runtime.",
            "The client reads structured JSON only and must not execute scripts from package data.",
            "",
            "## Controls",
            "",
            "- WASD / Arrow Keys: Move",
            "- 1 / 2 / 3 / 4: Cast Q / W / E / R",
            "- Reset: Reset the training arena",
            "",
            "## Safety",
            "",
            "- HeroPlayableSpec contains no executable scripts.",
            "- Runtime must not execute `eval`, `Function`, remote code, or arbitrary scripts.",
            "- Unknown fields should be ignored or reported as warnings, not executed.",
            "",
            "## Protocol",
            "",
            "- HeroPlayableSpec version: 1.0",
            "- map_profile: default_training_arena",
            "",
        ]
    )
    return "\n".join(lines)


def _build_runtime_vfx_readme(record: ProjectRecord, warnings: list[str]) -> str:
    lines = [
        "# Runtime VFX Texture Assets",
        "",
        "## Contents",
        "",
        "- `runtime_vfx_asset_spec.json`: Structured runtime texture asset mapping.",
        "- `textures/`: Generated runtime texture PNG files when available.",
        "- `README.md`: Runtime texture usage notes.",
        "",
        "## Asset Usage",
        "",
        "- `projectile`: 弹道主体。",
        "- `impact`: 命中爆炸 / 冲击。",
        "- `ground_decal`: 地面范围 / 法阵。",
        "- `aura`: buff 光环。",
        "- `trail`: 拖尾。",
        "",
        "## Runtime Notes",
        "",
        "These textures are for the Playtest Renderer.",
        "They are not display images or final design board images.",
        "The client should load them according to RuntimeVfxAssetSpec.",
        "Missing textures should fallback to default geometry/material effects.",
        "",
        "## Safety",
        "",
        "- Do not execute scripts from this package.",
        "- Do not load remote code.",
        "- Texture paths must be safe relative paths.",
        "",
    ]

    if record.runtime_vfx_asset_spec is None:
        lines.extend(
            [
                "## Runtime VFX Spec",
                "",
                "当前项目尚未生成 runtime_vfx_asset_spec。",
                "",
            ]
        )

    if warnings:
        lines.extend(["## Warnings", ""])
        for warning in warnings:
            lines.append(f"- {warning}")
        lines.append("")

    return "\n".join(lines)


def _existing_output_file(path: str) -> Path | None:
    try:
        source_path = resolve_output_file(path)
    except (ValueError, PermissionError):
        return None

    if not source_path.exists() or not source_path.is_file():
        return None

    return source_path


def _existing_runtime_vfx_file(path: str) -> Path | None:
    try:
        source_path = resolve_runtime_vfx_file(path)
    except (ValueError, PermissionError):
        return None

    if not source_path.exists() or not source_path.is_file():
        return None

    return source_path
