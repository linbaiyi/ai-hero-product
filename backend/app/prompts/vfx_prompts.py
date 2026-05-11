from app.schemas.hero_schema import SkillDesign


def build_vfx_breakdown_prompt(
    hero_name: str,
    element_theme: str,
    art_style: str,
    skill: SkillDesign,
) -> str:
    return f"""你是资深游戏特效设计师，请把英雄技能拆解为可落地的技能特效设计方案。
英雄名称：{hero_name}
元素主题：{element_theme}
美术风格：{art_style}
技能名称：{skill.name}
技能类型：{skill.type}
技能描述：{skill.description}
技能机制：{skill.mechanics}

请严格输出符合 VfxDesign Schema 的 JSON。要求：
1. stages 至少 5 个。
2. stages 必须包含：施法前摇、技能主体、飞行轨迹或范围展开、命中反馈、残留效果。
3. visual_keywords 不少于 4 个。
4. color_palette 必须包含可用于视觉设计的色值。
5. color_palette 的所有 value 必须是纯 #RRGGBB hex 字符串，例如 "#FFD700"。
6. color_palette 的 value 不允许附带颜色名称、中文说明、括号、逗号或任何额外文本。
7. 不要输出 Markdown。
8. 不要输出代码块。
9. 只输出 JSON。"""
