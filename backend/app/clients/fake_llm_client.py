import re


FIRE = "鐏劙"
ICE = "鍐伴湝"
SHADOW = "鏆楀奖"


class FakeLLMClient:
    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        if schema_name == "vfx_design":
            return _generate_vfx_design(prompt)

        if schema_name == "image_prompt":
            return _generate_image_prompt(prompt)

        if schema_name == "playable_spec":
            return _generate_playable_spec(prompt)

        return _generate_hero_design(prompt)


def _generate_hero_design(prompt: str) -> dict:
    skill_count = _extract_skill_count(prompt)
    role = _extract_value(prompt, ["英雄定位", "鑻遍泟瀹氫綅"], "法师")
    art_style = _extract_value(prompt, ["美术风格", "缇庢湳椋庢牸"], "暗黑奇幻")
    core_gameplay = _extract_value(prompt, ["核心玩法", "鏍稿績鐜╂硶"], "范围爆发")
    theme = _extract_theme(prompt)
    profile = _theme_profile(theme)

    return {
        "hero_name": profile["hero_name"],
        "hero_title": profile["hero_title"],
        "role": role,
        "difficulty": 4,
        "core_tags": [profile["tag"], role, art_style, core_gameplay],
        "background": f"{profile['hero_name']}诞生于{art_style}世界，驾驭{profile['tag']}力量。",
        "combat_style": f"定位为{role}，围绕{core_gameplay}展开，用{profile['tag']}节奏压制敌人。",
        "skills": _build_skills(skill_count, profile),
        "combo_logic": f"先铺垫{profile['effect']}，再衔接控制或爆发技能，最后用终极技能完成收割。",
        "counterplay": "通过拉开距离、打断前摇和分散站位降低连招收益。",
        "balance_summary": f"{profile['hero_name']}拥有鲜明的{profile['tag']}压制力，但依赖命中率和资源管理。",
    }


def _generate_vfx_design(prompt: str) -> dict:
    skill_name = _extract_value(prompt, ["技能名称", "鎶€鑳藉悕绉?"], "未命名技能")
    theme = _extract_theme(prompt)
    profile = _vfx_profile(theme)

    return {
        "skill_name": skill_name,
        "vfx_category": profile["category"],
        "visual_keywords": profile["keywords"],
        "stages": [
            {"stage": "施法前摇", "description": profile["precast"]},
            {"stage": "技能主体", "description": profile["body"]},
            {"stage": profile["travel_stage"], "description": profile["travel"]},
            {"stage": "命中反馈", "description": profile["impact"]},
            {"stage": "残留效果", "description": profile["residue"]},
        ],
        "color_palette": profile["color_palette"],
        "camera_suggestion": profile["camera_suggestion"],
        "sound_suggestion": profile["sound_suggestion"],
        "image_prompt": None,
    }


def _generate_image_prompt(prompt: str) -> dict:
    skill_name = _extract_value(prompt, ["skill_name"], "Unknown Skill")
    terms = _image_prompt_theme_terms(prompt)
    return {
        "skill_name": skill_name,
        "prompt": (
            f"A high-end game VFX concept art thumbnail of {skill_name}, "
            f"{', '.join(terms)}, isolated skill effect, cinematic lighting, "
            "dark background, no text, no logo, no watermark."
        ),
        "negative_prompt": "text, logo, watermark, low quality, blurry, messy layout",
    }


def _generate_playable_spec(prompt: str) -> dict:
    return {
        "version": "1.0",
        "hero": {
            "id": "fake_playable_hero",
            "name": "Fake Playable Hero",
            "title": "Training Arena Prototype",
            "role": "burst_mage",
            "max_hp": 1000,
            "move_speed": 5.5,
            "attack_damage": 45,
            "attack_range": 6,
            "resource_type": "mana",
            "max_resource": 100,
        },
        "gameplay_tags": ["fire", "training_demo", "mvp"],
        "skills": [
            {
                "slot": "Q",
                "name": "Fake Firebolt",
                "type": "projectile",
                "cooldown": 4,
                "resource_cost": 20,
                "damage": 120,
                "range": 14,
                "radius": 1.2,
                "speed": 16,
                "description": "Fire a test projectile toward the target direction.",
                "vfx": {
                    "theme": "fire",
                    "color": "#ff5a1f",
                    "shape": "fireball",
                    "impact": "explosion",
                    "trail": "ember_trail",
                },
            },
            {
                "slot": "W",
                "name": "Fake Flame Field",
                "type": "aoe_dot",
                "cooldown": 10,
                "resource_cost": 35,
                "damage": 28,
                "range": 10,
                "radius": 4,
                "duration": 5,
                "tick_interval": 1,
                "description": "Create a burning test zone.",
                "vfx": {
                    "theme": "fire",
                    "color": "#ff8a2a",
                    "shape": "circle_zone",
                    "impact": "burning_ground",
                    "trail": "rising_embers",
                },
            },
            {
                "slot": "E",
                "name": "Fake Ember Dash",
                "type": "dash",
                "cooldown": 8,
                "resource_cost": 25,
                "damage": 70,
                "distance": 7,
                "radius": 1.5,
                "duration": 0.35,
                "description": "Dash forward in a controlled test movement.",
                "vfx": {
                    "theme": "fire",
                    "color": "#f97316",
                    "shape": "trail",
                    "impact": "flame_sweep",
                    "trail": "dash_flame",
                },
            },
            {
                "slot": "R",
                "name": "Fake Meteor Trial",
                "type": "aoe",
                "cooldown": 45,
                "resource_cost": 70,
                "damage": 320,
                "range": 16,
                "radius": 5.5,
                "duration": 1.2,
                "description": "Call down a large test arena impact.",
                "vfx": {
                    "theme": "fire",
                    "color": "#ff3d00",
                    "shape": "meteor",
                    "impact": "large_explosion",
                    "trail": "falling_fire_tail",
                },
            },
        ],
        "runtime": {
            "control_scheme": "wasd_mouse",
            "camera": "third_person_follow",
            "map_profile": "default_training_arena",
        },
    }


def _extract_value(prompt: str, labels: list[str], fallback: str) -> str:
    for label in labels:
        match = re.search(rf"{re.escape(label)}\s*[:：锛?]\s*(.+)", prompt)
        if match:
            return match.group(1).strip().splitlines()[0]
    return fallback


def _extract_skill_count(prompt: str) -> int:
    match = re.search(r"(?:技能数量|鎶€鑳芥暟閲?)\s*[:：锛?]\s*(\d+)", prompt)
    if not match:
        return 5
    return max(3, min(6, int(match.group(1))))


def _extract_theme(prompt: str) -> str:
    if "火焰" in prompt or "鐏" in prompt:
        return FIRE
    if "冰霜" in prompt or "鍐" in prompt:
        return ICE
    if "暗影" in prompt or "鏆" in prompt:
        return SHADOW
    return "通用"


def _theme_profile(theme: str) -> dict[str, str]:
    if theme == FIRE:
        return {
            "hero_name": "烬焰使",
            "hero_title": "灰烬王座的咒火者",
            "tag": FIRE,
            "effect": "灼烧",
            "skill_prefix": "烈焰",
            "damage_type": "魔法伤害",
        }
    if theme == SHADOW:
        return {
            "hero_name": "夜幕裁决者",
            "hero_title": "无光之刃",
            "tag": SHADOW,
            "effect": "暗蚀",
            "skill_prefix": "影蚀",
            "damage_type": "暗影伤害",
        }
    return {
        "hero_name": "星痕行者",
        "hero_title": "裂隙边境的守望者",
        "tag": theme,
        "effect": "能量印记",
        "skill_prefix": "星痕",
        "damage_type": "混合伤害",
    }


def _vfx_profile(theme: str) -> dict:
    if theme == FIRE:
        return {
            "category": "AOE / Impact / Fire",
            "keywords": ["火焰", "余烬", "爆裂", "灼烧", "鐏劙", "浣欑儸", "鐖嗚", "鐏肩儳"],
            "color_palette": {"main": "#FF5A1F", "secondary": "#FFC15A", "dark": "#1A0B05"},
            "precast": "角色手中聚集橙红色火焰，周围出现余烬粒子。",
            "body": "向前方释放宽幅火焰冲击，主体边缘带有高亮火舌。",
            "travel_stage": "飞行轨迹",
            "travel": "火焰沿地面快速推进，拖出明亮的灼烧轨迹。",
            "impact": "命中敌人时产生火花爆裂和短暂冲击波。",
            "residue": "地面留下短暂燃烧的焦痕和漂浮余烬。",
            "camera_suggestion": "命中时加入轻微震屏和短暂亮度闪烁。",
            "sound_suggestion": "火焰喷涌声、低频冲击声和余烬燃烧声。",
        }
    if theme == ICE:
        return {
            "category": "Control / Trail / Ice",
            "keywords": ["冰晶", "寒雾", "冻结", "碎裂"],
            "color_palette": {"main": "#7DDCFF", "secondary": "#D8F6FF", "dark": "#0B1C2A"},
            "precast": "角色周围凝结细小冰晶。",
            "body": "技能主体形成半透明冰霜能量。",
            "travel_stage": "飞行轨迹",
            "travel": "冰晶沿路径铺开，留下冻结痕迹。",
            "impact": "命中时出现冰晶碎裂和冻结闪光。",
            "residue": "目标区域保留碎冰和寒雾。",
            "camera_suggestion": "命中瞬间轻微慢镜头并降低画面色温。",
            "sound_suggestion": "冰面延展声、晶体碎裂声和寒风声。",
        }
    if theme == SHADOW:
        return {
            "category": "Dash / Distortion / Shadow",
            "keywords": ["暗影", "残像", "黑雾", "撕裂", "鏆楀奖", "娈嬪儚", "榛戦浘", "鎾曡"],
            "color_palette": {"main": "#6D4CFF", "secondary": "#1B102A", "dark": "#05030A"},
            "precast": "角色轮廓被黑雾吞没，身后留下短暂残像。",
            "body": "技能主体呈紫黑色撕裂能量。",
            "travel_stage": "范围展开",
            "travel": "暗影能量向目标区域扩散。",
            "impact": "命中时出现黑雾爆散和裂隙状冲击纹。",
            "residue": "区域内残留暗紫色烟雾和逐渐闭合的撕裂痕迹。",
            "camera_suggestion": "释放时轻微拉近镜头，命中时加入暗色闪屏。",
            "sound_suggestion": "低频撕裂声、回响残音和黑雾涌动声。",
        }
    return {
        "category": "Magic / Impact / Generic",
        "keywords": ["魔法", "能量", "光轨", "冲击"],
        "color_palette": {"main": "#9CC9FF", "secondary": "#F0D37A", "dark": "#111827"},
        "precast": "角色身边聚集魔法粒子。",
        "body": "技能主体以高亮能量束或范围波纹呈现。",
        "travel_stage": "飞行轨迹",
        "travel": "能量沿路径留下稳定光轨。",
        "impact": "命中时产生明亮冲击环和粒子散射。",
        "residue": "短暂残留微弱光点。",
        "camera_suggestion": "命中时加入轻微镜头震动。",
        "sound_suggestion": "魔法蓄力声、能量破空声和命中回响。",
    }


def _image_prompt_theme_terms(prompt: str) -> list[str]:
    if any(term in prompt for term in ["火焰", "余烬", "爆裂", "灼烧", "鐏劙", "浣欑儸", "鐖嗚", "鐏肩儳"]):
        return ["fire", "ember", "explosion", "burning"]
    if any(term in prompt for term in ["冰霜", "冰晶", "冻结", "鍐伴湝"]):
        return ["ice", "frost", "crystal", "freezing"]
    if any(term in prompt for term in ["暗影", "黑雾", "残像", "鏆楀奖", "榛戦浘", "娈嬪儚"]):
        return ["shadow", "dark mist", "afterimage"]
    return ["magic energy", "glowing particles", "impact burst"]


def _build_skills(skill_count: int, profile: dict[str, str]) -> list[dict[str, str]]:
    slot_map = {
        3: ["被动", "一技能", "终极技能"],
        4: ["被动", "一技能", "二技能", "终极技能"],
        5: ["被动", "一技能", "二技能", "三技能", "终极技能"],
        6: ["被动", "一技能", "二技能", "三技能", "四技能", "终极技能"],
    }
    return [
        {
            "slot": slot,
            "name": _skill_name(slot, profile["skill_prefix"]),
            "type": "被动" if slot == "被动" else "主动",
            "description": f"{slot}释放{profile['tag']}力量，制造{profile['effect']}压力。",
            "mechanics": f"命中后施加{profile['effect']}，与其他技能联动提升收益。",
            "cooldown": "无" if slot == "被动" else ("60秒" if slot == "终极技能" else "10秒"),
            "cost": "无" if slot == "被动" else "50法力",
            "damage_type": profile["damage_type"],
            "balance_notes": "收益依赖命中率和进场时机，空放会明显降低压制力。",
        }
        for slot in slot_map[skill_count]
    ]


def _skill_name(slot: str, prefix: str) -> str:
    names = {
        "被动": f"{prefix}印记",
        "一技能": f"{prefix}冲击",
        "二技能": f"{prefix}领域",
        "三技能": f"{prefix}护幕",
        "四技能": f"{prefix}回响",
        "终极技能": f"{prefix}终裁",
    }
    return names[slot]
