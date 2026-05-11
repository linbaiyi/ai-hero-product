# HeroPlayableSpec v1

## 1. 概述

HeroPlayableSpec v1 是“AI 游戏英雄设计助手”的英雄可试玩配置协议。它用于把 AI 生成的英雄设计方案转化为客户端固定 3D 训练场可以读取和运行的配置文件。

该协议的目标不是让 AI 生成完整游戏代码，而是让 AI 输出一份受限、安全、可校验的 JSON 配置。客户端 Demo Runtime 读取该配置后，在固定地图中运行英雄移动、Q/W/E/R 技能、敌人木桩、伤害和基础特效。

## 2. 设计原则

- AI 只生成配置，不生成游戏代码。
- 客户端固定运行时负责执行配置。
- 后端和前端都必须校验该协议。
- v1 只追求稳定可试玩，不追求复杂自由编辑。
- 协议中不允许脚本字段。
- 客户端不执行 `eval`、`Function` 或任意动态代码。
- 客户端不加载 AI 指定的远程代码。
- 未知字段应被忽略或记录警告，不应直接执行。

## 3. 顶层结构

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `version` | string | 是 | 协议版本。v1 固定为 `"1.0"`。 |
| `hero` | object | 是 | 英雄基础信息和基础属性。 |
| `gameplay_tags` | string[] | 是 | 英雄玩法标签，例如 `fire`、`burst`、`area_damage`。 |
| `skills` | object[] | 是 | Q/W/E/R 四个技能，必须刚好 4 个。 |
| `runtime` | object | 是 | 给客户端 Demo Runtime 的运行时提示。 |

## 4. hero 字段说明

| 字段名 | 类型 | 必填 | 说明 | 建议范围 |
| --- | --- | --- | --- | --- |
| `id` | string | 是 | 英雄唯一 ID，建议使用小写 snake_case。 | 1-64 字符 |
| `name` | string | 是 | 英雄名称。 | 1-32 字符 |
| `title` | string | 是 | 英雄称号。 | 1-64 字符 |
| `role` | string | 是 | 玩法定位，例如 `burst_mage`、`fighter`、`marksman`。 | 1-32 字符 |
| `max_hp` | number | 是 | 最大生命值。 | `> 0` |
| `move_speed` | number | 是 | 移动速度。 | `> 0`，建议 2-12 |
| `attack_damage` | number | 是 | 普通攻击伤害。 | `>= 0` |
| `attack_range` | number | 是 | 普通攻击距离。 | `>= 0` |
| `resource_type` | string | 是 | 资源类型，例如 `mana`、`energy`、`none`。 | 固定枚举或项目内约定 |
| `max_resource` | number | 是 | 最大资源值。 | `>= 0` |

## 5. skill 字段说明

| 字段名 | 类型 | 必填 | 说明 | 建议范围 |
| --- | --- | --- | --- | --- |
| `slot` | string | 是 | 技能槽位，只允许 `Q`、`W`、`E`、`R`。 | 固定枚举 |
| `name` | string | 是 | 技能名称。 | 1-32 字符 |
| `type` | string | 是 | 技能类型。v1 只支持 5 类。 | `projectile` / `aoe` / `aoe_dot` / `dash` / `buff` |
| `cooldown` | number | 是 | 冷却时间，单位秒。 | `>= 0` |
| `resource_cost` | number | 是 | 资源消耗。 | `>= 0` |
| `damage` | number | 按类型 | 伤害数值。 | `>= 0` |
| `range` | number | 按类型 | 施法距离或弹道最大距离。 | `>= 0` |
| `radius` | number | 按类型 | 影响半径。 | `>= 0` |
| `speed` | number | projectile 必填 | 弹道速度。 | `>= 0` |
| `duration` | number | 按类型 | 持续时间，单位秒。 | `>= 0` |
| `tick_interval` | number | aoe_dot 必填 | 持续伤害间隔，单位秒。 | `> 0` |
| `distance` | number | dash 必填 | 位移距离。 | `>= 0` |
| `description` | string | 是 | 技能说明，给 UI 和调试面板展示。 | 1-240 字符 |
| `vfx` | object | 是 | 技能特效描述。 | 见 vfx 字段说明 |

## 6. 支持的技能类型

### projectile

弹道技能，例如火球、能量弹、箭矢、剑气。

- 客户端执行方式：从英雄位置向目标方向生成一个移动弹体；弹体到达最大距离或命中敌人后结算伤害，可按 `radius` 产生小范围爆炸。
- 必填字段：`slot`、`name`、`type`、`cooldown`、`resource_cost`、`damage`、`range`、`radius`、`speed`、`description`、`vfx`。
- 可选字段：`duration`。
- 典型例子：Q 技能“烈焰冲击”，发射火球并在命中点爆炸。

### aoe

瞬时范围技能，例如爆炸、雷击、冰环。

- 客户端执行方式：在目标点或英雄周围创建瞬时范围判定，对范围内敌人结算一次伤害。
- 必填字段：`slot`、`name`、`type`、`cooldown`、`resource_cost`、`damage`、`range`、`radius`、`description`、`vfx`。
- 可选字段：`duration`，可用于表现短暂前摇或延迟命中。
- 典型例子：R 技能“陨火审判”，短暂延迟后在目标区域爆炸。

### aoe_dot

持续范围技能，例如火焰领域、毒雾、寒冰地带。

- 客户端执行方式：在目标点或英雄周围创建持续区域；每隔 `tick_interval` 对区域内敌人结算一次 `damage`。
- 必填字段：`slot`、`name`、`type`、`cooldown`、`resource_cost`、`damage`、`range`、`radius`、`duration`、`tick_interval`、`description`、`vfx`。
- 可选字段：无特殊要求。
- 典型例子：W 技能“灰烬领域”，在地面留下持续燃烧区域。

### dash

位移技能，例如突进、闪现、冲撞。

- 客户端执行方式：按输入方向移动英雄 `distance`；如配置 `damage` 和 `radius`，可对路径附近敌人造成伤害。
- 必填字段：`slot`、`name`、`type`、`cooldown`、`resource_cost`、`distance`、`duration`、`description`、`vfx`。
- 可选字段：`damage`、`radius`。
- 典型例子：E 技能“炽焰突进”，向前突进并留下火焰轨迹。

### buff

自身强化技能，例如加速、护盾、攻击强化。

- 客户端执行方式：给英雄添加持续状态，影响速度、护盾、攻击伤害等运行时属性。
- 必填字段：`slot`、`name`、`type`、`cooldown`、`resource_cost`、`duration`、`description`、`vfx`。
- 可选字段：`damage`、`radius`、`range`。具体增益数值可在后续 v1.x 扩展为 `modifiers`。
- 典型例子：短时间提高移动速度并生成护盾。

## 7. vfx 字段说明

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `theme` | string | 是 | 元素主题。 |
| `color` | string | 是 | 主色，必须是 hex 格式，例如 `#ff5a1f`。 |
| `shape` | string | 是 | 特效形态。 |
| `impact` | string | 是 | 命中或触发反馈。 |
| `trail` | string | 是 | 轨迹或残留效果。 |

v1 建议支持的 `theme`：

- `fire`
- `ice`
- `thunder`
- `poison`
- `dark`
- `holy`
- `arcane`
- `wind`
- `earth`

v1 建议支持的 `shape`：

- `fireball`
- `beam`
- `circle_zone`
- `meteor`
- `slash`
- `trail`
- `shield`
- `burst`
- `wave`
- `rune`

## 8. runtime 字段说明

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `control_scheme` | string | 是 | 控制方案提示，例如 `wasd_mouse`。 |
| `camera` | string | 是 | 相机方案提示，例如 `third_person_follow`。 |
| `map_profile` | string | 是 | 地图配置提示，例如 `default_training_arena`。 |

这些字段只是运行时提示，不是脚本。客户端可以根据自身能力选择支持、忽略或 fallback。

## 9. 数值约束

- `max_hp` 必须大于 0。
- `move_speed` 必须大于 0。
- `attack_damage` 不能为负数。
- `attack_range` 不能为负数。
- `max_resource` 不能为负数。
- `cooldown` 必须大于等于 0。
- `resource_cost` 不能为负数。
- `damage` 不能为负数。
- `range` 不能为负数。
- `radius` 不能为负数。
- `speed` 不能为负数。
- `duration` 不能为负数。
- `tick_interval` 必须大于 0。
- `distance` 不能为负数。
- `color` 必须是 hex 格式，例如 `#ff5a1f`。
- `skills` 必须刚好包含 Q/W/E/R 四个槽位。
- 不允许重复 `slot`。
- `type` 必须属于 v1 支持的技能类型。

## 10. 客户端运行时约定

- 客户端固定 3D 地图负责运行该配置。
- 客户端不执行 AI 生成的代码。
- 客户端只解析安全字段。
- 不支持任意脚本字段。
- 不支持自定义函数。
- 不支持 `eval`。
- 不支持远程代码加载。
- 未知字段应被忽略或记录警告。
- 不支持的技能类型应报错或 fallback 到安全占位技能。

## 11. 后端生成约定

- 后端 LLM 生成结果必须经过 Pydantic 校验。
- 生成失败时应该 fallback 到安全默认配置。
- 不允许返回前端无法运行的技能类型。
- LLM 输出必须是 JSON。
- 后端应做数值范围归一化或拒绝非法输出。
- 不能把自然语言方案直接传给运行时。
- 不能让 LLM 输出脚本、函数、表达式或远程代码地址。

## 12. 前端校验约定

- 前端应使用 Zod 或等价方式二次校验。
- 前端应 normalize 技能顺序为 Q/W/E/R。
- 前端应对异常数值做 clamp 或报错提示。
- 前端应为缺失的非关键 VFX 字段提供默认值。
- 前端不应信任后端或 LLM 输出。
- 前端渲染前必须确认 `version`、`hero`、`skills`、`runtime` 基础结构合法。

## 13. 完整示例

完整 JSON 示例见：

```text
docs/playable/HeroPlayableSpec.example.json
```

该示例使用火焰主题英雄“烈焰守卫”，包含 Q/W/E/R 四个技能，分别覆盖 `projectile`、`aoe_dot`、`dash`、`aoe` 类型。

## 14. 后续扩展方向

v1 暂不支持但未来可以扩展：

- `summon` 召唤物技能
- `trap` 陷阱技能
- `combo` 连招技能
- `charge` 蓄力技能
- `channel` 引导技能
- 3D 模型绑定
- 技能图标绑定
- 音效绑定
- 多段技能
- 可试玩 Demo 导出
- Playtest 页面
- 关卡编辑器
