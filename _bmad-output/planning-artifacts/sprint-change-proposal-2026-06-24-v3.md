---
title: Sprint Change Proposal v3 — 地理围栏 + 任务派发 + 任务结构化内容（MVP）
status: approved
created: 2026-06-24
trigger: |
  1) 地理围栏（类似学习通位置签到）从 V2 提前纳入 MVP；
  2) "两角色都能自创任务"难维护 → 模式 A（管理员建任务池 + 辅导员派发，A1 单表方案）；
  3) 纯文本任务单薄 → 任务内容 P1 结构化（正文 + 思考题 + 外部链接）进 MVP；富媒体 P3 留 V2；
  4) 人脸识别因合规与成本留 V2。
scope_classification: Major (MVP 范围扩张 + 已完成 Story 3.1/3.2 收敛 + tasks 域代码改动)
user_decisions:
  - 地理围栏：纳入 MVP；后端集中配置+校验；配置 UI 随 Web（14.2）；排管理员侧之后
  - 任务发布：模式 A（管理员建池 + 辅导员派发），A1 单表方案
  - 任务内容：P1 结构化纯文本进 MVP（正文 + 思考题 + 外部链接）；P3 富媒体留 V2
  - 人脸识别：暂不实现，留 V2
contains_three_independent_changes: true
  - 变更一（§A）：地理围栏进 MVP（AD-20 + Story 4.5）
  - 变更二（§B）：任务派发模式（AD-21 + Story 3.1/3.2 修订 + tasks 域代码）
  - 变更三（§D）：任务内容 P1 结构化（AD-22 + tasks 表加字段）
  - V2 登记（§C + §E）：人脸识别 + 富媒体 P3
---

# Sprint Change Proposal v3：地理围栏 + 任务派发 + 任务结构化内容（MVP）

> 三个**相互独立**的 MVP 变更 + 两项 V2 登记，可独立审批与实施：
> - **§A 地理围栏进 MVP**（AD-20 + Story 4.5）
> - **§B 任务派发模式**（AD-21 + Story 3.1/3.2 修订 + tasks 域代码）
> - **§D 任务内容 P1 结构化**（AD-22 + tasks 表加字段）
> - **§C 人脸识别 / §E 富媒体 P3** → V2 登记

---

# 变更一（§A）：地理围栏纳入 MVP

## A1. 决策
- 围栏纳入当前 MVP；后端集中配置+校验；配置 UI 随 Web 后台（14.2）；排期在管理员侧之后。
- 围栏仅管理员可配置，辅导员只读。

## A2. 影响
- Story 4.1（已完成）不回退：`check_ins` 的 latitude/longitude/address 列直接复用，零返工。
- 新增 Story 4.5：checkins 领域增量加 Haversine 判定，命中失败返回 `CHECKIN_OUTSIDE_GEOFENCE`。
- 后端校验逻辑可先用种子 SQL 并行开发，不被 14.2 阻塞关键路径。

## A3. AD-20

```markdown
### AD-20 — 地理围栏由后端集中配置与校验
- **Binds:** checkins 领域、管理员配置（Web）、签到流程
- **Prevents:** 围栏规则散落客户端被绕过；多端判定不一致；位置作弊
- **Rule:**
  - 围栏（center_lat/center_lng + radius_meters + scope）由管理员在 Web 后台集中维护，存于 `geofences` 表。仅管理员可配置；辅导员只读。
  - 签到时 `checkins.createOrUpdateCheckIn` 落库前做 Haversine 点-圆判定：命中任一适用围栏（按 scope_type 匹配 school/building/class）即通过；全部未命中拒绝，返回 `CHECKIN_OUTSIDE_GEOFENCE`。
  - 小程序仅 `wx.getLocation`（gcj02）获取与错误态展示，不做判定（AD-1）。
  - 围栏坐标统一 gcj02；Web UI 就绪前支持种子 SQL 配置。
```

## A4. PRD 变更
- §4.4 FR-9 Consequences 新增围栏校验条款。
- §5.1 In Scope 增补"学生定位签到（含地理围栏校验）"。
- §5.2 Out of Scope 删除"地理围栏校验"行；保留"虚拟定位/作弊检测"（设备级反作弊仍 V2）。

## A5. 新增 Story 4.5：地理围栏校验

```markdown
### Story 4.5：地理围栏校验
作为学校管理员，我想要为签到配置地理围栏，以便学生只能在指定区域打卡，防止异地代签。
- **Given** 管理员已配置围栏（中心点 + 半径 + 作用域）
- **When** 学生点击「立即打卡」
- **Then** 后端判定是否命中适用围栏
- **And** 命中：正常打卡（复用 4.1）；未命中：拒绝，返回 `CHECKIN_OUTSIDE_GEOFENCE`
- **And** 小程序展示「当前不在签到范围内，请到指定地点打卡」
- **And** 围栏按作用域匹配（school/building/class，AD-14）；坐标统一 gcj02
- **And** 仅管理员可配置；Web UI 就绪前支持种子 SQL
覆盖需求：FR-9（围栏扩展）、AD-1、AD-5、AD-14、AD-20
归属端：后端（checkins 域）+ 学生小程序（错误态）+ 管理员 Web（配置 UI，随 14.2）
依赖：Story 4.1、Epic 14.2、Epic 9.x
```

---

# 变更二（§B）：任务发布收敛为派发模式（模式 A）

## B1. 决策
- 管理员是任务内容唯一源头（建任务池）；辅导员不能自创内容，只能从池中选源任务派发给本班（scope 固定 class），设截止时间。
- 采用 A1 单表方案：tasks 表加 `source_task_id`。

## B2. 返工评估
| 层 | 返工 | 说明 |
|----|------|------|
| 辅导员小程序发任务页 | 零 | 本就 backlog，直接按派发做 |
| 学生端 | 零 | 读 tasks 行不变 |
| 后端 tasks 域 | 小 | 加 source_task_id + 辅导员分支改为"必须引用源任务" |

## B3. AD-21

```markdown
### AD-21 — 任务内容源头单一（管理员建池 + 辅导员派发）
- **Binds:** tasks 域、管理员/辅导员权限、任务发布流程
- **Prevents:** 思政内容碎片化与质量参差；重复创建；缺乏审核；全校统计来源混杂
- **Rule:**
  - 管理员是任务内容唯一源头：创建/编辑/下架任务（title/content/思考题/链接），可直接发布到 school/college/class，或发布到任务池供派发。
  - 辅导员不能自创内容，只能派发：选源任务（source_task_id），指定本班（scope=class，校验 counselor_classes），设截止时间，生成派发实例。
  - 派发实例的正文从源任务拷贝（快照），辅导员不可改 title/content/guiding_questions/source_url；只能改 target_class_id/deadline_at/下架。
  - tasks 表加 `source_task_id`（nullable UUID，指向源任务；管理员直接创建的为 NULL）。
  - 学生端逻辑不变。
```

## B4. PRD 变更
**§4.3 FR-5 发布任务** 修订：管理员是内容唯一源头；辅导员只能从池中派发源任务到本班；派发实例正文从源拷贝，辅导员不可改正文。

**§5.1 In Scope** 增补"任务发布（管理员建池 + 辅导员派发）"。

## B5. Story 3.1 / 3.2 修订
- **3.1**：拆双职责（管理员创建源任务 / 辅导员派发）；辅导员分支新增 AC：必须传 source_task_id，scope 固定 class，不可改 title/content。
- **3.2**：管理员可编辑源任务全部字段；辅导员只能改派发实例的 target_class_id/deadline_at + 下架。

## B6. tasks 域代码收敛清单
| 文件 | 改动 |
|------|------|
| migrate.ts | tasks 表加 `source_task_id UUID REFERENCES tasks(id) NULL` |
| task.types.ts | Task 加 source_task_id；CreateTaskInput 加可选 source_task_id |
| task.service.ts assertScopePermission 辅导员分支 | 强制 source_task_id 存在 + scope=class |
| task.service.ts createTask 辅导员分支 | 从 source_task 查 title/content/guiding_questions/source_url 快照写入 |
| task.service.ts assertTaskEditable | 辅导员只能改 deadline_at/target_class_id |
| task.schema.ts | createTaskSchema 加可选 source_task_id |
| tasks.test.ts | 辅导员无 source_task_id 创建 → 403；有 → 201 |

---

# 变更三（§D）：任务内容 P1 结构化

## D1. 决策
- 任务内容从"纯文本 title+content"升级为 P1 结构化：**正文 + 思考题 + 外部链接 + 视频 URL（外部托管）**。
- 视频采用 URL 方案（指向外部托管如学习强国/学校官网），不涉及自托管上传；需在微信小程序后台配置视频域名白名单。
- 富媒体 P3（自托管图片/视频/PDF 上传 + 富文本编辑器）留 V2（依赖文件存储基建，尚不存在）。

## D2. 为什么是 P1 而非纯文本或 P3
- 纯文本"单薄"的根因不是缺视觉，而是**缺思考引导**——学生读完不知写啥，只能套话敷衍（正是 AI 初审 Story 5.1 要防的）。
- P1 加"思考题"直击痛点，让心得有方向，AI 初审也可针对思考题校验相关性。
- P1 零架构改动（纯文本 + JSON + 字符串字段），不依赖文件存储。
- 视频 URL 是外部托管链接，与 source_url 同为字符串字段，零存储成本；仅需微信域名白名单配置。
- P3 富媒体（自托管上传）需要文件存储基建（当前 AD-7 仅为导出报告设计，非通用媒体存储），属 V2。

## D3. AD-22

```markdown
### AD-22 — 任务内容采用 P1 结构化纯文本（正文 + 思考题 + 外部链接 + 视频 URL）
- **Binds:** tasks 域、任务内容形态、心得审核
- **Prevents:** 纯文本任务缺乏思考引导导致套话敷衍；过早引入自托管富媒体带来的存储与审核成本
- **Rule:**
  - V1 任务内容由四部分组成：正文（content，纯文本）+ 思考题（guiding_questions，JSONB 数组，可选）+ 外部链接（source_url，可选）+ 视频 URL（video_url，可选，指向外部托管）。
  - 存储为 tasks 表的四个字段；guiding_questions 为 JSONB 数组（如 ["问题1","问题2"]）。
  - 视频 URL 指向外部托管（如学习强国/学校官网），V1 不支持自托管视频上传；需在微信小程序后台配置视频域名白名单。
  - 学生心得（reflection）仍为纯文本 10–500 字（不变）；思考题为可选，不强制要求逐题作答。
  - 自托管富媒体（图片/视频/PDF 上传 + 富文本编辑器）推迟到 V2，依赖通用文件存储基建。
  - AI 初审（Story 5.1）可利用 guiding_questions 提升相关性检测（V1 可选，不强制）。
```

## D4. PRD 变更
**§4.3 任务管理 Description / FR-5** 增补：
- 任务内容包含：标题、正文（纯文本）、思考题（可选，引导学生撰写心得）、外部链接（可选）、视频 URL（可选，指向外部托管）。
- 修订 Open Question 5：~~V1 任务内容仅支持纯文本~~ → V1 任务内容为结构化纯文本（正文+思考题+链接+视频URL），自托管富媒体（图片/视频/PDF 上传、富文本）推迟 V2。

**§5.2 Out of Scope** 更新"多媒体心得附件"行为：自托管富媒体任务内容（图片/视频/PDF 上传、富文本）留 V2（依赖文件存储）；视频 URL 外部链接已进 MVP。

## D5. tasks 表字段变更
```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS guiding_questions JSONB DEFAULT NULL,   -- ["问题1","问题2"]
  ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT NULL,           -- 延伸阅读链接
  ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;            -- 视频 URL（外部托管）
```
- task.types.ts：Task/CreateTaskInput/UpdateTaskInput 加 guiding_questions/source_url/video_url。
- 派发时（§B）：guiding_questions/source_url/video_url 随 title/content 一起从源任务拷贝。
- 微信小程序后台：配置视频域名白名单（`request合法域名`/`downloadFile域名`/业务域名，按视频托管方而定）。

---

# V2 登记一（§C）：人脸识别
- 合规前置：受《个人信息保护法》约束，须先经学校审批。
- 方案候选：A 第三方云服务（微信人脸核验/腾讯云/阿里云）；B 后端自建 1:1 比对。
- 架构方向（待落定）：仿 AD-3 做 FaceVerificationProvider 可切换适配器；优先存比对结果而非原始图像。
- 触发：合规审批通过 + 选型确定后进入 V2。

# V2 登记二（§E）：自托管富媒体任务内容（P3）
- 含**自托管**图片/视频/PDF 文件上传、富文本编辑器（视频 URL 外部链接已进 MVP，见 §D）。
- 依赖：通用文件存储基建（当前 AD-7 仅为导出报告设计，需扩展为通用媒体存储，V2 新增 AD）。
- 含上传接口、文件类型/大小限制、CDN、图片审核（OCR+图像）、小程序富文本/视频适配。
- 触发：V2 文件存储基建完成后。

---

# 实施 Handoff

## 实施顺序
1. **[当前]** Story 8.3 Code Review 收尾（不受影响）
2. **[可立即，不依赖 Web]** §B tasks 域代码收敛（source_task_id + 派发分支）+ §D P1 字段（guiding_questions/source_url）—— 两者改的都是 tasks 表/域，建议合并一次开发
3. **[Web 基建]** Epic 14.2 Web 布局
4. **[管理员基座]** Epic 9.x 组织/用户管理
5. **[围栏]** Story 4.5（后端可先用种子 SQL 并行）+ 配置 UI（随 Web）
6. **[并行]** Story 8.4、Epic 10、Epic 11、Epic 13.1/13.2

## 产物改动总表
| 产物 | §A围栏 | §B派发 | §D内容P1 | §C人脸 | §E富媒体 |
|------|-------|-------|----------|-------|---------|
| prd.md | §4.4/§5.1/§5.2 | §4.3 FR-5/§5.1 | §4.3/Q5/§5.2 | §5.2 | §5.2 |
| ARCHITECTURE-SPINE | AD-20 | AD-21 | AD-22 | — | — |
| epics.md | Story 4.5 | Story 3.1/3.2 修订 | Story 3.1 内容字段 | — | — |
| sprint-status.yaml | 4-5 backlog, epic-4 重开 | 3.1/3.2 重开, epic-3 重开 | （并入 3.1） | — | — |
| tasks 域代码 | — | source_task_id + 派发分支 | guiding_questions + source_url | — | — |
| deferred-work.md | — | — | — | 人脸识别 V2 | 富媒体 V2 |

## 成功标准
- 围栏：管理员可配置（Web），学生越界打卡被拒；围栏内正常。
- 派发：辅导员无法自创内容，只能派发源任务到本班；管理员是内容唯一源头。
- P1 内容：任务含正文+思考题+链接；学生心得仍纯文本。
- 人脸识别 + 富媒体登记为 V2。
- PRD/架构/epics/sprint-status/tasks 代码全部反映上述变更。

---

## 审批
- [x] §A 地理围栏进 MVP — 用户批准
- [x] §B 任务派发模式 A1 — 用户批准
- [x] §D 任务内容 P1 结构化 — 用户批准（P1 进 MVP / P3 留 V2）
- [x] §C 人脸识别登记 V2 — 用户批准
- [x] §E 富媒体 P3 登记 V2 — 用户批准（随 P3 决策）

## 修订记录
| 版本 | 日期 | 内容 |
|------|------|------|
| 1.0 | 2026-06-24 | 初版：围栏+人脸均 V2 |
| 2.0 | 2026-06-24 | 围栏进 MVP |
| 3.0 | 2026-06-24 | +任务派发模式 A1 |
| 5.0 | 2026-06-24 | 视频URL（外部托管）进 MVP，P1 升级为 P1+（正文+思考题+链接+视频URL）；§E 收敛为自托管富媒体留 V2 |
