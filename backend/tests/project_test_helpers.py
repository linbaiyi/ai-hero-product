from datetime import UTC, datetime


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


def make_hero_request() -> dict:
    return {
        "game_type": "MOBA",
        "hero_role": "法师",
        "element_theme": "火焰",
        "art_style": "暗黑奇幻",
        "core_gameplay": "范围爆发、持续灼烧、召唤火元素",
        "skill_count": 5,
        "generate_images": True,
        "generate_board": True,
    }


def make_hero_design() -> dict:
    return {
        "hero_name": "烬焰使",
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


def make_image_prompt(skill_name: str = "烈焰冲击") -> dict:
    return {
        "skill_name": skill_name,
        "prompt": "fire ember explosion burning game VFX concept art, dark background, no text, no logo, no watermark",
        "negative_prompt": "text, logo, watermark",
    }


def make_image_result(skill_name: str = "烈焰冲击") -> dict:
    return {
        "skill_name": skill_name,
        "image_path": "outputs/images/project_demo/skill_fire.png",
        "file_name": "skill_fire.png",
        "width": 512,
        "height": 512,
        "success": True,
        "error_message": None,
    }


def make_board_result() -> dict:
    return {
        "project_id": "project_demo",
        "board_path": "outputs/boards/project_demo/vfx_board.png",
        "file_name": "vfx_board.png",
        "width": 1600,
        "height": 2400,
        "success": True,
        "error_message": None,
    }


def make_playable_spec() -> dict:
    return {
        "version": "1.0",
        "hero": {
            "id": "test_playable_hero",
            "name": "Test Playable Hero",
            "title": "Arena Test Subject",
            "role": "burst_mage",
            "max_hp": 1000,
            "move_speed": 5.5,
            "attack_damage": 45,
            "attack_range": 6,
            "resource_type": "mana",
            "max_resource": 100,
        },
        "gameplay_tags": ["fire", "training_demo"],
        "skills": [
            {
                "slot": "Q",
                "name": "Test Bolt",
                "type": "projectile",
                "cooldown": 4,
                "resource_cost": 20,
                "damage": 120,
                "range": 14,
                "radius": 1.2,
                "speed": 16,
                "description": "Launch a test projectile.",
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
                "name": "Test Field",
                "type": "aoe_dot",
                "cooldown": 10,
                "resource_cost": 35,
                "damage": 28,
                "range": 10,
                "radius": 4,
                "duration": 5,
                "tick_interval": 1,
                "description": "Create a test zone.",
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
                "name": "Test Dash",
                "type": "dash",
                "cooldown": 8,
                "resource_cost": 25,
                "damage": 70,
                "distance": 7,
                "radius": 1.5,
                "duration": 0.35,
                "description": "Dash forward in the arena.",
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
                "name": "Test Meteor",
                "type": "aoe",
                "cooldown": 45,
                "resource_cost": 70,
                "damage": 320,
                "range": 16,
                "radius": 5.5,
                "duration": 1.2,
                "description": "Call down a test meteor.",
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


def make_project_save_request(project_id: str = "project_demo", **overrides) -> dict:
    data = {
        "project_id": project_id,
        "request": make_hero_request(),
        "hero_design": make_hero_design(),
        "vfx_designs": [make_vfx_design()],
        "image_prompts": [make_image_prompt()],
        "image_results": [make_image_result()],
        "board_result": make_board_result(),
        "llm_provider": "fake",
        "image_provider": "fake",
    }
    data.update(overrides)
    return data


def now_iso() -> str:
    return datetime.now(UTC).isoformat()
