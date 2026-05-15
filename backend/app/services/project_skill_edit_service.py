from copy import deepcopy
from pathlib import Path
from typing import Any

from app.clients.image_client import ImageClient
from app.clients.image_client_factory import create_image_client
from app.clients.llm_client import LLMClient
from app.prompts.runtime_vfx_prompts import (
    build_runtime_vfx_negative_prompt,
    build_runtime_vfx_prompt,
)
from app.schemas.hero_schema import SkillDesign
from app.schemas.playable_schema import HeroPlayableSpec, SkillSpec
from app.schemas.project_schema import ProjectSaveRequest, SkillArtifact
from app.schemas.project_skill_edit_schema import (
    EditableSkillSlot,
    ProjectSkillEditRequest,
    ProjectSkillEditResponse,
    RuntimeVfxAssetEditPlan,
)
from app.schemas.runtime_vfx_prompt_schema import RuntimeVfxPromptItem
from app.schemas.runtime_vfx_schema import RuntimeVfxAssetSpec
from app.schemas.vfx_schema import VfxDesign
from app.services.playable_spec_service import ensure_hit_feedback_vfx_events
from app.services.runtime_vfx_generation_service import (
    DEFAULT_DURATION_BY_USAGE,
    DEFAULT_RENDER_MODE_BY_USAGE,
    DEFAULT_SCALE_BY_USAGE,
    MIN_ATLAS_SIZE,
    SelectedPrompt,
    _atlas_grid,
    _build_atlas_negative_prompt,
    _build_atlas_prompt,
    _crop_atlas_textures,
)
from app.services.runtime_vfx_image_postprocess import cleanup_runtime_vfx_texture
from app.services.runtime_vfx_prompt_service import RuntimeVfxPromptService
from app.storage.file_storage import (
    get_runtime_vfx_output_dir,
    resolve_runtime_vfx_file,
    sanitize_file_name,
    sanitize_project_id,
)
from app.storage.project_repository import ProjectRepository


QWER_SLOTS = ["Q", "W", "E", "R"]


class ProjectSkillEditService:
    def __init__(
        self,
        project_repository: ProjectRepository,
        llm_client: LLMClient | None = None,
        image_client: ImageClient | None = None,
        prompt_service: RuntimeVfxPromptService | None = None,
    ) -> None:
        self.project_repository = project_repository
        self.llm_client = llm_client
        self.image_client = image_client
        self.prompt_service = prompt_service or RuntimeVfxPromptService()

    def edit_skill(
        self,
        project_id: str,
        slot: EditableSkillSlot,
        request: ProjectSkillEditRequest,
    ) -> ProjectSkillEditResponse:
        record = self.project_repository.get_project(project_id)
        data = record.model_dump()
        normalized_slot = _normalize_slot(slot)

        _replace_hero_skill(data, normalized_slot, request, self.llm_client)
        _replace_vfx_design(data, normalized_slot, request)
        _replace_playable_skill(data, normalized_slot, request, self.llm_client)
        _replace_runtime_vfx_skill_assets(
            data,
            normalized_slot,
            request,
            self.llm_client,
            self.image_client,
            self.prompt_service,
        )
        _update_skill_locks_and_artifacts(data, normalized_slot)

        save_request = ProjectSaveRequest.model_validate(
            {
                key: value
                for key, value in data.items()
                if key not in {"created_at", "updated_at"}
            }
        )
        updated = self.project_repository.save_project(save_request)
        return ProjectSkillEditResponse(
            project=updated,
            changed_slot=normalized_slot,
            preserved_slots=[item for item in QWER_SLOTS if item != normalized_slot],
        )


def _replace_hero_skill(
    data: dict[str, Any],
    slot: str,
    request: ProjectSkillEditRequest,
    llm_client: LLMClient | None,
) -> None:
    skills = data["hero_design"]["skills"]
    index = _find_hero_skill_index(skills, slot)
    if index is None:
        raise ValueError(f"Project does not contain hero skill slot {slot}")

    if request.replacement_skill_design is not None:
        replacement = SkillDesign.model_validate(request.replacement_skill_design)
        skills[index] = replacement.model_dump()
        return

    if llm_client is not None:
        replacement = _generate_single_skill_design(
            llm_client,
            data["hero_design"],
            skills[index],
            slot,
            request.edit_instruction,
        )
        if replacement is not None:
            skills[index] = replacement
            return

    skills[index] = _annotate_skill_design(skills[index], request.edit_instruction)


def _generate_single_skill_design(
    llm_client: LLMClient,
    hero_design: dict[str, Any],
    original_skill: dict[str, Any],
    slot: str,
    edit_instruction: str,
) -> dict[str, Any] | None:
    prompt = _build_single_skill_edit_prompt(
        hero_design,
        _clean_skill_text_fields(original_skill),
        slot,
        edit_instruction,
    )
    try:
        raw_skill = llm_client.generate_json(prompt, schema_name="project_skill_edit")
        replacement = SkillDesign.model_validate(raw_skill).model_dump()
        replacement["slot"] = original_skill.get("slot") or slot
        return _finalize_skill_design_texts(
            replacement,
            original_skill,
            edit_instruction,
        )
    except Exception:
        return None


def _build_single_skill_edit_prompt(
    hero_design: dict[str, Any],
    original_skill: dict[str, Any],
    slot: str,
    edit_instruction: str,
) -> str:
    return (
        "You are editing exactly one hero skill. Return only one SkillDesign JSON object.\n"
        f"Hero name: {hero_design.get('hero_name')}\n"
        f"Hero role: {hero_design.get('role')}\n"
        f"Hero combat style: {hero_design.get('combat_style')}\n"
        f"Target slot: {slot}\n"
        f"Original skill before this edit: {original_skill}\n"
        f"Edit instruction: {edit_instruction}\n"
        "Rules: preserve the same slot, do not rewrite other skills, no markdown, JSON only. "
        "Rewrite description, mechanics, and balance_notes as complete final skill text. "
        "Integrate the edit into the old skill meaning instead of appending a change note. "
        "Do not include 'Edit instruction', 'modified', 'after edit', '修改后', revision logs, "
        "or the raw user instruction in any output field."
    )


def _replace_vfx_design(
    data: dict[str, Any],
    slot: str,
    request: ProjectSkillEditRequest,
) -> None:
    if request.replacement_vfx_design is None:
        return

    replacement = VfxDesign.model_validate(request.replacement_vfx_design).model_dump()
    hero_skill = _hero_skill_for_slot(data, slot)
    old_skill_name = hero_skill.get("name")
    vfx_designs = data.get("vfx_designs", [])
    for index, design in enumerate(vfx_designs):
        if (
            design.get("skill_name") == old_skill_name
            or design.get("skill_name") == replacement["skill_name"]
        ):
            vfx_designs[index] = replacement
            return
    vfx_designs.append(replacement)


def _replace_playable_skill(
    data: dict[str, Any],
    slot: str,
    request: ProjectSkillEditRequest,
    llm_client: LLMClient | None,
) -> None:
    playable_spec = data.get("playable_spec")
    if not playable_spec:
        return

    skills = playable_spec.get("skills", [])
    for index, skill in enumerate(skills):
        if skill.get("slot") != slot:
            continue
        if request.replacement_playable_skill_spec is not None:
            replacement = SkillSpec.model_validate(request.replacement_playable_skill_spec)
            skills[index] = _finalize_edited_playable_skill(
                data,
                slot,
                replacement.model_dump(),
                request.edit_instruction,
            )
        else:
            replacement = _generate_single_playable_skill(
                llm_client,
                data,
                skill,
                slot,
                request.edit_instruction,
            )
            skills[index] = _finalize_edited_playable_skill(
                data,
                slot,
                replacement,
                request.edit_instruction,
            )
        return


def _finalize_edited_playable_skill(
    data: dict[str, Any],
    slot: str,
    skill: dict[str, Any],
    edit_instruction: str,
) -> dict[str, Any]:
    try:
        target_hero_skill = _hero_skill_for_slot(data, slot)
    except ValueError:
        target_hero_skill = None
    mapped = ensure_hit_feedback_vfx_events(
        {"skills": [deepcopy(skill)]},
        {
            "hero_skill": target_hero_skill,
            "target_slot": slot,
            "edit_instruction": edit_instruction,
        },
    )
    return SkillSpec.model_validate(mapped["skills"][0]).model_dump()


def _replace_runtime_vfx_skill_assets(
    data: dict[str, Any],
    slot: str,
    request: ProjectSkillEditRequest,
    llm_client: LLMClient | None,
    image_client: ImageClient | None,
    prompt_service: RuntimeVfxPromptService,
) -> None:
    runtime_spec = data.get("runtime_vfx_asset_spec")
    playable_spec = data.get("playable_spec")
    if not runtime_spec or not playable_spec:
        return

    parsed_playable = HeroPlayableSpec.model_validate(playable_spec)
    parsed_runtime = RuntimeVfxAssetSpec.model_validate(runtime_spec)
    target_skill = next((skill for skill in parsed_playable.skills if skill.slot == slot), None)
    if target_skill is None:
        return

    prompt_response = prompt_service.generate_prompts(
        {
            "playable_spec": parsed_playable.model_dump(),
            "runtime_vfx_asset_spec": None,
            "transparent_background": True,
        }
    )
    slot_prompts = [item for item in prompt_response.prompts if item.slot == slot]
    slot_prompts = _with_instruction_specific_runtime_prompts(
        slot_prompts,
        target_skill,
        request.edit_instruction,
    )
    required_usages = {item.usage for item in slot_prompts}
    old_skill_spec = parsed_runtime.skills[slot]
    old_assets = old_skill_spec.assets
    old_asset_keys = set(old_assets.keys())
    old_asset_by_usage = {asset.usage: (key, asset) for key, asset in old_assets.items()}
    edit_plan = _plan_runtime_vfx_asset_edits(
        llm_client=llm_client,
        old_skill_spec=old_skill_spec.model_dump(),
        target_skill=target_skill,
        edit_instruction=request.edit_instruction,
        candidate_usages=required_usages,
    )
    visual_texture_change = False
    if edit_plan is not None:
        required_usages = _required_usages_from_plan(
            old_usages=set(old_asset_by_usage.keys()),
            plan=edit_plan,
            skill_type=target_skill.type,
        )
        regenerate_usages = set(edit_plan.regenerate_usages) | (
            set(edit_plan.add_usages) - set(old_asset_by_usage.keys())
        )
    else:
        visual_texture_change = (
            old_skill_spec.skill_type != target_skill.type
            or _instruction_changes_visuals(request.edit_instruction)
        )
        regenerate_usages = {
            item.usage
            for item in slot_prompts
            if visual_texture_change
            and _should_regenerate_runtime_texture(
                usage=item.usage,
                edit_instruction=request.edit_instruction,
                old_skill_type=old_skill_spec.skill_type,
                new_skill_type=target_skill.type,
            )
        }
    missing_prompt_usages = required_usages - {item.usage for item in slot_prompts}
    if missing_prompt_usages:
        slot_prompts = _with_missing_runtime_prompts(
            slot_prompts,
            target_skill,
            missing_prompt_usages,
            request.edit_instruction,
        )

    missing_prompt_usages = required_usages - {item.usage for item in slot_prompts}
    if missing_prompt_usages:
        raise RuntimeError(
            "Runtime VFX edit plan requested unsupported usages: "
            f"{sorted(missing_prompt_usages)}"
        )

    regenerate_usages = regenerate_usages & required_usages

    next_assets: dict[str, dict[str, Any]] = {}
    removed_paths: list[str] = []
    for key, asset in old_assets.items():
        if asset.usage in required_usages and asset.usage not in regenerate_usages:
            next_assets[key] = asset.model_dump(exclude_none=True)
        else:
            removed_paths.append(asset.path)

    required_missing_usages = _missing_required_runtime_usages(
        target_skill.type,
        {asset["usage"] for asset in next_assets.values()},
    )
    missing_prompts = [
        item
        for item in slot_prompts
        if (asset_key := _runtime_asset_key_for_prompt_item(item))
        and item.usage in required_usages
        and (
            item.usage in regenerate_usages
            or asset_key not in old_asset_keys
            and (visual_texture_change or item.usage in required_missing_usages)
        )
    ]
    if missing_prompts:
        client = image_client or create_image_client()
        output_dir, asset_base_path = _runtime_output_location_for_project(
            parsed_playable.hero.id,
            data.get("project_id"),
        )
        try:
            _generate_runtime_vfx_edit_textures(
                client=client,
                prompts=missing_prompts,
                output_dir=output_dir,
                slot=slot,
            )
        except Exception as exc:
            raise RuntimeError(
                f"Runtime VFX texture regeneration failed for {slot}: {exc}"
            ) from exc

        for item in missing_prompts:
            asset_key = _runtime_asset_key_for_prompt_item(item)
            file_name = f"{slot}_{sanitize_file_name(asset_key)}.png"
            next_assets[asset_key] = {
                "path": f"{asset_base_path}/{file_name}",
                "usage": item.usage,
                "blend_mode": "additive",
                "render_mode": DEFAULT_RENDER_MODE_BY_USAGE[item.usage],
                "scale": DEFAULT_SCALE_BY_USAGE[item.usage],
                "duration": DEFAULT_DURATION_BY_USAGE[item.usage],
                "loop": _should_loop_runtime_asset(item.skill_type, item.usage),
                "color_tint": target_skill.vfx.color,
            }

    updated_runtime = parsed_runtime.model_dump()
    updated_runtime["skills"][slot] = {
        "skill_name": target_skill.name,
        "skill_type": target_skill.type,
        "assets": next_assets,
    }
    validated_runtime = RuntimeVfxAssetSpec.model_validate(updated_runtime)

    next_paths = {
        asset["path"]
        for asset in next_assets.values()
        if isinstance(asset, dict) and isinstance(asset.get("path"), str)
    }
    for removed_path in removed_paths:
        if removed_path not in next_paths:
            _delete_runtime_vfx_file_if_exists(removed_path)

    data["runtime_vfx_asset_spec"] = validated_runtime.model_dump()


def _generate_runtime_vfx_edit_textures(
    client: ImageClient,
    prompts: list[RuntimeVfxPromptItem],
    output_dir: Path,
    slot: str,
) -> None:
    if not prompts:
        return

    selected = [SelectedPrompt(item, _runtime_asset_key_for_prompt_item(item)) for item in prompts]
    grid = _atlas_grid(len(selected))
    atlas_path = output_dir / f"_{slot}_runtime_vfx_edit_atlas.png"
    client.generate_image(
        prompt=_build_atlas_prompt(selected, transparent_background=True),
        negative_prompt=_build_atlas_negative_prompt(),
        save_path=str(atlas_path),
        width=MIN_ATLAS_SIZE,
        height=MIN_ATLAS_SIZE,
    )
    _crop_atlas_textures(
        atlas_path=atlas_path,
        selected=selected,
        output_dir=output_dir,
        grid=grid,
    )


def _generate_single_playable_skill(
    llm_client: LLMClient | None,
    data: dict[str, Any],
    original_skill: dict[str, Any],
    slot: str,
    edit_instruction: str,
) -> dict[str, Any]:
    if llm_client is not None:
        prompt = _build_single_playable_skill_edit_prompt(
            data,
            _clean_skill_text_fields(original_skill),
            slot,
            edit_instruction,
        )
        try:
            raw_skill = llm_client.generate_json(
                prompt,
                schema_name="project_playable_skill_edit",
            )
            replacement = SkillSpec.model_validate(raw_skill).model_dump()
            replacement["slot"] = slot
            return _clean_skill_text_fields(replacement)
        except Exception:
            pass

    updated = deepcopy(original_skill)
    description = _strip_edit_instruction_lines(str(updated.get("description", ""))).strip()
    updated["description"] = _fallback_rewrite_description(description, edit_instruction)
    _apply_status_effect_hint(updated, edit_instruction)
    return SkillSpec.model_validate(updated).model_dump()


def _runtime_asset_key_for_prompt_item(item: RuntimeVfxPromptItem) -> str:
    parts = [item.usage]
    if item.trigger:
        parts.append(item.trigger.removeprefix("on_"))
    if item.action:
        parts.append(item.action)
    if item.effect_index is not None:
        parts.append(str(item.effect_index))
    return "_".join(parts)


def _runtime_output_location_for_project(
    hero_id: str,
    project_id: str | None,
) -> tuple[Path, str]:
    if project_id:
        safe_id = sanitize_project_id(project_id)
        relative_base = f"runtime_vfx/{safe_id}"
    else:
        safe_id = sanitize_project_id(hero_id)
        relative_base = f"runtime_vfx/generated/{safe_id}"
    return get_runtime_vfx_output_dir(relative_base), relative_base


def _should_loop_runtime_asset(skill_type: str, usage: str) -> bool:
    return usage == "aura" or (
        usage == "ground_decal" and skill_type in {"aoe_dot", "summon"}
    )


def _plan_runtime_vfx_asset_edits(
    llm_client: LLMClient | None,
    old_skill_spec: dict[str, Any],
    target_skill: SkillSpec,
    edit_instruction: str,
    candidate_usages: set[str],
) -> RuntimeVfxAssetEditPlan | None:
    if llm_client is None:
        return None

    old_usages = sorted(
        {
            asset.get("usage")
            for asset in (old_skill_spec.get("assets") or {}).values()
            if isinstance(asset, dict) and asset.get("usage")
        }
    )
    candidate_usage_text = sorted(candidate_usages | set(old_usages))
    previous_errors: list[str] = []

    for _ in range(2):
        prompt = _build_runtime_vfx_asset_edit_plan_prompt(
            old_skill_spec=old_skill_spec,
            target_skill=target_skill,
            edit_instruction=edit_instruction,
            old_usages=old_usages,
            candidate_usages=candidate_usage_text,
            previous_errors=previous_errors,
        )
        try:
            raw_plan = llm_client.generate_json(
                prompt,
                schema_name="project_runtime_vfx_edit_plan",
            )
            plan = RuntimeVfxAssetEditPlan.model_validate(raw_plan)
            _validate_runtime_vfx_asset_edit_plan(
                plan=plan,
                old_usages=set(old_usages),
                candidate_usages=set(candidate_usage_text),
                skill_type=target_skill.type,
            )
            return plan
        except Exception as exc:
            previous_errors.append(str(exc))

    return None


def _build_runtime_vfx_asset_edit_plan_prompt(
    old_skill_spec: dict[str, Any],
    target_skill: SkillSpec,
    edit_instruction: str,
    old_usages: list[str],
    candidate_usages: list[str],
    previous_errors: list[str],
) -> str:
    retry_note = ""
    if previous_errors:
        retry_note = (
            "\nPrevious output was invalid. Fix these errors and return precise JSON only: "
            f"{previous_errors[-1]}"
        )
    return (
        "You are planning runtime VFX texture asset changes for exactly one edited skill.\n"
        "Return only this JSON shape:\n"
        "{"
        '"keep_usages":["..."],'
        '"regenerate_usages":["..."],'
        '"add_usages":["..."],'
        '"remove_usages":["..."],'
        '"reason":"short reason"'
        "}\n"
        f"Allowed usages: {', '.join(sorted(DEFAULT_RENDER_MODE_BY_USAGE.keys()))}.\n"
        "Rules:\n"
        "- keep_usages: existing textures that still match and must not be regenerated.\n"
        "- regenerate_usages: existing textures whose visual meaning changed.\n"
        "- add_usages: new textures needed by the edited skill.\n"
        "- remove_usages: old textures no longer used.\n"
        "- Do not put the same usage in more than one action list.\n"
        "- If the edit says summon body/creature is unchanged, keep summon_body.\n"
        "- If the edit adds fire sea/burning ground/fire field, add or regenerate ground_decal.\n"
        "- If the edit adds hit feedback, impact, explosion, burn-on-hit, or contact burst, add or regenerate hit_flash and impact.\n"
        "- If the edited playable skill applies burn/poison/mark/stun/slow status, add or regenerate the matching status usage such as burn_loop, poison_cloud, mark_sigil, stun_stars, or status_loop.\n"
        "- Never remove the minimum required usage for the new skill type.\n"
        f"Original runtime VFX skill spec: {old_skill_spec}\n"
        f"Existing usages: {old_usages}\n"
        f"Candidate usages that can be generated: {candidate_usages}\n"
        f"Edited playable skill: {target_skill.model_dump()}\n"
        f"User edit instruction: {edit_instruction}"
        f"{retry_note}"
    )


def _validate_runtime_vfx_asset_edit_plan(
    plan: RuntimeVfxAssetEditPlan,
    old_usages: set[str],
    candidate_usages: set[str],
    skill_type: str,
) -> None:
    all_planned_usages = (
        set(plan.keep_usages)
        | set(plan.regenerate_usages)
        | set(plan.add_usages)
        | set(plan.remove_usages)
    )
    unknown_usages = all_planned_usages - candidate_usages - old_usages
    if unknown_usages:
        raise ValueError(f"unknown usages in runtime VFX plan: {sorted(unknown_usages)}")

    if not set(plan.keep_usages) <= old_usages:
        raise ValueError("keep_usages may only contain existing usages")
    if not set(plan.regenerate_usages) <= old_usages:
        raise ValueError("regenerate_usages may only contain existing usages")
    if not set(plan.remove_usages) <= old_usages:
        raise ValueError("remove_usages may only contain existing usages")
    if not set(plan.add_usages) <= candidate_usages:
        raise ValueError("add_usages may only contain candidate usages")

    resulting_usages = _required_usages_from_plan(old_usages, plan, skill_type)
    missing_required = _missing_required_runtime_usages(skill_type, resulting_usages)
    if missing_required:
        raise ValueError(
            "runtime VFX plan removes required usages: "
            f"{sorted(missing_required)}"
        )


def _required_usages_from_plan(
    old_usages: set[str],
    plan: RuntimeVfxAssetEditPlan,
    skill_type: str,
) -> set[str]:
    resulting_usages = set(old_usages)
    resulting_usages -= set(plan.remove_usages)
    resulting_usages |= set(plan.add_usages)
    resulting_usages |= set(plan.regenerate_usages)
    resulting_usages |= _missing_required_runtime_usages(skill_type, resulting_usages)
    return resulting_usages


def _with_instruction_specific_runtime_prompts(
    slot_prompts: list[RuntimeVfxPromptItem],
    skill: SkillSpec,
    edit_instruction: str,
) -> list[RuntimeVfxPromptItem]:
    if skill.type != "summon" or not _instruction_requests_fire_sea(edit_instruction):
        return slot_prompts
    if any(item.usage == "ground_decal" for item in slot_prompts):
        return slot_prompts

    prompt = build_runtime_vfx_prompt(
        skill=skill,
        usage="ground_decal",
        render_mode="ground_plane",
        transparent_background=True,
    )
    prompt = (
        f"{prompt}, top-down burning fire sea ground decal at the summon spawn point, "
        "flat circular fire field, continuous burning ground area, no creature body"
    )
    return [
        *slot_prompts,
        _build_runtime_prompt_item(
            skill=skill,
            usage="ground_decal",
            render_mode="ground_plane",
            prompt=prompt,
        ),
    ]


def _with_missing_runtime_prompts(
    slot_prompts: list[RuntimeVfxPromptItem],
    skill: SkillSpec,
    missing_usages: set[str],
    edit_instruction: str,
) -> list[RuntimeVfxPromptItem]:
    next_prompts = list(slot_prompts)
    existing_usages = {item.usage for item in next_prompts}
    for usage in sorted(missing_usages):
        if usage in existing_usages:
            continue
        render_mode = DEFAULT_RENDER_MODE_BY_USAGE.get(usage)
        if render_mode is None:
            continue
        prompt = build_runtime_vfx_prompt(
            skill=skill,
            usage=usage,
            render_mode=render_mode,
            transparent_background=True,
        )
        if usage == "ground_decal" and _instruction_requests_fire_sea(edit_instruction):
            prompt = (
                f"{prompt}, top-down burning fire sea ground decal at the summon spawn point, "
                "flat circular fire field, continuous burning ground area, no creature body"
            )
        next_prompts.append(
            _build_runtime_prompt_item(
                skill=skill,
                usage=usage,
                render_mode=render_mode,
                prompt=prompt,
            )
        )
    return next_prompts


def _build_runtime_prompt_item(
    skill: SkillSpec,
    usage: str,
    render_mode: str,
    prompt: str,
) -> RuntimeVfxPromptItem:
    return RuntimeVfxPromptItem(
        slot=skill.slot,
        skill_name=skill.name,
        skill_type=skill.type,
        usage=usage,  # type: ignore[arg-type]
        render_mode=render_mode,
        prompt=prompt,
        negative_prompt=build_runtime_vfx_negative_prompt(),
        transparent_background=True,
    )


def _instruction_requests_fire_sea(edit_instruction: str) -> bool:
    text = edit_instruction.lower()
    keywords = [
        "fire sea",
        "burning ground",
        "ground fire",
        "fire field",
        "burning field",
        "火海",
        "燃烧地面",
        "地面火",
        "火焰区域",
        "燃烧区域",
        "火海",
        "燃烧地面",
        "地面火",
        "火焰区域",
        "燃烧区域",
    ]
    return any(keyword in text for keyword in keywords)


def _instruction_requests_burn(edit_instruction: str) -> bool:
    text = edit_instruction.lower()
    keywords = [
        "burn",
        "burning",
        "ignite",
        "scorch",
        "灼烧",
        "燃烧",
        "点燃",
        "灼烧",
        "燃烧",
        "点燃",
        "烧灼",
    ]
    return any(keyword in text for keyword in keywords)


def _delete_runtime_vfx_file_if_exists(path: str) -> None:
    try:
        file_path = resolve_runtime_vfx_file(path)
    except Exception:
        return
    try:
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
    except OSError:
        return


def _build_single_playable_skill_edit_prompt(
    data: dict[str, Any],
    original_skill: dict[str, Any],
    slot: str,
    edit_instruction: str,
) -> str:
    return (
        "You are editing exactly one HeroPlayableSpec SkillSpec JSON object.\n"
        "Return only one JSON object that passes the SkillSpec schema.\n"
        f"Hero design: {data.get('hero_design')}\n"
        f"Playable hero: {(data.get('playable_spec') or {}).get('hero')}\n"
        f"Target slot: {slot}\n"
        f"Original playable skill: {original_skill}\n"
        f"Edit instruction: {edit_instruction}\n"
        "Rules: preserve slot, do not output Q/W/E/R list, do not rewrite other skills, "
        "use only supported types projectile/aoe/aoe_dot/dash/buff/summon, no markdown."
    )


def _apply_status_effect_hint(skill: dict[str, Any], edit_instruction: str) -> None:
    text = edit_instruction.lower()
    if not any(keyword in text for keyword in ["burn", "burning", "ignite", "灼烧", "燃烧", "点燃"]):
        return
    effects = skill.setdefault("status_effects", [])
    if not isinstance(effects, list):
        effects = []
        skill["status_effects"] = effects
    if any(isinstance(effect, dict) and effect.get("type") == "burn" for effect in effects):
        return
    base_damage = skill.get("damage")
    damage = 8.0
    if isinstance(base_damage, (int, float)):
        damage = max(4.0, min(30.0, round(float(base_damage) * 0.12, 2)))
    effects.append(
        {
            "type": "burn",
            "duration": 3.0,
            "tick_interval": 1.0,
            "damage": damage,
        }
    )


def _should_regenerate_runtime_texture(
    usage: str,
    edit_instruction: str,
    old_skill_type: str,
    new_skill_type: str,
) -> bool:
    if old_skill_type != new_skill_type:
        return True
    if not _instruction_changes_visuals(edit_instruction):
        return False
    if usage == "summon_body" and _instruction_preserves_summon_body(edit_instruction):
        return False
    return usage in {
        "projectile",
        "impact",
        "hit_flash",
        "ground_decal",
        "aura",
        "trail",
        "summon_body",
        "summon_spawn",
        "summon_expire",
        "status_loop",
        "burn_loop",
        "poison_cloud",
        "mark_sigil",
        "mark_sigial",
        "stun_stars",
    }


def _missing_required_runtime_usages(
    skill_type: str,
    present_usages: set[str],
) -> set[str]:
    if skill_type == "projectile":
        return {"projectile"} - present_usages
    if skill_type == "aoe":
        return set() if {"ground_decal", "impact"} & present_usages else {"ground_decal"}
    if skill_type == "aoe_dot":
        return {"ground_decal"} - present_usages
    if skill_type == "dash":
        return set() if {"trail", "impact"} & present_usages else {"trail"}
    if skill_type == "buff":
        return {"aura"} - present_usages
    if skill_type == "summon":
        return {"summon_body"} - present_usages
    return set()


def _instruction_changes_visuals(edit_instruction: str) -> bool:
    text = edit_instruction.lower()
    preserve_visual_keywords = [
        "visual unchanged",
        "vfx unchanged",
        "texture unchanged",
        "视觉效果不变",
        "特效不变",
        "贴图不变",
        "视觉不变",
    ]
    if any(keyword in text for keyword in preserve_visual_keywords):
        return False
    visual_keywords = [
        "vfx",
        "texture",
        "visual",
        "effect",
        "fire sea",
        "burn",
        "burning ground",
        "ground fire",
        "火海",
        "灼烧",
        "燃烧",
        "地面",
        "召唤物生成",
        "范围",
        "aura",
        "impact",
        "trail",
        "decal",
        "贴图",
        "特效",
        "视觉",
        "火海",
        "火焰",
        "地面",
        "生成地点",
        "召唤物生成",
        "范围",
        "光环",
        "爆炸",
        "拖尾",
        "灼烧",
        "燃烧",
    ]
    return any(keyword in text for keyword in visual_keywords)


def _instruction_preserves_summon_body(edit_instruction: str) -> bool:
    text = edit_instruction.lower()
    preserve_keywords = [
        "keep summon",
        "summon unchanged",
        "do not change summon",
        "保持召唤物",
        "召唤物不变",
        "不改变召唤物",
        "不改召唤物",
        "召唤物不变",
        "保持召唤物",
        "不要改变召唤物",
        "不改召唤物",
        "召唤个体不变",
    ]
    return any(keyword in text for keyword in preserve_keywords)


def _update_skill_locks_and_artifacts(data: dict[str, Any], changed_slot: str) -> None:
    locked_skills = {slot: slot != changed_slot for slot in QWER_SLOTS}
    data["locked_skills"] = locked_skills
    artifacts = dict(data.get("skill_artifacts") or {})
    for slot in QWER_SLOTS:
        artifact = _build_artifact_for_slot(data, slot, locked=locked_skills[slot])
        if artifact is not None:
            artifacts[slot] = artifact.model_dump()
    data["skill_artifacts"] = artifacts


def _build_artifact_for_slot(
    data: dict[str, Any],
    slot: str,
    locked: bool,
) -> SkillArtifact | None:
    skill_design = _hero_skill_for_slot(data, slot)
    if not skill_design:
        return None

    skill_name = skill_design.get("name")
    return SkillArtifact(
        locked=locked,
        skill_design=skill_design,
        vfx_design=next(
            (item for item in data.get("vfx_designs", []) if item.get("skill_name") == skill_name),
            None,
        ),
        image_prompt=next(
            (item for item in data.get("image_prompts", []) if item.get("skill_name") == skill_name),
            None,
        ),
        image_result=next(
            (item for item in data.get("image_results", []) if item.get("skill_name") == skill_name),
            None,
        ),
        playable_skill_spec=next(
            (
                item
                for item in (data.get("playable_spec") or {}).get("skills", [])
                if item.get("slot") == slot
            ),
            None,
        ),
        runtime_vfx_skill_spec=(
            ((data.get("runtime_vfx_asset_spec") or {}).get("skills", {}) or {}).get(slot)
        ),
    )


def _find_hero_skill_index(skills: list[dict[str, Any]], slot: str) -> int | None:
    normalized_slot = _normalize_slot(slot)
    for index, skill in enumerate(skills):
        if _normalize_slot(str(skill.get("slot", ""))) == normalized_slot:
            return index
    return None


def _hero_skill_for_slot(data: dict[str, Any], slot: str) -> dict[str, Any] | None:
    skills = data.get("hero_design", {}).get("skills", [])
    index = _find_hero_skill_index(skills, slot)
    return skills[index] if index is not None else None


def _annotate_skill_design(skill: dict[str, Any], instruction: str) -> dict[str, Any]:
    updated = deepcopy(skill)
    updated["description"] = _fallback_rewrite_description(
        str(updated.get("description", "")),
        instruction,
    )
    updated["mechanics"] = _fallback_rewrite_description(
        str(updated.get("mechanics", "")),
        instruction,
    )
    updated["balance_notes"] = _fallback_rewrite_description(
        str(updated.get("balance_notes", "")),
        instruction,
    )
    return updated


def _fallback_rewrite_description(text: str, instruction: str) -> str:
    clean_text = _strip_edit_instruction_lines(text).strip()
    clean_instruction = _strip_edit_instruction_lines(instruction).strip()
    if not clean_text:
        return _rewrite_instruction_as_final_sentence(clean_instruction)
    if _instruction_semantically_present(clean_text, clean_instruction):
        return clean_text
    if _instruction_requests_fire_sea(clean_instruction):
        return _merge_fire_sea_instruction(clean_text)
    if _instruction_requests_burn(clean_instruction):
        return _merge_burn_instruction(clean_text)
    return _merge_general_instruction(clean_text, clean_instruction)


def _finalize_skill_design_texts(
    skill: dict[str, Any],
    original_skill: dict[str, Any],
    instruction: str,
) -> dict[str, Any]:
    finalized = deepcopy(skill)
    for field in ["description", "mechanics", "balance_notes"]:
        value = str(finalized.get(field, "") or "")
        clean_value = _strip_edit_instruction_lines(value).strip()
        if _contains_revision_marker(clean_value) or _looks_like_raw_instruction_append(
            clean_value,
            instruction,
        ):
            clean_value = _fallback_rewrite_description(
                str(original_skill.get(field, "") or ""),
                instruction,
            )
        finalized[field] = clean_value or _fallback_rewrite_description(
            str(original_skill.get(field, "") or ""),
            instruction,
        )
    return finalized


def _instruction_semantically_present(text: str, instruction: str) -> bool:
    if not instruction:
        return True
    normalized_text = _normalize_text_for_matching(text)
    normalized_instruction = _normalize_text_for_matching(instruction)
    if normalized_instruction and normalized_instruction in normalized_text:
        return True
    if _instruction_requests_fire_sea(instruction):
        return any(keyword in normalized_text for keyword in ["火海", "fire sea", "burning ground"])
    if _instruction_requests_burn(instruction):
        return any(keyword in normalized_text for keyword in ["灼烧", "burn", "burning", "ignite"])
    return False


def _rewrite_instruction_as_final_sentence(instruction: str) -> str:
    if _instruction_requests_fire_sea(instruction):
        return "在目标位置铺开一片持续燃烧的火海，对范围内敌人造成持续伤害并施加灼烧。"
    if _instruction_requests_burn(instruction):
        return "技能命中后会点燃敌人，造成持续灼烧伤害。"
    return _strip_trailing_punctuation(instruction) + "。"


def _merge_fire_sea_instruction(text: str) -> str:
    base = _strip_trailing_punctuation(text)
    if any(keyword in base for keyword in ["召唤", "召喚", "summon", "Summon"]):
        return (
            f"{base}，并在召唤物生成地点铺开一片持续燃烧的火海，"
            "对范围内敌人造成持续伤害并施加灼烧。"
        )
    return f"{base}，同时在目标区域形成持续燃烧的火海，对范围内敌人造成持续伤害并施加灼烧。"


def _merge_burn_instruction(text: str) -> str:
    base = _strip_trailing_punctuation(text)
    return f"{base}，并对受影响的敌人施加灼烧，造成持续伤害。"


def _merge_general_instruction(text: str, instruction: str) -> str:
    base = _strip_trailing_punctuation(text)
    addition = _strip_trailing_punctuation(instruction)
    if not addition:
        return f"{base}。"
    return f"{base}，同时具备{addition}的效果。"


def _contains_revision_marker(text: str) -> bool:
    lowered = text.lower()
    markers = [
        "edit instruction:",
        "after edit:",
        "modified:",
        "revision:",
        "修改后：",
        "修改后:",
        "修改指令：",
        "修改指令:",
    ]
    return any(marker in lowered for marker in markers)


def _looks_like_raw_instruction_append(text: str, instruction: str) -> bool:
    normalized_text = _normalize_text_for_matching(text)
    normalized_instruction = _normalize_text_for_matching(instruction)
    if not normalized_instruction:
        return False
    return normalized_text.endswith(normalized_instruction)


def _normalize_text_for_matching(text: str) -> str:
    return "".join(text.lower().split())


def _strip_trailing_punctuation(text: str) -> str:
    return text.strip().rstrip("。.!！；;，,、 ")


def _clean_skill_text_fields(skill: dict[str, Any]) -> dict[str, Any]:
    cleaned = deepcopy(skill)
    for field in ["description", "mechanics", "balance_notes"]:
        if isinstance(cleaned.get(field), str):
            cleaned[field] = _strip_edit_instruction_lines(cleaned[field]).strip()
    return cleaned


def _strip_edit_instruction_lines(text: str) -> str:
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.lower().startswith("edit instruction:"):
            continue
        if stripped.startswith("修改指令：") or stripped.startswith("修改后："):
            continue
        cleaned = line
        for marker in ["修改后：", "修改后:", "修改指令：", "修改指令:", "Edit instruction:"]:
            cleaned = cleaned.replace(marker, "")
        lines.append(cleaned)
    return "\n".join(lines)


def _normalize_slot(slot: str) -> str:
    normalized = slot.strip().upper()
    if normalized in QWER_SLOTS:
        return normalized
    if normalized in {"PASSIVE", "被动"}:
        return "passive"
    return normalized
