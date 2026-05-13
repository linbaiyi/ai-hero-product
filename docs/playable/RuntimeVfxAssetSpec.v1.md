# RuntimeVfxAssetSpec v1

## 1. 概述

RuntimeVfxAssetSpec v1 是“AI 游戏英雄设计助手”中用于描述技能运行时贴图资产的结构化 JSON 协议。它的目标是把 AI 生成的技能运行时贴图资产接入 Playtest Runtime，让 Three.js 渲染层可以读取安全、可校验、可回退的贴图配置。

该协议面向运行时表现，而不是设计展示。它描述每个 Q/W/E/R 技能在运行时可以加载哪些贴图资产，以及这些贴图应该用什么方式渲染，例如 projectile 弹道贴图、impact 命中爆炸贴图、ground_decal 地面法阵、aura buff 光环和 trail 拖尾贴图。

RuntimeVfxAssetSpec 不生成运行时代码。AI 只生成图片资产和结构化配置，客户端固定 Runtime 负责加载贴图、创建 Three.js 对象、执行缩放、旋转、淡出等程序化表现。

## 2. 为什么需要 Runtime VFX Asset Spec

当前技能特效图主要是展示图、概念图和设计板素材，通常具有完整构图、背景、角色或多阶段视觉说明。这类图片适合给用户预览技能风格，但不适合直接作为 Playtest 运行时贴图。

运行时贴图需要更严格的资产特征：

- 透明背景或可通过 additive blending 叠加的黑底图。
- 孤立的单个特效元素，而不是完整场景。
- 干净边缘，适合叠加在 3D 场景中。
- 可以被缩放、旋转、淡出或跟随实体移动。
- 可以和 Game Core / Skill System 的 projectile、zone、buff 等状态一一对应。

因此，展示图和运行时贴图必须分离。展示图继续用于 UI 预览、设计板和导出资料；Runtime VFX Texture 专门用于 Playtest 渲染。

## 3. 设计原则

- AI 生成资产和结构化配置，不生成运行时代码。
- 客户端只读取安全字段，不执行脚本。
- 协议不支持 `eval`、`Function` 或任意动态代码。
- 贴图加载失败时，Playtest 必须 fallback 到当前默认几何体、颜色和简单材质表现。
- 未知字段应被忽略或记录警告，不应阻断基础试玩。
- v1 只支持静态 PNG 贴图，加程序化缩放、旋转、跟随、淡出和循环。
- v1 不描述复杂粒子系统、shader、模型或音效。
- 字段使用 snake_case，JSON key 使用英文。

## 4. 顶层结构

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `version` | string | 是 | 协议版本。v1 固定为 `"1.0"`。 |
| `hero_id` | string | 是 | 对应英雄 ID，建议与 HeroPlayableSpec 的 `hero.id` 一致。 |
| `map_profile` | string | 是 | 适用地图配置，v1 建议为 `default_training_arena`。 |
| `assets_base_path` | string | 是 | 运行时贴图的基础目录，例如 `runtime_textures/`。 |
| `skills` | object | 是 | 按技能槽位组织的运行时贴图配置，key 为 `Q` / `W` / `E` / `R`。 |

## 5. skill 字段说明

`skills` 是一个以技能槽位为 key 的对象。v1 建议包含 Q/W/E/R 四个技能，但客户端可以在缺少某个技能贴图时 fallback。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `skill_name` | string | 是 | 技能名称，用于调试、导出和人工检查。 |
| `skill_type` | string | 是 | 技能逻辑类型，应与 HeroPlayableSpec 中同 slot 技能的 `type` 对齐。 |
| `assets` | object | 是 | 该技能使用的贴图资产集合，key 可为 `projectile`、`impact`、`ground_decal`、`aura`、`trail` 等语义名称。 |

## 6. asset 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `path` | string | 是 | 贴图文件路径。建议相对导出包或项目资源根目录，不允许为空。 |
| `usage` | string | 是 | 贴图用途。v1 支持 `projectile` / `impact` / `ground_decal` / `aura` / `trail`。 |
| `blend_mode` | string | 是 | 混合方式。v1 支持 `alpha` / `additive` / `normal`。 |
| `render_mode` | string | 是 | 渲染方式。v1 支持 `sprite` / `ground_plane` / `billboard_plane` / `sprite_trail` / `aura_ring`。 |
| `scale` | number | 是 | 运行时缩放倍率或近似世界尺寸。必须大于 0。 |
| `duration` | number | 是 | 显示持续时间，单位秒。`0` 可表示瞬时或由运行时默认控制。 |
| `loop` | boolean | 是 | 是否循环显示。持续区域、光环可为 true。 |
| `color_tint` | string | 否 | 颜色叠加，必须是 `#RRGGBB`。 |
| `opacity` | number | 否 | 初始透明度，范围 0 到 1。缺省可视为 1。 |
| `rotation_speed` | number | 否 | 每秒旋转速度，单位可由客户端约定，建议使用弧度/秒。 |
| `spawn_offset` | object | 否 | 生成位置偏移，例如 `{ "x": 0, "y": 0.03, "z": 0 }`，用于避免地面 z-fighting。 |
| `follow_target` | string | 否 | 跟随对象，例如 `hero`、`projectile`、`target_point`。v1 仅作运行时提示。 |

## 7. usage 类型说明

### projectile

- 用途：弹道主体贴图，例如火球核心、能量弹、冰锥、暗影球。
- 推荐 `render_mode`：`sprite` 或 `billboard_plane`。
- Playtest 表现：跟随 projectile 状态的位置移动，朝向可以由 Runtime 面向相机或沿飞行方向近似处理。
- 适合技能类型：`projectile`。

### impact

- 用途：命中爆炸、冲击波、终点闪光、瞬时爆裂。
- 推荐 `render_mode`：`sprite` 或 `billboard_plane`。
- Playtest 表现：在 projectile 命中点、aoe 目标点或 dash 终点生成，按 `duration` 淡出并销毁。
- 适合技能类型：`projectile`、`aoe`、`dash`。

### ground_decal

- 用途：地面法阵、范围圈、AOE 区域、持续伤害区域。
- 推荐 `render_mode`：`ground_plane`。
- Playtest 表现：水平贴在地面上，使用透明或 additive 材质，可按 `rotation_speed` 旋转，可按 `duration` 淡出。
- 适合技能类型：`aoe`、`aoe_dot`。

### aura

- 用途：英雄周围 buff 光环、护盾范围、终极技能临时强化。
- 推荐 `render_mode`：`aura_ring`。
- Playtest 表现：跟随英雄位置，水平显示在脚下或身体周围，持续到 buff 结束。
- 适合技能类型：`buff`，也可用于强化型 `aoe` 或 `dash`。

### trail

- 用途：弹道拖尾、dash 残影、移动轨迹、短时能量尾迹。
- 推荐 `render_mode`：`sprite_trail`。
- Playtest 表现：由 Runtime 沿 projectile 或 hero 经过的位置生成多个短生命周期 Sprite。
- 适合技能类型：`projectile`、`dash`。

## 8. render_mode 说明

### sprite

始终面向相机的 Sprite。适合弹道主体、小爆炸、闪光和短生命周期特效。

### ground_plane

水平贴在地面上的 Plane。适合范围圈、地面法阵、持续区域和 AOE 标记。

### billboard_plane

面向相机的 Plane。比 Sprite 更方便控制比例和旋转，适合大型冲击图、火柱、爆炸切片。

### sprite_trail

由多个 Sprite 组成的简单拖尾。Runtime 可按固定间隔采样位置并自动淡出。

### aura_ring

跟随英雄的水平光环。适合 buff、护盾、持续强化和脚下状态提示。

## 9. 技能类型到贴图用途的推荐映射

| 技能类型 | 推荐 usage 组合 |
| --- | --- |
| `projectile` | `projectile` + `trail` + `impact` |
| `aoe` | `ground_decal` + `impact` |
| `aoe_dot` | `ground_decal` |
| `dash` | `trail` + `impact` |
| `buff` | `aura` |

该映射只是推荐。客户端不应假设所有贴图都存在；缺少贴图时应使用默认几何体和材质。

## 10. 图片生成要求

运行时贴图的生成 prompt 应明确强调：

- `transparent background`
- `isolated game VFX texture asset`
- `single effect element`
- `centered composition`
- `no character`
- `no environment`
- `no text`
- `no logo`
- `no watermark`
- `clean alpha edges`
- `additive blending style`
- `PNG with alpha if supported`

示例 prompt 方向：

`isolated game VFX texture asset, fire projectile core, transparent background, centered composition, clean alpha edges, additive blending style, no character, no environment, no text, no logo, no watermark, PNG with alpha`

如果生图服务暂不支持透明背景，可先使用黑底图配合 `blend_mode: "additive"` 作为 fallback。黑底图应尽量只包含发光元素，避免复杂环境背景。

## 11. 数值约束

- `version` 必须是 `"1.0"`。
- `path` 不能为空。
- `usage` 必须属于 v1 支持值：`projectile` / `impact` / `ground_decal` / `aura` / `trail`。
- `render_mode` 必须属于 v1 支持值：`sprite` / `ground_plane` / `billboard_plane` / `sprite_trail` / `aura_ring`。
- `blend_mode` 必须属于 v1 支持值：`alpha` / `additive` / `normal`。
- `scale` 必须大于 0。
- `duration` 必须大于等于 0。
- `opacity` 如果存在，必须在 0 到 1 之间。
- `color_tint` 如果存在，必须是 `#RRGGBB` hex 色值。
- `spawn_offset` 如果存在，应使用数值型 `x` / `y` / `z`。
- `loop` 必须是 boolean。

## 12. 客户端运行时约定

- Runtime 根据 `path` 加载 texture。
- 贴图加载失败时，fallback 到当前默认几何体、颜色材质和基础特效表现。
- Runtime 不执行脚本，不执行 `eval`，不执行 `Function`。
- Runtime 不加载 AI 指定的远程代码。
- 未知字段可以忽略或记录警告。
- 贴图不是技能逻辑的一部分；即使没有 RuntimeVfxAssetSpec，Playtest 也必须可以运行。
- 运行时可以缓存 texture，避免同一贴图重复加载。

## 13. 与 HeroPlayableSpec 的关系

HeroPlayableSpec 描述技能逻辑：英雄属性、Q/W/E/R 技能类型、冷却、资源、伤害、范围、持续时间等。

RuntimeVfxAssetSpec 描述技能视觉资产：贴图路径、用途、渲染方式、混合方式、缩放、透明度、旋转和跟随提示等。

两者通过以下字段对齐：

- `hero_id` 对齐 HeroPlayableSpec 的 `hero.id`。
- `skills` 的 `Q` / `W` / `E` / `R` 对齐 HeroPlayableSpec 的 `skills[].slot`。
- `skill_type` 对齐 HeroPlayableSpec 的 `skills[].type`。
- `map_profile` 对齐 HeroPlayableSpec 的 `runtime.map_profile`。

RuntimeVfxAssetSpec 是独立协议，不直接修改 HeroPlayableSpec v1。

## 14. 示例

完整示例见：

- `docs/playable/RuntimeVfxAssetSpec.example.json`

示例使用火焰主题英雄“烈焰守卫”，覆盖 Q/W/E/R 四个技能，并展示 projectile、impact、ground_decal、aura、trail 等 v1 支持的贴图用途。

## 15. 后续扩展方向

v1 保持简单，后续可扩展：

- sprite sheet 动画
- flipbook
- mesh VFX
- shader material
- particle emitter config
- sound asset
- model asset
- icon asset
- per-skill asset variants
- runtime texture generation API
- export playable HTML demo
