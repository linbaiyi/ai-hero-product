def make_skill(name: str = "烈焰冲击") -> dict:
    return {
        "slot": "一技能",
        "name": name,
        "type": "主动",
        "description": "释放一道火焰冲击波。",
        "mechanics": "命中后附加灼烧。",
        "cooldown": "8秒",
        "cost": "40法力",
        "damage_type": "魔法伤害",
        "balance_notes": "需要明显前摇。",
    }


def make_hero_design() -> dict:
    return {
        "hero_name": "焚烬法皇",
        "hero_title": "灰烬王座的咒火者",
        "role": "法师",
        "difficulty": 4,
        "core_tags": ["火焰", "范围爆发"],
        "background": "来自熔火遗迹的英雄。",
        "combat_style": "依靠范围爆发和持续灼烧压制战场。",
        "skills": [make_skill()],
        "combo_logic": "先叠加灼烧，再用终极技能引爆。",
        "counterplay": "拉开距离并躲避前摇。",
        "balance_summary": "爆发高但机动性弱。",
    }


def make_vfx_design(skill_name: str = "烈焰冲击") -> dict:
    return {
        "skill_name": skill_name,
        "vfx_category": "AOE / Impact / Fire",
        "visual_keywords": ["火焰", "余烬", "爆裂", "灼烧"],
        "stages": [
            {"stage": "施法前摇", "description": "聚集橙红色火焰。"},
            {"stage": "技能主体", "description": "释放宽幅火焰冲击。"},
            {"stage": "飞行轨迹", "description": "拖出灼烧轨迹。"},
            {"stage": "命中反馈", "description": "产生火花爆裂。"},
        ],
        "color_palette": {"main": "#FF5A1F", "secondary": "#FFC15A"},
        "camera_suggestion": "命中时加入轻微震屏。",
        "sound_suggestion": "火焰喷涌声。",
        "image_prompt": None,
    }


def make_image_result(skill_name: str = "烈焰冲击", **overrides: object) -> dict:
    data = {
        "skill_name": skill_name,
        "image_path": "outputs/images/demo/skill_fire.png",
        "file_name": "skill_fire.png",
        "width": 512,
        "height": 512,
        "success": True,
        "error_message": None,
    }
    data.update(overrides)
    return data


def make_board_request(**overrides: object) -> dict:
    data = {
        "project_id": "board_demo_001",
        "hero_design": make_hero_design(),
        "vfx_designs": [make_vfx_design()],
        "image_results": [make_image_result()],
        "board_title": "焚烬法皇 技能特效设计稿",
        "width": 1600,
        "height": 2400,
    }
    data.update(overrides)
    return data
