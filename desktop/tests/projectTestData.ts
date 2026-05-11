import type {
  BoardRenderResult,
  HeroDesign,
  HeroGenerateRequest,
  ImageGenerationResult,
  ImagePromptResult,
  ProjectRecord,
  ProjectSummary,
  VfxDesign,
} from "../src/types/project";

export const heroRequest: HeroGenerateRequest = {
  game_type: "MOBA",
  hero_role: "法师",
  element_theme: "火焰",
  art_style: "暗黑奇幻",
  core_gameplay: "范围爆发、持续灼烧、召唤火元素",
  skill_count: 5,
  generate_images: true,
  generate_board: true,
};

export const heroDesign: HeroDesign = {
  hero_name: "焚烬法皇",
  hero_title: "灰烬王座的咏火者",
  role: "法师",
  difficulty: 4,
  core_tags: ["火焰", "范围爆发"],
  background: "来自熔火遗迹的英雄。",
  combat_style: "依靠范围爆发和持续灼烧压制战场。",
  skills: [
    {
      slot: "一技能",
      name: "烈焰冲击",
      type: "主动",
      description: "释放一道火焰冲击波。",
      mechanics: "命中后附加灼烧。",
      cooldown: "8秒",
      cost: "40法力",
      damage_type: "魔法伤害",
      balance_notes: "需要明显前摇。",
    },
  ],
  combo_logic: "先叠加灼烧，再用终极技能引爆。",
  counterplay: "拉开距离并躲避前摇。",
  balance_summary: "爆发高但机动性弱。",
};

export const vfxDesigns: VfxDesign[] = [
  {
    skill_name: "烈焰冲击",
    vfx_category: "AOE / Impact / Fire",
    visual_keywords: ["火焰", "余烬", "爆裂", "灼烧"],
    stages: [
      { stage: "施法前摇", description: "角色手中聚集橙红色火焰。" },
      { stage: "技能主体", description: "释放宽幅火焰冲击。" },
      { stage: "飞行轨迹", description: "拖出灼烧轨迹。" },
      { stage: "命中反馈", description: "产生火花爆裂。" },
    ],
    color_palette: { main: "#FF5A1F" },
    camera_suggestion: "命中时加入轻微震屏。",
    sound_suggestion: "火焰喷涌声。",
    image_prompt: null,
  },
];

export const imagePrompts: ImagePromptResult[] = [
  {
    skill_name: "烈焰冲击",
    prompt:
      "A high-end game VFX concept art thumbnail of fire, ember, explosion, burning trail, dark background, no text, no logo, no watermark.",
    negative_prompt: "text, logo, watermark",
  },
];

export const imageResults: ImageGenerationResult[] = [
  {
    skill_name: "烈焰冲击",
    image_path: "outputs/images/desktop_123/skill_fire.png",
    file_name: "skill_fire.png",
    width: 512,
    height: 512,
    success: true,
    error_message: null,
  },
];

export const boardResult: BoardRenderResult = {
  project_id: "desktop_123",
  board_path: "outputs/boards/desktop_123/vfx_board.png",
  file_name: "vfx_board.png",
  width: 1600,
  height: 2400,
  success: true,
  error_message: null,
};

export const projectSummary: ProjectSummary = {
  project_id: "desktop_123",
  hero_name: "焚烬法皇",
  hero_title: "灰烬王座的咏火者",
  role: "法师",
  element_theme: "火焰",
  art_style: "暗黑奇幻",
  board_path: "outputs/boards/desktop_123/vfx_board.png",
  created_at: "2026-05-08T10:00:00Z",
  updated_at: "2026-05-08T10:30:00Z",
};

export const projectRecord: ProjectRecord = {
  project_id: "desktop_123",
  request: heroRequest,
  hero_design: heroDesign,
  vfx_designs: vfxDesigns,
  image_prompts: imagePrompts,
  image_results: imageResults,
  board_result: boardResult,
  llm_provider: "fake",
  image_provider: "fake",
  created_at: "2026-05-08T10:00:00Z",
  updated_at: "2026-05-08T10:30:00Z",
};
