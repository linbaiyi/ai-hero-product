from app.schemas.request_schema import HeroGenerateRequest


def build_hero_generation_prompt(req: HeroGenerateRequest) -> str:
    return f"""你是资深游戏英雄策划，请生成结构化英雄设计方案。

游戏类型：{req.game_type}
英雄定位：{req.hero_role}
元素主题：{req.element_theme}
美术风格：{req.art_style}
核心玩法：{req.core_gameplay}
技能数量：{req.skill_count}

请严格输出符合 HeroDesign Schema 的 JSON。
要求：
1. 技能数量尽量严格等于 {req.skill_count}。
2. 技能之间必须有联动，不要随机拼技能。
3. 所有字段都不能为空。
4. 不要输出 Markdown。
5. 不要输出代码块。
6. 只输出 JSON。"""
