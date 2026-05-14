# AI 游戏英雄设计助手策划案

## 一、项目定位

AI 游戏英雄设计助手是一款面向游戏策划、独立开发者、视觉设计师和原型团队的 AI 辅助工具。

项目目标不是只生成一段英雄文案，而是把一句英雄创意推进到可保存、可导出、可试玩、可继续迭代的游戏英雄原型。

核心链路如下：

```text
用户创意
  -> 英雄方案生成
  -> 技能文案与机制设计
  -> 技能视觉与贴图资产生成
  -> HeroPlayableSpec 可试玩配置
  -> RuntimeVfxAssetSpec 运行时特效资产
  -> Three.js Playtest 试玩验证
  -> 项目保存 / 历史恢复 / 导出 / 导入
```

项目当前已经从“AI 英雄文案生成器”升级为“AI 英雄可试玩原型生成工具”。

## 二、目标用户

### 1. 游戏策划

用于快速生成英雄设定、技能组、战斗风格、克制关系和平衡性说明，并能在 Playtest 中验证技能表现。

### 2. 独立游戏开发者

用于低成本制作英雄原型，快速验证一个角色是否有可玩性和展示价值。

### 3. 视觉概念设计师

用于生成技能特效图、运行时贴图 prompt、Runtime VFX 资产和英雄设计板。

### 4. 小型游戏团队

用于快速制作提案 Demo、角色方案、技能演示和可导出的资料包。

### 5. 教学、Game Jam 和原型竞赛场景

用于从创意快速生成可运行的英雄技能演示，适合教学、比赛和创意验证。

## 三、产品核心价值

### 1. 从文字创意到完整英雄方案

用户输入英雄方向后，系统可以生成英雄名称、称号、定位、背景故事、技能组、战斗风格和平衡性说明。

### 2. 从英雄方案到可试玩配置

系统可以把英雄方案映射为 `HeroPlayableSpec`，并通过后端 Pydantic 和桌面端 TypeScript 双重校验。

### 3. 从展示图到运行时贴图资产

项目区分展示图和运行时贴图：

- 展示图用于技能预览、设计板和视觉表达。
- 运行时贴图用于 Three.js Playtest 中的 projectile、impact、ground_decal、aura、trail 等特效对象。

### 4. 在 Playtest 中真实验证

用户可以进入固定训练场试玩当前英雄，验证移动、技能释放、伤害、范围、召唤物、贴图特效和程序化 VFX。

### 5. 支持项目级保存、导出和导入

项目可以保存英雄方案、图片资源、设计板、`playable_spec`、`runtime_vfx_asset_spec` 和运行时贴图资源。

导出包可以包含：

- `project.json`
- Markdown 文档
- 技能图
- 设计板
- `playable/hero_playable_spec.json`
- `playable/default_training_map.json`
- `playable/runtime_vfx/runtime_vfx_asset_spec.json`
- `playable/runtime_vfx/textures/`

导入项目时会恢复项目数据和 runtime VFX 贴图资源。

## 四、当前已完成能力

### 1. 英雄方案生成

已支持根据用户输入生成完整英雄方案，包括：

- 英雄名称
- 英雄称号
- 职业定位
- 背景故事
- 技能组
- 战斗风格
- 克制关系
- 平衡性总结

### 2. 技能特效拆解

已支持根据英雄技能生成技能特效拆解说明，用于后续图像生成和设计板输出。

### 3. 图片 Prompt 生成

已支持生成展示图和技能图相关 prompt。

同时已经新增适用于实时渲染的 VFX 贴图 prompt 模板体系，覆盖：

- projectile
- impact
- ground_decal
- aura
- trail
- particle
- beam

这些 prompt 会强调：

- transparent background
- isolated effect
- centered composition
- no text
- no logo
- no watermark
- game-ready
- optimized for real-time rendering
- suitable for Three.js or Babylon.js

### 4. 技能图片生成与设计板

已支持生成技能视觉图，并将技能视觉图、色彩、说明和特效拆解整合为设计板。

### 5. HeroPlayableSpec 协议

已完成 `HeroPlayableSpec v1` 协议文档、示例 JSON、后端 Pydantic Schema、桌面端 TypeScript 校验与归一化。

该协议描述：

- 英雄基础属性
- Q/W/E/R 技能
- 技能类型
- 冷却
- 消耗
- 伤害
- 范围
- 持续时间
- 运行时基础 VFX 信息

### 6. PlayableSpec 生成服务

已支持后端将当前英雄方案生成 `HeroPlayableSpec`。

当前生成链路已经加入大模型语义映射层，用于把技能文案映射到游戏引擎可执行的结构化技能配置。

映射过程会结合：

- 英雄方案原文
- 技能原始描述
- 可用技能类型
- 技能引擎能力边界
- HeroPlayableSpec 字段约束

并通过 schema 校验防止非法配置进入运行时。

### 7. Game Core 纯逻辑内核

已完成不依赖 React、Electron、Three.js 的纯 TypeScript 游戏逻辑，包括：

- 英雄状态
- 敌人状态
- 世界边界
- 移动
- 碰撞
- 伤害
- 冷却
- simulation update

### 8. Skill System 技能系统

已支持多种基础技能逻辑：

- projectile
- aoe
- aoe_dot
- dash
- buff
- summon

当前已支持召唤物基础链路，包括召唤物生成、简单状态和渲染表现。

### 9. Default Training Map

已完成固定训练场配置，包括：

- 地图边界
- 英雄出生点
- 静态木桩
- 测试敌人
- 障碍物

### 10. Three.js Renderer

已完成最小 Three.js 渲染层，可以渲染：

- 地面
- 边界
- 障碍物
- 英雄
- 敌人
- 投射物
- 范围区域
- 召唤物
- 运行时 VFX 对象

### 11. Playtest 页面

已完成桌面端 Playtest 页面。

当前支持：

- 使用当前项目的 `playable_spec`
- 没有 `playable_spec` 时 fallback 到默认英雄
- 显示训练场
- 控制英雄移动
- 释放技能
- Reset
- 无 CD 调试
- 范围调试
- 英雄血量和资源显示

### 12. RuntimeVfxAssetSpec 协议

已完成 `RuntimeVfxAssetSpec v1` 协议文档、示例 JSON、后端 Pydantic Schema、桌面端 TypeScript 校验与归一化。

该协议独立于 `HeroPlayableSpec`：

- `HeroPlayableSpec` 描述技能逻辑。
- `RuntimeVfxAssetSpec` 描述运行时视觉贴图资产。

两者通过 hero_id、技能槽位和 skill_type 对齐。

### 13. Runtime VFX Prompt 生成

已支持根据 `HeroPlayableSpec` 或 `RuntimeVfxAssetSpec` 生成运行时贴图专用 prompt。

Prompt 与展示图 prompt 区分，强调透明背景、孤立元素、无文字、无 logo、适合实时渲染。

### 14. Runtime VFX 图片生成与保存

已支持后端生成运行时贴图图片，并返回 `runtime_vfx_asset_spec`。

当前支持：

- individual 生成
- atlas 组合生成
- 单技能贴图更新
- 贴图透明化后处理
- runtime_vfx 输出目录保存

### 15. Runtime VFX Playtest 接入

已支持桌面端生成 runtime VFX 资产，并在 Playtest 中加载使用。

当前已经接入：

- texture loader
- texture VFX renderer
- 多贴图组合系统
- 程序化 VFX 增强
- fallback geometry

### 16. 多贴图组合和程序化 VFX

已支持技能按阶段组合多张贴图。

例如：

- Q：projectile + trail + impact
- W：ground_decal + pulse / fade
- E：aura + rotate / pulse
- R：ground_decal + impact

并已加入程序化增强层：

- shockwave
- glow_disc
- particle_burst
- particle_trail
- light_flash
- rotating_ring
- upward_sparks

### 17. 单技能稳定迭代链路

已支持对单个技能进行定向修改。

修改某个技能时，系统会尽量只更新该技能相关内容：

- 技能文案
- `playable_spec.skills` 对应槽位
- 该技能对应的 runtime VFX 贴图资产

其他技能槽位尽量保持不变，避免整套英雄方案随机重生成。

### 18. 单技能文案重写

已支持把原技能描述和用户修改需求交给大模型，让大模型生成新的完整技能描述，而不是简单追加“修改后：xxx”。

目标是让技能卡片中的文案更自然、更完整、更像真正的策划描述。

### 19. 单技能 PlayableSpec 槽位更新

已支持只更新指定技能槽位的 `playable_spec`。

例如修改 E 技能时，只更新 `playable_spec.skills.E`，Q/W/R 尽量保持不变。

### 20. 单技能 Runtime VFX 贴图更新

已支持根据技能修改结果判断并更新对应技能的贴图资产。

当前支持：

- 保留仍然适用的旧贴图
- 删除不再需要的旧贴图
- 生成新增需求所需的新贴图
- 更新 `runtime_vfx_asset_spec` 中对应技能槽位

### 21. 项目保存与历史恢复

已支持保存和恢复：

- 英雄方案
- VFX 设计
- 图片结果
- 设计板
- `playable_spec`
- `runtime_vfx_asset_spec`

### 22. 项目导出

已支持导出完整项目包，包括：

- JSON
- Markdown
- 图片
- 设计板
- playable 配置
- 默认训练场配置
- runtime VFX 资产配置
- runtime texture 文件

### 23. 项目导入

已支持从导出 ZIP 导入项目。

导入时会恢复：

- `project.json`
- 项目基础数据
- `runtime_vfx_asset_spec`
- runtime VFX 贴图文件

### 24. 完整删除链

已支持删除项目时同步删除同项目相关资源，包括：

- project json
- images
- boards
- exports
- runtime_vfx

避免删除项目后留下大量孤立资源。

## 五、当前主要使用流程

### 1. 新建英雄

用户输入英雄需求，生成完整英雄方案。

### 2. 查看方案

在 Blueprint 页面查看英雄定位、背景故事、技能组和设计说明。

### 3. 修改单个技能

用户可以针对某个技能输入修改需求。

系统会：

1. 根据旧技能描述和修改需求生成新的完整技能文案。
2. 根据新文案做语义映射。
3. 更新对应技能槽位的 `playable_spec`。
4. 判断是否需要更新该技能贴图。
5. 保留其他技能不变。

### 4. 生成试玩配置

系统生成 `HeroPlayableSpec`，用于 Playtest。

### 5. 生成运行时贴图资产

系统生成 `RuntimeVfxAssetSpec` 和对应 runtime texture。

### 6. 进入 Playtest

用户进入训练场试玩当前英雄，观察技能逻辑和技能特效。

### 7. 保存项目

保存当前完整项目状态。

### 8. 导出项目

导出包含方案、贴图、设计板、playable 配置和 runtime VFX 资源的资料包。

### 9. 导入项目

从导出包恢复历史项目及其 runtime VFX 资源。

## 六、当前仍存在的问题

### 1. 技能语义映射仍需继续增强

虽然已经加入大模型语义映射层，但复杂技能仍可能出现映射不完整的问题。

例如：

- 灼烧、中毒、标记等状态效果未完全表现。
- 多段技能逻辑可能被简化。
- 召唤物行为仍较基础。
- 技能文案中的高级机制不一定能完整落到 Skill System。

### 2. Runtime VFX 视觉质量仍需提升

当前已经有贴图、透明化、组合系统和程序化增强，但整体效果仍依赖：

- 生图质量
- prompt 精确度
- atlas 切割质量
- 透明通道质量
- 贴图与技能范围的缩放匹配
- 程序化 VFX 参数

视觉效果距离正式商业游戏仍有差距。

### 3. 贴图与技能范围校准仍需优化

当前已经做了范围校准和调试 overlay，但不同技能类型、不同贴图比例下仍可能出现贴图大小和实际生效范围不完全一致的问题。

### 4. 状态效果系统不完整

灼烧、持续伤害、减速、易伤、标记、护盾、治疗等状态效果需要进一步抽象为统一 buff / debuff 系统。

### 5. 召唤物系统仍是原型级

当前召唤物基础链路已经打通，但还需要继续增强：

- 召唤物血量显示
- 召唤物攻击逻辑
- 召唤物死亡逻辑
- 召唤物跟随 / 巡逻 / 守卫行为
- 召唤物技能
- 召唤物模型或更好的视觉表现

### 6. Playtest 操作体验仍需增强

后续可以继续完善：

- 鼠标选点释放
- 技能预览范围
- 目标选择
- 右键移动
- 技能指示器
- 更清晰的调试 UI

### 7. 项目资源管理仍可增强

虽然已经支持保存、导出、导入和删除链，但后续仍可优化：

- 资源去重
- 资源版本管理
- 单技能资源回滚
- 导出包资源完整性检查
- 缺失资源修复

## 七、未来优化方向

### 1. 更强的技能语义映射

继续增强大模型映射层，让系统更稳定地把技能文案转换为可执行技能逻辑。

重点包括：

- 状态效果映射
- 召唤物映射
- 连锁效果映射
- 多段技能映射
- 技能条件触发映射

### 2. 完整 Buff / Debuff 系统

建立统一状态效果系统，支持：

- 灼烧
- 中毒
- 减速
- 眩晕
- 易伤
- 护盾
- 标记
- 治疗
- 周期性伤害
- 状态持续时间和刷新规则

### 3. 召唤物系统升级

让召唤物从“生成一个实体”升级为更接近真实游戏单位。

后续应支持：

- 独立血量
- 独立攻击
- AI 行为
- 目标选择
- 死亡爆炸
- 技能协同
- 模型或贴图外观

### 4. Runtime VFX 质量提升

继续优化运行时特效：

- 更严格的贴图 prompt
- 更稳定的透明化后处理
- 更准确的 atlas 切割
- 更合理的缩放校准
- 更丰富的粒子增强
- 更好的 impact / trail / aura 表现

### 5. 技能编辑器

增加可视化技能参数编辑能力。

用户可以直接调整：

- 伤害
- 范围
- 冷却
- 消耗
- 持续时间
- 召唤物数量
- 贴图缩放
- 状态效果参数

### 6. Playtest 体验增强

让试玩更接近真实 MOBA / ARPG 操作体验：

- 右键移动
- 鼠标选点释放
- 技能范围预览
- 命中反馈
- 伤害数字
- 状态图标
- 更清晰的单位血条

### 7. 资源版本和回滚

为单技能修改建立版本记录。

用户可以回滚：

- 技能文案
- playable 配置
- runtime VFX 贴图
- 设计板资源

### 8. Playable HTML Demo 导出

未来可将 Playtest 打包成独立 HTML Demo，方便分享、投递和展示。

### 9. 3D 模型资产支持

当前英雄、敌人和召唤物主要是基础几何体或贴图表现。

后续可支持：

- 英雄模型
- 召唤物模型
- 怪物模型
- 简单动画
- 模型资源导入

### 10. 多英雄和多方案对比

支持多个英雄在同一训练场中对比：

- 技能表现对比
- 平衡性对比
- VFX 风格对比
- 不同版本方案对比

## 八、技术设计原则

### 1. AI 生成配置，不生成运行时代码

AI 可以生成：

- 文案
- JSON 配置
- prompt
- 图片资产

AI 不允许生成：

- 可执行脚本
- eval 内容
- Function 内容
- 远程代码
- 动态运行时代码

### 2. 前后端双重校验

后端使用 Pydantic 校验：

- `HeroPlayableSpec`
- `RuntimeVfxAssetSpec`
- 项目保存数据
- 导出 / 导入数据

桌面端使用 TypeScript 校验和 normalize。

### 3. 展示图和运行时贴图区分

展示图用于视觉说明。

运行时贴图用于 Playtest 渲染。

二者不应混用。

### 4. fallback 优先

任何贴图加载失败、配置缺失、资源丢失，都不应导致 Playtest 白屏。

运行时必须 fallback 到默认几何体、颜色材质或基础特效。

### 5. 模块化演进

每个模块独立开发、独立测试：

- backend schema
- backend service
- desktop validation
- Game Core
- Skill System
- Renderer
- Playtest
- Project save / export / import

## 九、商业价值

### 1. 提高游戏原型开发效率

将原本需要策划、美术、程序多轮协作的早期原型流程，压缩为较短的 AI 辅助生成和试玩验证流程。

### 2. 降低独立开发门槛

非程序用户也可以生成具备可试玩逻辑的英雄技能 Demo。

### 3. 提升 AI 生成内容的实用性

项目不是只生成文案或图片，而是生成能进入实时运行时的结构化内容。

### 4. 适合游戏团队内部工具化

可作为策划、美术和技术之间的早期沟通工具。

### 5. 适合教学和 Game Jam

快速从创意变成可运行演示，非常适合教学、比赛和创意验证。

## 十、当前阶段总结

当前项目已经完成了从英雄创意到可试玩 Demo 的主链路：

- 英雄方案能生成。
- 技能视觉能生成。
- 技能贴图资产能生成。
- playable 配置能生成。
- runtime VFX 配置能生成。
- Playtest 能运行。
- 项目能保存、导出、导入和删除。
- 单技能修改链路已经初步打通。

下一阶段重点不是再铺更多入口，而是提升质量：

1. 让技能语义映射更准确。
2. 让状态效果和召唤物更接近真实游戏逻辑。
3. 让 Runtime VFX 更稳定、更美观、更匹配技能范围。
4. 让单技能修改更可靠、更可控、更可回滚。
5. 让 Playtest 操作体验更像真正的游戏 Demo。

## 十一、一句话总结

AI 游戏英雄设计助手的目标，是把一句英雄创意变成一套可保存、可导出、可导入、可试玩、可持续迭代的游戏英雄原型。
