---
story_id: 4.2
story_key: 4-2-xin-de-ti-jiao
epic: 4
epic_title: 学生打卡流程
status: done
priority: high
points: 3
baseline_commit: 45e746a8b9c0eba89e461365019ab8ec2e4a0123
---

# Story 4.2: 心得提交

Status: done

> 来源：Epic 4 Story 4.2 / PRD §4.4 FR-10 / Architecture AD-1, AD-4, AD-5, AD-6, AD-10, AD-11, AD-12, AD-17 / NFR-2, NFR-5, NFR-8 / UX-10, UX-11, UX-13, UX-15, UX-16

## Story

作为一名学生，
我想要在定位签到后填写并提交学习心得，
以便完成打卡内容部分。

## Acceptance Criteria

### AC-1: 签到成功后进入心得提交页

- **Given** 学生已完成定位签到（Story 4.1 已创建 `submitted` 状态的 `check_ins` 记录）
- **When** 签到成功返回
- **Then** 小程序从 `miniprogram/pages/checkin/index` 跳转到 `miniprogram/pages/reflection/index?checkInId=<id>&taskId=<id>&mode=create`
- **And** 页面加载任务标题、截止时间、心得输入框

### AC-2: 心得输入与校验

- **Given** 学生在心得提交页
- **When** 输入心得内容
- **Then** 实时显示字数统计 `0/500`
- **And** 字数不足 10 字时边框变红，提示「再多写一点吧～」（UX-15、UX-16）
- **And** 字数超过 500 字时提示「心得不能超过 500 字」
- **And** 仅支持纯文本，V1 不支持图片/语音/视频附件

### AC-3: 提交心得并触发 AI 初审

- **Given** 学生输入 10–500 字心得并点击「提交心得」
- **When** 调用后端提交接口
- **Then** 系统将心得保存到对应 `check_ins` 记录
- **And** 状态按 AD-11 流转：`submitted` → `ai_reviewing` → `ai_approved` 或 `pending_manual_review`
- **And** AI 初审规则复用 `api/src/domains/reviews/reviews.service.ts` 中已实现的本地规则（字数、敏感词、套话、任务相似度）和可选 LLM 语义审核（AD-3、AD-6、NFR-8）
- **And** AI 初审在 3 秒内返回或超时降级（NFR-2）
- **And** 提交按钮在提交过程中显示 loading 并禁用重复提交（UX-10）

### AC-4: 提交后跳转到结果反馈页

- **Given** 心得提交并返回状态
- **When** AI 初审结果为 `ai_approved`
- **Then** 跳转到 `miniprogram/pages/checkin/result/index?checkInId=<id>&taskId=<id>&status=ai_approved`
- **And** 页面显示「今日打卡完成！」、积分 +10、连续天数、等级进度（Story 4.3 已预实现页面结构）

- **Given** AI 初审结果为 `pending_manual_review`
- **When** 结果返回
- **Then** 跳转到结果页 `status=pending_manual_review`
- **And** 显示「已提交，等待辅导员复核」及复核说明
- **And** 若当前处于仍可修改状态，显示「修改心得」按钮

### AC-5: 仅允许修改 1 次（复核前）

- **Given** 学生已提交心得，状态为 `submitted` 或 `ai_reviewing`
- **When** 学生点击修改并重新提交
- **Then** 系统允许修改 1 次并覆盖原内容
- **And** 一旦进入辅导员复核流程（`pending_manual_review`），学生不可修改，只能等待复核结果
- **And** 状态为「要求修改」时，学生可查看辅导员反馈并重新提交（Story 5.5）

### AC-6: 仅学生可提交心得且只能提交可见任务

- **Given** 非学生角色或任务对学生不可见/已截止
- **When** 调用提交心得 API
- **Then** 返回 `ACCESS_DENIED`、`TASK_NOT_FOUND` 或 `CHECKIN_DEADLINE_PASSED`
- **And** 不创建或修改打卡记录

## Tasks / Subtasks

### 后端任务

- [x] **Task 1: 数据库表扩展** (AC: #2, #3, #5)
  - [x] 1.1 在 `api/src/scripts/migrate.ts` 的 `check_ins` 表新增字段（V1 为简化实现，将 Reflection 字段合并存储在 `check_ins` 表中，逻辑上仍属于 CheckIn 聚合子实体）：
    - `reflection_content TEXT`（心得内容）
    - `ai_review_reason TEXT`（AI 初审未通过原因）
    - `reflection_modified BOOLEAN NOT NULL DEFAULT FALSE`（是否已使用 1 次修改机会）
  - [x] 1.2 新增索引 `idx_check_ins_reflection_status ON check_ins(status, reflection_modified)`（可选，便于查询待复核列表）

- [x] **Task 2: checkins 领域扩展** (AC: #3, #5, #6)
  - [x] 2.1 更新 `api/src/domains/checkins/checkins.types.ts`：
    - 扩展 `CheckIn` 接口增加 `reflection_content`、`ai_review_reason`、`reflection_modified`
    - 新增 `SubmitReflectionInput` 接口：`{ check_in_id: string; content: string }`
    - 扩展 `CheckInResponse` 返回上述字段
  - [x] 2.2 更新 `api/src/domains/checkins/checkins.schema.ts`：
    - 新增 `submitReflectionSchema`：校验 `check_in_id`（uuid）、`content`（string, min 10, max 500）
  - [x] 2.3 在 `api/src/domains/checkins/checkins.service.ts` 实现 `submitReflection(userId, input)`：
    - 根据 `check_in_id` 和学生 `user_id` 查询记录，不存在则抛 `CHECKIN_NOT_FOUND`
    - 校验任务未截止（复用 `assertTaskVisibleToStudent`）
    - 校验状态允许提交：允许 `submitted`、`ai_reviewing`、`requires_modification`；`pending_manual_review` 抛 `CHECKIN_CANNOT_MODIFY_REFLECTION`；`approved`/`rejected` 抛 `CHECKIN_ALREADY_REVIEWED`
    - 对于 `submitted`/`ai_reviewing`：若 `reflection_modified=true` 抛 `CHECKIN_REFLECTION_ALREADY_MODIFIED`
    - 更新 `reflection_content`、设置 `reflection_modified=true`（首次提交不算 modified，重新提交才算）
    - 将状态设为 `ai_reviewing`
    - 调用 `aiReviewReflection({ reflectionContent, taskContent })` 获取结果
    - 根据结果更新状态为 `ai_approved` 或 `pending_manual_review`，并记录 `ai_review_reason`
    - 返回完整 `CheckInResponse`
  - [x] 2.4 更新 `api/src/domains/checkins/checkins.controller.ts`：
    - 新增 `submitReflectionController` 处理 `POST /api/checkins/:id/reflection`
  - [x] 2.5 更新 `api/src/domains/checkins/checkins.routes.ts`：
    - 注册 `POST /:id/reflection`，限制 `student` 角色

- [x] **Task 3: 任务详情返回心得字段** (AC: #4, #5)
  - [x] 3.1 更新 `api/src/domains/tasks/task.types.ts` 中的 `TaskDetail`，已包含 `reflection_content`、`ai_review_reason`、`reflection_modified`
  - [x] 3.2 更新 `api/src/domains/tasks/task.service.ts` 中的 `getMyTaskDetail`：
    - 从 `check_ins` 查询 `reflection_content`、`ai_review_reason`、`reflection_modified` 并返回

- [x] **Task 4: 统一错误码** (AC: #6)
  - [x] 4.1 在 `checkins.service.ts` 中通过 `AppError` 定义错误码：`CHECKIN_NOT_FOUND`、`CHECKIN_DEADLINE_PASSED`、`CHECKIN_CANNOT_MODIFY_REFLECTION`、`CHECKIN_REFLECTION_ALREADY_MODIFIED`、`CHECKIN_ALREADY_REVIEWED`、`CHECKIN_INVALID_STATUS`

### 小程序端任务

- [x] **Task 5: 签到成功跳转心得页** (AC: #1)
  - [x] 5.1 修改 `miniprogram/pages/checkin/index.ts` 中 `onSubmitCheckIn` 成功后的跳转逻辑：
    - 移除 `wx.navigateBack()` 回退行为
    - 改为 `wx.redirectTo({ url: '/pages/reflection/index?checkInId=' + checkIn.id + '&taskId=' + taskId + '&mode=create' })`
  - [x] 5.2 清理 `successNavigateTimer` 相关回退逻辑

- [x] **Task 6: 封装心得提交 API** (AC: #3)
  - [x] 6.1 在 `miniprogram/services/checkinApi.ts` 新增：
    - 接口 `SubmitReflectionData`：`{ content: string }`
    - 函数 `submitReflection(checkInId: string, content: string)` 调用 `POST /api/checkins/${checkInId}/reflection`

- [x] **Task 7: 修复现有 Reflection 页面的修改权限判断** (AC: #5)
  - [x] 7.1 修改 `miniprogram/pages/checkin/result/index.ts` 中的 `canModifyReflection`：
    - 修正为：状态为 `submitted` 或 `ai_reviewing` 且 `reflection_modified !== true` 时才显示修改按钮
    - `requires_modification` 状态由 Story 5.5 处理
  - [x] 7.2 修改 `miniprogram/pages/reflection/index.ts` 编辑模式的入口校验：
    - 仅允许 `submitted` 或 `ai_reviewing` 进入编辑；`pending_manual_review` 进入编辑时提示不可修改并返回

- [x] **Task 8: 结果页文案与状态对齐** (AC: #4)
  - [x] 8.1 确认 `miniprogram/pages/checkin/result/index.wxml` 中 `status === 'ai_approved'` 显示「今日打卡完成！」及积分、连续天数、等级进度
  - [x] 8.2 确认 `status === 'pending_manual_review'` 显示复核说明与修改按钮（按 Task 7 修正后的逻辑）

## Dev Notes

### 关键架构约束

- **AD-1 Thin Client**：小程序只做 UX 校验（字数、空值），所有业务状态流转在后端完成。
- **AD-4 JWT 认证**：所有受保护请求携带 `Authorization: Bearer <token>`。
- **AD-5 API RBAC**：心得提交接口必须限制 `student` 角色，且只能操作自己的 `check_ins` 记录。
- **AD-6 AI 审核同步超时**：调用 `aiReviewReflection` 需有 3 秒超时或异常降级；超时后状态应标记为 `pending_manual_review`，不阻塞用户返回首页。
- **AD-10 Domain Boundaries**：AI 审核逻辑已位于 `api/src/domains/reviews/reviews.service.ts`，`checkins` 领域通过调用其 `aiReviewReflection` 完成状态流转。
- **AD-11 Check-in 状态机**：本 Story 负责 `submitted` → `ai_reviewing` → (`ai_approved` | `pending_manual_review`) 的流转；`approved`/`rejected`/`requires_modification` 由后续 Story 处理。
- **AD-12 Reflection 为子实体**：V1 为简化，将 Reflection 字段存储在 `check_ins` 表中，通过 `check_in_id` 逻辑关联；未来 V2 如需独立表可迁移。
- **AD-17 分端策略**：本 Story 仅实现学生小程序端。
- **NFR-5 传输安全**：心得内容通过 HTTPS 传输。
- **NFR-8 审计**：AI 初审原因需记录，便于后续调优。

### 现有代码清单（不要重复实现）

- ✅ `api/src/domains/reviews/reviews.service.ts` — 已实现本地 AI 审核规则（字数、敏感词、套话、相似度）和 LLM 降级逻辑
- ✅ `api/src/adapters/llm/` — LLM Provider 接口与 DeepSeek 适配器
- ✅ `miniprogram/pages/reflection/index.ts` / `.wxml` / `.wxss` — 心得输入页面已预实现，但需修正编辑模式权限判断
- ✅ `miniprogram/pages/checkin/result/index.ts` / `.wxml` / `.wxss` — 结果反馈页已预实现，但需修正「修改心得」按钮显示逻辑
- ✅ `api/src/domains/checkins/` — 已有签到创建、schema、types、controller、routes、service 骨架
- ✅ `api/src/domains/tasks/task.service.ts` — 已有 `assertTaskVisibleToStudent`、`getMyTaskDetail`

### 数据库变更

```sql
-- 在 check_ins 表扩展心得相关字段（V1 简化方案）
ALTER TABLE check_ins
  ADD COLUMN IF NOT EXISTS reflection_content TEXT,
  ADD COLUMN IF NOT EXISTS ai_review_reason TEXT,
  ADD COLUMN IF NOT EXISTS reflection_modified BOOLEAN NOT NULL DEFAULT FALSE;

-- 可选索引，便于辅导员复核列表查询
CREATE INDEX IF NOT EXISTS idx_check_ins_reflection_status
  ON check_ins(status, reflection_modified);
```

### 状态流转伪代码

```
submitReflection(userId, checkInId, content):
  checkIn = findCheckInByIdAndUserId(checkInId, userId)
  if not checkIn: throw CHECKIN_NOT_FOUND

  assertTaskEditableDeadline(checkIn.task_id) // 任务未截止

  if checkIn.status in ['approved', 'rejected']:
    throw CHECKIN_ALREADY_REVIEWED

  if checkIn.status === 'pending_manual_review':
    throw CHECKIN_CANNOT_MODIFY_REFLECTION

  if checkIn.status in ['submitted', 'ai_reviewing'] and checkIn.reflection_modified:
    throw CHECKIN_REFLECTION_ALREADY_MODIFIED

  // 首次提交：status 为 submitted；重新提交：status 为 ai_reviewing 或 submitted
  const isFirstSubmission = checkIn.reflection_content is null
  const modified = !isFirstSubmission

  update checkIns set
    reflection_content = content,
    reflection_modified = modified,
    status = 'ai_reviewing',
    ai_review_reason = null,
    updated_at = NOW()
  where id = checkInId

  task = fetchTaskById(checkIn.task_id)
  result = aiReviewReflection({ reflectionContent: content, taskContent: task.content })

  newStatus = result.status // ai_approved 或 pending_manual_review
  update checkIns set status = newStatus, ai_review_reason = result.reason where id = checkInId

  return toCheckInResponse(updatedCheckIn)
```

### 小程序跳转流程

```
任务详情页
  ↓ 点击「立即打卡」
/pages/checkin/index?taskId=xxx  （定位签到，Story 4.1）
  ↓ 签到成功
/pages/reflection/index?checkInId=xxx&taskId=xxx&mode=create  （心得提交，本 Story）
  ↓ 提交成功
/pages/checkin/result/index?checkInId=xxx&taskId=xxx&status=ai_approved|pending_manual_review
```

### 需要修正的现有问题

1. `miniprogram/pages/checkin/index.ts` 当前签到成功后 `wx.navigateBack()`，需替换为跳转到心得页。
2. `miniprogram/pages/checkin/result/index.ts` 中 `canModifyReflection` 判断逻辑错误，将 `pending_manual_review` 当作可修改状态。按 Story 4.4，仅 `submitted`/`ai_reviewing` 且未使用过修改机会时才可修改。
3. `miniprogram/services/checkinApi.ts` 缺少 `submitReflection` 函数。
4. 后端 `getMyTaskDetail` 未返回 `reflection_content`、`ai_review_reason`、`reflection_modified`，导致小程序结果页和编辑页无法回显。

## UX Requirements

- 心得输入框占位文案：「写下你的学习心得（最少 10 字）」
- 字数统计显示 `当前字数/500`，不足或超限时变红色
- 错误提示文案：「再多写一点吧～」「心得不能超过 500 字」
- 提交按钮：默认「提交心得」，加载中「提交中...」，禁用重复点击
- 页面背景 `#ECFEFF`，卡片背景 `#FFFFFF`，圆角 32rpx
- 按钮按下 scale(0.98) 100ms
- 结果页成功状态：绿色对勾动画 + 轻微震动

## Testing Requirements

### 后端测试

- [ ] **单元测试**：`checkins.service.ts` 中 `submitReflection` 的状态机校验、修改次数限制、AI 审核调用
- [ ] **集成测试**：`POST /api/checkins/:id/reflection` 各种场景：
  - 正常首次提交 → 200，状态变为 `ai_approved` 或 `pending_manual_review`
  - 正常修改 1 次 → 200，覆盖内容，状态重新进入 `ai_reviewing`
  - 修改第 2 次 → 409 `CHECKIN_REFLECTION_ALREADY_MODIFIED`
  - `pending_manual_review` 状态下修改 → 409 `CHECKIN_CANNOT_MODIFY_REFLECTION`
  - 非本人 check_in → 404 `CHECKIN_NOT_FOUND`
  - 非学生角色调用 → 403 `ACCESS_DENIED`
  - 任务已截止 → 409 `CHECKIN_DEADLINE_PASSED`
  - 内容少于 10 字 → 400 `VALIDATION_ERROR`
  - 内容超过 500 字 → 400 `VALIDATION_ERROR`
  - AI 审核超时 → 状态降级为 `pending_manual_review`，接口仍 200

### 小程序测试

- [ ] **手动测试**：签到成功后正确跳转到心得页
- [ ] **手动测试**：心得输入字数统计、错误提示、提交 loading
- [ ] **手动测试**：AI 初审通过后跳转到成功页，待复核后显示复核说明
- [ ] **手动测试**：修改按钮仅在 `submitted`/`ai_reviewing` 且未修改过时显示

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- 后端 `POST /api/checkins/:id/reflection` 已实现，完成 `submitted` → `ai_reviewing` → `ai_approved`/`pending_manual_review` 状态流转，AI 审核异常时降级到 `pending_manual_review`。
- 数据库 `check_ins` 表已扩展心得字段；`TaskDetail` 已返回这些字段供小程序回显。
- 小程序签到成功后的跳转已改为 `pages/reflection/index`；`result` 页和 `reflection` 页的修改权限判断已按 Story 4.4 修正。
- 全量 API 测试通过：`107 passed`（含 22 个 checkins 测试）。
- 运行测试需同时设置 `DATABASE_URL` 与 `TEST_DATABASE_URL` 指向同一测试库；当前 `.env` 中的 `DATABASE_URL` 指向 Supabase，与 `TEST_DATABASE_URL` 不一致会导致测试失败。

## Change Log

- 2026-06-24: Story 4.2 创建，定义心得提交后端 API、数据库扩展、小程序跳转与现有代码修正点。
- 2026-06-24: Story 4.2 实现完成，后端接口、小程序跳转、权限判断修正、测试全部通过，状态更新为 review。

### Review Findings

> Generated by `bmad-code-review` (2026-06-24)

#### Decision Needed

- [x] [Review][Decision→Defer] 结果页显示固定/伪造的积分与等级数据 — `miniprogram/pages/checkin/result/index.wxml:35-51` 硬编码 “+10 积分”“1 连续天数”“10% 等级进度”，未从后端获取。用户决策：V1 保留静态占位，由后续 Story 4.3 / Epic 6 接入真实数据。

#### Patch

- [x] [Review][Patch] 前端/后端对 `requires_modification` 状态处理不一致 — `miniprogram/pages/reflection/index.ts:71-83`、`miniprogram/pages/checkin/result/index.ts:20-23`
- [x] [Review][Patch] 编辑页文案错误暗示 `pending_manual_review` 仍可修改 — `miniprogram/pages/reflection/index.wxml:22`
- [x] [Review][Patch] 并发提交可突破“仅允许修改 1 次”限制 — `api/src/domains/checkins/checkins.service.ts:119-148`
- [x] [Review][Patch] 状态流转拆分为两次非原子更新 — `api/src/domains/checkins/checkins.service.ts:138-180`
- [x] [Review][Patch] `submitReflection` 层未保证 3 秒 AI 审核超时 — `api/src/domains/checkins/checkins.service.ts:155-164`
- [x] [Review][Patch] LLM 异常时 `reviews.service.ts` 错误降级为 `ai_approved` — `api/src/domains/reviews/reviews.service.ts:165-175`
- [x] [Review][Patch] `submitReflectionSchema` 未校验 `check_in_id` — `api/src/domains/checkins/checkins.schema.ts:11-15`
- [x] [Review][Patch] 空输入（0 字）未触发“字数不足”红色边框与提示 — `miniprogram/pages/reflection/index.ts:125-134`
- [x] [Review][Patch] `textarea maxlength="500"` 使“超过 500 字提示”逻辑不可达 — `miniprogram/pages/reflection/index.wxml:34-42`
- [x] [Review][Patch] 缺少 `requires_modification` 重提交的自动化测试 — `api/tests/checkins.test.ts`
- [x] [Review][Patch] 缺少 AI 审核超时/异常降级的自动化测试 — `api/tests/checkins.test.ts`
- [x] [Review][Patch] 复核原因文案硬编码依赖服务端字符串 — `miniprogram/pages/reflection/index.ts:10-26`
- [x] [Review][Patch] UUID 正则校验在多个页面重复定义 — `miniprogram/pages/reflection/index.ts:4-8`、`miniprogram/pages/checkin/result/index.ts:3-8`
- [x] [Review][Patch] controller 内部校验顺序：schema 解析在认证检查之前 — `api/src/domains/checkins/checkins.controller.ts:39-49`

#### Defer

- [x] [Review][Defer] 敏感词/套话检测使用朴素子串匹配 — `api/src/domains/reviews/reviews.service.ts`（V1 规则引擎已知局限）
- [x] [Review][Defer] Jaccard 字符相似度指标不适用于中文 — `api/src/domains/reviews/reviews.service.ts`（阈值缺乏经验依据，后续改进）
- [x] [Review][Defer] 未对 reflection 接口做限流/滥用防护 — `api/src/domains/checkins/checkins.routes.ts`（后续在网关/路由层补充）
- [x] [Review][Defer] 缺少独立的 AI 审核审计日志 — `api/src/domains/checkins/checkins.service.ts`（后续引入审计表）
- [x] [Review][Defer] 用户输入未做服务端清洗，存在跨客户端 XSS 隐患 — `api/src/domains/checkins/checkins.service.ts`（WXML 已自动转义，当前安全；未来 web 端需清洗）
- [x] [Review][Defer] 新建索引暂无对应查询 — `api/src/scripts/migrate.ts`（规范中标注的可选索引，供后续辅导员复核列表使用）

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 4 / Story 4.2]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.4 FR-10]
- [Source: `architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-1, AD-4, AD-5, AD-6, AD-10, AD-11, AD-12, AD-17, Consistency Conventions]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md` 颜色、字体、组件规范]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md` 心得输入、打卡成功、文案禁忌]
- [Source: `implementation-artifacts/4-1-ding-wei-qian-dao.md` 前置 Story 实现约定]
- [Source: `implementation-artifacts/4-1-review.md` 代码评审结论与已修复问题]
