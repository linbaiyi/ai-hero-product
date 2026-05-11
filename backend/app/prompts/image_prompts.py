from app.schemas.vfx_schema import VfxDesign


def build_image_prompt_generation_prompt(
    vfx_design: VfxDesign,
    style_hint: str | None = None,
) -> str:
    stages = "\n".join(
        f"- {stage.stage}: {stage.description}" for stage in vfx_design.stages
    )
    palette = ", ".join(
        f"{name}: {value}" for name, value in vfx_design.color_palette.items()
    )
    keywords = ", ".join(vfx_design.visual_keywords)

    return f"""你是一个游戏概念美术 Prompt 工程师，需要把技能特效拆解转成英文图像生成 Prompt。

skill_name: {vfx_design.skill_name}
vfx_category: {vfx_design.vfx_category}
visual_keywords: {keywords}
stages:
{stages}
color_palette: {palette}
camera_suggestion: {vfx_design.camera_suggestion}
sound_suggestion: {vfx_design.sound_suggestion}
style_hint: {style_hint or "high-end game VFX concept art"}

请严格输出符合 ImagePromptResult Schema 的 JSON。
要求：
1. prompt 必须是英文。
2. prompt 必须包含：game VFX concept art、dark background、no text、no logo、no watermark。
3. 只生成单个技能特效缩略图。
4. 不要生成整张设计板。
5. 不要输出 Markdown。
6. 不要输出代码块。
7. 只输出 JSON。"""
