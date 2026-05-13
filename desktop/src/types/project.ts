import type { HeroPlayableSpec } from "../game-demo/specs/playableSpecTypes";
import type { RuntimeVfxAssetSpec } from "../game-demo/vfx-assets/runtimeVfxTypes";

export type HeroGenerateRequest = {
  game_type: string;
  hero_role: string;
  element_theme: string;
  art_style: string;
  core_gameplay: string;
  skill_count: number;
  generate_images: boolean;
  generate_board: boolean;
};

export type SkillDesign = {
  slot: string;
  name: string;
  type: string;
  description: string;
  mechanics: string;
  cooldown: string;
  cost: string;
  damage_type: string;
  balance_notes: string;
};

export type HeroDesign = {
  hero_name: string;
  hero_title: string;
  role: string;
  difficulty: number;
  core_tags: string[];
  background: string;
  combat_style: string;
  skills: SkillDesign[];
  combo_logic: string;
  counterplay: string;
  balance_summary: string;
};

export type VfxStage = {
  stage: string;
  description: string;
};

export type VfxDesign = {
  skill_name: string;
  vfx_category: string;
  visual_keywords: string[];
  stages: VfxStage[];
  color_palette: Record<string, string>;
  camera_suggestion: string;
  sound_suggestion: string;
  image_prompt?: string | null;
};

export type VfxBreakdownBatchRequest = {
  hero_name: string;
  element_theme: string;
  art_style: string;
  skills: SkillDesign[];
};

export type ImagePromptResult = {
  skill_name: string;
  prompt: string;
  negative_prompt?: string | null;
};

export type ImagePromptBatchRequest = {
  vfx_designs: VfxDesign[];
  style_hint?: string | null;
};

export type ImageGenerationRequest = {
  image_prompt: ImagePromptResult;
  project_id?: string | null;
  width?: number;
  height?: number;
};

export type ImageGenerationBatchRequest = {
  image_prompts: ImagePromptResult[];
  project_id?: string | null;
  width?: number;
  height?: number;
};

export type ImageGenerationResult = {
  skill_name: string;
  image_path: string;
  file_name: string;
  width: number;
  height: number;
  success: boolean;
  error_message?: string | null;
};

export type BoardRenderRequest = {
  project_id: string;
  hero_design: HeroDesign;
  vfx_designs: VfxDesign[];
  image_results: ImageGenerationResult[];
  board_title?: string | null;
  width?: number;
  height?: number;
};

export type BoardRenderResult = {
  project_id: string;
  board_path: string;
  file_name: string;
  width: number;
  height: number;
  success: boolean;
  error_message?: string | null;
};

export type ProjectSaveRequest = {
  project_id: string;
  request: HeroGenerateRequest;
  hero_design: HeroDesign;
  vfx_designs: VfxDesign[];
  image_prompts: ImagePromptResult[];
  image_results: ImageGenerationResult[];
  board_result: BoardRenderResult | null;
  playable_spec?: HeroPlayableSpec | null;
  runtime_vfx_asset_spec?: RuntimeVfxAssetSpec | null;
  llm_provider?: string | null;
  image_provider?: string | null;
};

export type ProjectRecord = ProjectSaveRequest & {
  created_at: string;
  updated_at: string;
};

export type ProjectSummary = {
  project_id: string;
  hero_name: string;
  hero_title?: string | null;
  role?: string | null;
  element_theme?: string | null;
  art_style?: string | null;
  board_path?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectListResponse = {
  projects: ProjectSummary[];
  total: number;
};

export type ProjectSaveStatusType = "idle" | "saving" | "saved" | "failed";

export type ExportProjectRequest = {
  include_json: boolean;
  include_markdown: boolean;
  include_images: boolean;
  include_board: boolean;
  include_playable?: boolean;
  include_runtime_vfx?: boolean;
};

export type ExportProjectResult = {
  project_id: string;
  export_path: string;
  file_name: string;
  success: boolean;
  error_message?: string | null;
};

export type ProjectExportStatusType =
  | "idle"
  | "exporting"
  | "exported"
  | "failed";
