---
story_id: 4.4
story_key: 4-4-xin-de-ti-jiao-hou-xiu-gai-1-ci
epic: 4
epic_title: 学生打卡流程
status: done
priority: high
points: 2
baseline_commit: 9d19c9c85d3317759a9241b7541216fef3affa06
completion_commit: TBD
---

# Story 4.4: 心得提交后修改（1 次）

Status: done

> 来源：Epic 4 Story 4.4 / PRD §4.4 FR-10 / Architecture AD-1, AD-6, AD-11, AD-12, AD-17, NFR-5 / UX-10, UX-13, UX-15, UX-16 / EXPERIENCE.md 文案规范
>
> 注意：本 Story 对 Epic 4.4 原文的可修改状态做了范围修正。Epic 原文允许在 `submitted/ai_reviewing` 阶段修改，但因 AI 初审为同步调用，该窗口在 Story 4.2 中已自然关闭。本 Story 按产品实际需求实现：学生在 AI 初审进入 `pending_manual_review` 后，或在辅导员标记 `requires_modification` 后，获得一次修改机会。

## Story

作为一名学生，
我想要在 AI 初审未通过或辅导员要求修改后，有一次机会修改我的心得内容，
以便补充更完整、真实的体会，提高打卡通过率。

## Acceptance Criteria

### AC-1: 支持从 `pending_manual_review` 修改一次心得

- **Given** 学生已提交心得，且当前 `check_ins.status` 为 `pending_manual_review`
- **When** 学生通过任务详情或结果页进入修改入口，重新填写并提交 10–500 字心得
- **Then** 系统将 `reflection_content` 覆盖为新内容
- **And** 将 `reflection_modified` 标记为 `true`
- **And** 先将状态置为 `ai_reviewing`，再调用 AI 初审
- **And** 根据 AI 初审结果将状态更新为 `ai_approved` 或 `pending_manual_review`
- **And** 返回更新后的 `CheckInResponse`

### AC-2: 从 `pending_manual_review` 仅允许修改一次

- **Given** 学生已针对 `pending_manual_review` 状态修改过一次心得（`reflection_modified = true`）
- **When** 学生再次尝试修改
- **Then** 后端返回 `CHECKIN_REFLECTION_ALREADY_MODIFIED`（409）
- **And** 不修改任何数据

### AC-3: 支持从 `requires_modification` 修改心得

- **Given** 辅导员已将该打卡标记为 `requires_modification`
- **When** 学生查看辅导员反馈并重新提交心得
- **Then** 系统覆盖 `reflection_content`
- **And** 将状态流转为 `ai_reviewing` 并经 AI 初审后回到 `ai_approved` 或 `pending_manual_review`
- **And** 不强制校验 `reflection_modified` 标志（辅导员要求的修改不受一次限制）

### AC-4: 学生只能修改自己的心得

- **Given** 学生尝试修改不属于自己的 `check_in`
- **When** 调用修改相关 API
- **Then** 返回 `TASK_NOT_FOUND`（404）
- **And** 不修改任何数据

### AC-5: 已逾期任务不可修改心得

- **Given** 任务截止时间已过
- **When** 学生尝试修改心得
- **Then** 返回 `CHECKIN_DEADLINE_PASSED`（409）
- **And** 不修改打卡记录

### AC-6: 状态不可修改时给出明确错误

- **Given** 打卡状态为 `approved`、`rejected`、`ai_approved` 或 `submitted`（未提交过心得）
- **When** 学生调用修改心得 API
- **Then** 返回 `CHECKIN_CANNOT_MODIFY_REFLECTION`（409）
- **And** 前端根据错误码提示「当前状态不允许修改心得」

### AC-7: 小程序提供修改入口

- **Given** 学生在任务详情页，且 `check_in_status` 为 `pending_manual_review`（未修改过）或 `requires_modification`
- **When** 页面加载完成
- **Then** 展示「修改心得」入口按钮
- **And** 点击后跳转到心得页并回显当前心得内容

### AC-8: 结果页为待复核状态提供修改入口

- **Given** 学生在打卡结果页，且当前状态为 `pending_manual_review`
- **When** 页面加载完成
- **Then** 展示「修改心得」按钮（仅当 `reflection_modified = false`）
- **And** 点击后跳转到心得页进入修改模式

## Tasks / Subtasks

### 后端任务

- [x] **Task 1: 数据库表扩展** (AC: #1, #2, #3)
  - [x] 1.1 在 `check_ins` 表新增 `reflection_modified BOOLEAN NOT NULL DEFAULT false`
  - [x] 1.2 更新 `api/src/scripts/migrate.ts` 中的 `MIGRATION_SQL`

- [x] **Task 2: 类型扩展** (AC: #1, #2, #3)
  - [x] 2.1 在 `api/src/domains/checkins/checkins.types.ts` 的 `CheckIn` / `CheckInResponse` 中增加 `reflection_modified: boolean`
  - [x] 2.2 在 `api/src/domains/tasks/task.types.ts` 的 `TaskDetail` 中增加 `reflection_modified?: boolean`（用于小程序判断入口）

- [x] **Task 3: 后端提交/修改心得逻辑重构** (AC: #1, #2, #3, #4, #5, #6)
  - [x] 3.1 在 `api/src/domains/checkins/checkins.service.ts` 中定义状态分组常量：
    - `FIRST_SUBMISSION_STATUSES = ['submitted', 'ai_reviewing']`
    - `MODIFICATION_STATUSES = ['pending_manual_review', 'requires_modification']`
  - [x] 3.2 修改 `submitReflection`：
    - 校验 `checkInId` 存在且属于当前用户
    - 校验任务未截止
    - 判断当前状态属于首次提交还是修改
    - 对 `pending_manual_review` 校验 `reflection_modified = false`
    - 对修改请求：先更新为 `ai_reviewing` + `reflection_modified = true`，再运行 AI 初审，最后更新为 `ai_approved` / `pending_manual_review`
    - 对首次提交：保持 Story 4.2 行为，直接更新为 AI 初审结果
    - 返回 `CheckInResponse`（含 `reflection_modified`）
  - [x] 3.3 新增错误码 `CHECKIN_REFLECTION_ALREADY_MODIFIED`

- [x] **Task 4: 任务详情返回 reflection_modified** (AC: #7)
  - [x] 4.1 修改 `api/src/domains/tasks/task.service.ts` 的 `getMyTaskDetail` 与 `fetchUserCheckIns`，在 `TaskDetail` 中返回 `reflection_modified`

### 小程序端任务

- [x] **Task 5: 心得页支持修改模式** (AC: #1, #2, #3, #7, #8)
  - [x] 5.1 修改 `miniprogram/pages/reflection/index.ts`：
    - 支持 query 参数 `mode=edit` 与 `status`（当前打卡状态）
    - `mode=edit` 时，从 `task.reflection_content` 回显已有内容
    - 标题随模式切换：「提交心得」/「修改心得」
    - 提交按钮文案：「提交心得」/「保存修改」
    - 修改模式下展示提示：
      - `pending_manual_review`：「AI 初审未通过，你还有 1 次修改机会」
      - `requires_modification`：「辅导员建议你补充内容后重新提交」
  - [x] 5.2 修改 `miniprogram/pages/reflection/index.wxml`：
    - 根据 `isEditMode` 展示不同标题、按钮文案和提示卡片
  - [x] 5.3 修改 `miniprogram/pages/reflection/index.wxss`：
    - 新增修改提示条样式（warning 色背景、圆角、内边距）

- [x] **Task 6: 任务详情页增加修改入口** (AC: #7)
  - [x] 6.1 修改 `miniprogram/pages/task/detail/index.ts`：
    - 当 `task.check_in_status` 为 `pending_manual_review` 且 `task.reflection_modified !== true` 时，显示「修改心得」按钮
    - 当 `task.check_in_status` 为 `requires_modification` 时，显示「修改心得」按钮
    - 点击跳转到 `/pages/reflection/index?checkInId={{id}}&taskId={{taskId}}&mode=edit&status={{check_in_status}}`
  - [x] 6.2 修改 `miniprogram/pages/task/detail/index.wxml`：
    - 在底部按钮区增加「修改心得」次要按钮（与「立即打卡」互斥）

- [x] **Task 7: 结果页增加修改入口** (AC: #8)
  - [x] 7.1 修改 `miniprogram/pages/checkin/result/index.ts`：
    - 接收 query 参数 `reflectionModified` 或在 `task` 数据中取 `reflection_modified`
    - 当 `status === 'pending_manual_review'` 且 `reflection_modified !== true` 时，显示「修改心得」按钮
    - 点击跳转到 `/pages/reflection/index?checkInId=...&taskId=...&mode=edit&status=pending_manual_review`
  - [x] 7.2 修改 `miniprogram/pages/checkin/result/index.wxml`：
    - 在待复核视图底部增加「修改心得」次要按钮

- [x] **Task 8: API 客户端类型扩展** (AC: #1, #7, #8)
  - [x] 8.1 修改 `miniprogram/services/checkinApi.ts` 的 `CheckInResponse`，增加 `reflection_modified?: boolean`
  - [x] 8.2 修改 `miniprogram/services/taskApi.ts` 的 `Task`，增加 `reflection_modified?: boolean`

## Dev Notes

### 关键架构约束

- **AD-1 Thin Client**：状态机与修改次数限制由后端强制执行；小程序仅根据后端返回的状态和标志位控制入口展示。
- **AD-6 AI 同步调用超时**：本 Story 继续使用同步 AI 初审；修改流程中 `ai_reviewing` 为事务内的短暂中间状态，客户端最终看到的是 `ai_approved` 或 `pending_manual_review`。
- **AD-11 Check-in 状态机**：
  - 首次提交：`submitted/ai_reviewing` → AI 初审 → `ai_approved` / `pending_manual_review`
  - 学生主动修改（`pending_manual_review`）：→ `ai_reviewing` → AI 初审 → `ai_approved` / `pending_manual_review`
  - 辅导员要求修改（`requires_modification`）：→ `ai_reviewing` → AI 初审 → `ai_approved` / `pending_manual_review`
- **AD-12 Reflection 为 CheckIn 子实体**：`reflection_modified` 作为 `check_ins` 表的字段，与心得内容同表存储。
- **AD-17 分端策略**：本 Story 仅实现学生小程序端。
- **NFR-5 传输安全**：所有 API 调用使用 HTTPS。

### 数据库变更

```sql
-- 在现有 check_ins 表基础上新增 reflection_modified 标志
ALTER TABLE check_ins
  ADD COLUMN IF NOT EXISTS reflection_modified BOOLEAN NOT NULL DEFAULT false;
```

说明：
- `reflection_modified` 默认 `false`。
- 首次提交心得后保持 `false`。
- 从 `pending_manual_review` 或 `requires_modification` 修改后设置为 `true`。
- 用于限制学生在 `pending_manual_review` 阶段仅可主动修改一次。

### 当前代码状态（Story 4.3 完成后）

- 后端：
  - `api/src/domains/checkins/checkins.service.ts` 中 `submitReflection` 仅允许 `REFLECTION_EDITABLE_STATUSES = ['submitted', 'ai_reviewing']`。
  - 状态进入 `pending_manual_review` 或 `requires_modification` 后返回 `CHECKIN_CANNOT_MODIFY_REFLECTION`。
  - `check_ins` 表尚无 `reflection_modified` 字段。
- 小程序：
  - `miniprogram/pages/reflection/index` 仅支持首次提交，无修改模式。
  - `miniprogram/pages/task/detail/index` 在 `reviewing` 状态仅展示心得摘要，无修改入口。
  - `miniprogram/pages/checkin/result/index` 在 `pending_manual_review` 视图仅提供「返回首页」「查看任务详情」。

### 需要修改/新增的文件

**后端 UPDATE：**
- `api/src/scripts/migrate.ts` — 新增 `reflection_modified` 字段
- `api/src/domains/checkins/checkins.types.ts` — 扩展 `CheckIn` / `CheckInResponse`
- `api/src/domains/checkins/checkins.service.ts` — 重构 `submitReflection` 支持修改
- `api/src/domains/tasks/task.types.ts` — `TaskDetail` 增加 `reflection_modified?`
- `api/src/domains/tasks/task.service.ts` — `fetchUserCheckIns` / `getMyTaskDetail` 返回 `reflection_modified`

**小程序 UPDATE：**
- `miniprogram/services/checkinApi.ts` — `CheckInResponse` 增加 `reflection_modified?`
- `miniprogram/services/taskApi.ts` — `Task` 增加 `reflection_modified?`
- `miniprogram/pages/reflection/index.ts` — 支持修改模式
- `miniprogram/pages/reflection/index.wxml` — 修改模式 UI
- `miniprogram/pages/reflection/index.wxss` — 修改提示样式
- `miniprogram/pages/task/detail/index.ts` — 增加修改入口
- `miniprogram/pages/task/detail/index.wxml` — 增加修改按钮
- `miniprogram/pages/checkin/result/index.ts` — 增加修改入口
- `miniprogram/pages/checkin/result/index.wxml` — 增加修改按钮

**无新增后端路由**：复用 `POST /api/checkins/:id/reflection`。

### API 契约

#### POST /api/checkins/:id/reflection（扩展）

请求与响应结构不变，仅放宽可修改状态并新增返回字段。

```typescript
// Request: { reflection_content: string }

// Response: ApiResponse<CheckInResponse>
interface CheckInResponse {
  id: string;
  task_id: string;
  status: CheckInStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  reflection_content: string | null;
  reflection_modified: boolean; // 新增
  checked_in_at: string;
}
```

可接受的状态：
- 首次提交：`submitted`, `ai_reviewing`
- 修改：`pending_manual_review`（限一次）, `requires_modification`

新增/复用错误码：
- `CHECKIN_REFLECTION_ALREADY_MODIFIED`（409）：`pending_manual_review` 已修改过一次
- `CHECKIN_CANNOT_MODIFY_REFLECTION`（409）：当前状态不允许修改
- `CHECKIN_DEADLINE_PASSED`（409）：任务已截止
- `CHECKIN_NOT_FOUND` / `TASK_NOT_FOUND`（404）：记录不存在或无权访问
- `VALIDATION_ERROR`（400）：心得字数不满足 10–500 字

#### GET /api/tasks/my/:id（扩展）

```typescript
interface TaskDetail extends StudentTask {
  check_in_status?: CheckInStatus;
  reflection_content?: string;
  reflection_modified?: boolean; // 新增
}
```

### 状态流转

```
首次提交（Story 4.2，保持不变）
  submitted / ai_reviewing
    ↓ submitReflection
  reflection_content = '...'
    ↓ aiReviewReflection
  status = ai_approved 或 pending_manual_review

学生主动修改（本 Story AC-1/AC-2）
  pending_manual_review (reflection_modified = false)
    ↓ submitReflection
  reflection_content = '新内容'
  reflection_modified = true
  status = ai_reviewing
    ↓ aiReviewReflection
  status = ai_approved 或 pending_manual_review

辅导员要求修改（本 Story AC-3，与 Story 5.5 衔接）
  requires_modification
    ↓ submitReflection
  reflection_content = '新内容'
  reflection_modified = true
  status = ai_reviewing
    ↓ aiReviewReflection
  status = ai_approved 或 pending_manual_review
```

### 后端 `submitReflection` 实现要点

```typescript
const FIRST_SUBMISSION_STATUSES: CheckInStatus[] = ['submitted', 'ai_reviewing'];
const MODIFICATION_STATUSES: CheckInStatus[] = ['pending_manual_review', 'requires_modification'];

export async function submitReflection(
  userId: string,
  checkInId: string,
  input: SubmitReflectionInput
): Promise<CheckInResponse> {
  // ... UUID、所有权、截止日校验 ...

  const isFirstSubmission = FIRST_SUBMISSION_STATUSES.includes(checkIn.status);
  const isModification = MODIFICATION_STATUSES.includes(checkIn.status);

  if (!isFirstSubmission && !isModification) {
    throw new AppError('CHECKIN_CANNOT_MODIFY_REFLECTION', '当前状态不允许修改心得', 409);
  }

  if (isModification && checkIn.status === 'pending_manual_review' && checkIn.reflection_modified) {
    throw new AppError('CHECKIN_REFLECTION_ALREADY_MODIFIED', '心得已修改过一次，无法再次修改', 409);
  }

  return withTransaction(async (client) => {
    if (isModification) {
      // 修改：先置为 ai_reviewing 并打标记
      const modifyResult = await client.query<CheckIn>(
        `UPDATE check_ins
         SET reflection_content = $1,
             status = 'ai_reviewing',
             reflection_modified = true,
             updated_at = NOW()
         WHERE id = $2 AND status = ANY($3)
         RETURNING *`,
        [input.reflection_content, checkInId, MODIFICATION_STATUSES]
      );
      if (modifyResult.rows.length === 0) {
        throw new AppError('CHECKIN_CANNOT_MODIFY_REFLECTION', '当前状态不允许修改心得', 409);
      }
    } else {
      // 首次提交：保持 Story 4.2 行为
      const reviewResult = await aiReviewReflection(input.reflection_content);
      const updateResult = await client.query<CheckIn>(
        `UPDATE check_ins
         SET reflection_content = $1,
             status = $2,
             updated_at = NOW()
         WHERE id = $3 AND status = ANY($4)
         RETURNING *`,
        [input.reflection_content, reviewResult.status, checkInId, FIRST_SUBMISSION_STATUSES]
      );
      if (updateResult.rows.length === 0) {
        throw new AppError('CHECKIN_CANNOT_MODIFY_REFLECTION', '当前状态不允许修改心得', 409);
      }
      return toCheckInResponse(updateResult.rows[0]);
    }

    // 修改后重新 AI 初审
    const reviewResult = await aiReviewReflection(input.reflection_content);
    const finalResult = await client.query<CheckIn>(
      `UPDATE check_ins
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2 AND status = 'ai_reviewing'
       RETURNING *`,
      [reviewResult.status, checkInId]
    );
    if (finalResult.rows.length === 0) {
      throw new AppError('CHECKIN_SERVICE_ERROR', '修改心得后更新状态失败', 500);
    }
    return toCheckInResponse(finalResult.rows[0]);
  });
}
```

注意：
- 所有 SELECT + UPDATE 必须位于同一事务内，并继续持有 `FOR UPDATE` 锁，避免并发竞态。
- deadline 检查应在状态判断之前（沿用 Story 4.2 Review 修复项）。

### 并发与竞态防护

- 读取 `check_ins` 时使用 `SELECT ... FOR UPDATE`。
- UPDATE 的 `WHERE` 子句必须包含 `status = ANY($editableStatuses)`，确保并发提交时只有一条成功。
- 若返回行数为 0，抛出 `CHECKIN_CANNOT_MODIFY_REFLECTION`（状态已被其他请求改变）。

## Project Structure Notes

根据 Architecture Spine 的 Structural Seed，学生页面理想上位于 `miniprogram/pages/student/...`，但当前工程实际结构为扁平 `miniprogram/pages/...`。本 Story 延续 Story 4.2 / 4.3 的扁平结构，不引入新的页面目录。

```
miniprogram/pages/
├── checkin/
│   ├── index/          # 定位签到（已有）
│   └── result/         # 打卡结果反馈（本 Story 增加修改入口）
├── reflection/
│   └── index/          # 心得提交/修改（本 Story 增加修改模式）
├── task/
│   └── detail/         # 任务详情（本 Story 增加修改入口）
```

## UX Requirements

- 修改入口按钮样式遵循 DESIGN.md：
  - 主按钮：CTA 绿色渐变，高度 96rpx，圆角 48rpx
  - 次要按钮：surface 背景，primary 边框/文字
- 修改提示条：
  - 背景：`warning`（`#F59E0B`）15% 透明度
  - 文字：`#164E63` 或 `#92400E`
  - 圆角 `16rpx`，内边距 `24rpx`
- 心得输入框：
  - 修改模式下回显已有内容
  - 字数统计展示 `trim` 后长度
  - 字数不足 10 或超过 500 时边框变红并提示
- 提交按钮：
  - 修改模式文案「保存修改」
  - 加载中文案「保存中...」
  - 按下 `scale(0.98)` 100ms
- 错误提示：
  - `CHECKIN_REFLECTION_ALREADY_MODIFIED`：「你已经修改过一次，无法再次修改」
  - `CHECKIN_CANNOT_MODIFY_REFLECTION`：「当前状态不允许修改心得」
  - `CHECKIN_DEADLINE_PASSED`：「任务已截止，无法修改心得」
- 入口展示规则：
  - 任务详情页：`check_in_status === 'pending_manual_review' && !reflection_modified` 或 `check_in_status === 'requires_modification'`
  - 结果页：`status === 'pending_manual_review' && !reflection_modified`

## Testing Requirements

### 后端测试

- [ ] **单元测试**：`checkins.service.submitReflection`
  - 从 `pending_manual_review` 修改 → `reflection_modified = true`，AI 通过后为 `ai_approved`
  - 从 `pending_manual_review` 修改 → AI 未通过后为 `pending_manual_review`
  - 从 `pending_manual_review` 第二次修改 → `CHECKIN_REFLECTION_ALREADY_MODIFIED`
  - 从 `requires_modification` 修改 → 状态经 `ai_reviewing` 回到 `ai_approved` / `pending_manual_review`
  - 从 `requires_modification` 修改不校验 `reflection_modified`
  - 非本人打卡 → `TASK_NOT_FOUND`（404）
  - 已逾期任务 → `CHECKIN_DEADLINE_PASSED`
  - 状态为 `approved` / `rejected` / `ai_approved` → `CHECKIN_CANNOT_MODIFY_REFLECTION`

- [ ] **集成测试**：`POST /api/checkins/:id/reflection`
  - 首次提交有效心得 → 200，status 为 `ai_approved` / `pending_manual_review`，`reflection_modified = false`
  - 从 `pending_manual_review` 修改 → 200，`reflection_modified = true`
  - 从 `pending_manual_review` 重复修改 → 409
  - 从 `requires_modification` 修改 → 200
  - 非学生角色调用 → 403
  - 未认证调用 → 401

- [ ] **回归测试**：
  - 首次提交逻辑（`submitted/ai_reviewing`）保持 Story 4.2 行为不变
  - `GET /api/tasks/my/:id` 返回 `reflection_modified`

### 小程序测试

- [ ] **手动测试**：修改模式页面渲染、回显、字数统计、提示条
- [ ] **手动测试**：任务详情页修改入口展示/隐藏条件
- [ ] **手动测试**：结果页待复核状态修改入口展示/隐藏条件
- [ ] **手动测试**：修改成功跳转结果页并展示新状态
- [ ] **手动测试**：二次修改报错提示
- [ ] **集成测试**：调用后端 API 修改心得并更新状态

## Review Findings

### decision-resolved

- [x] [Decision→Override] Epic 4.4 原文允许在 `submitted/ai_reviewing` 修改；因 AI 初审同步，实际可修改窗口为 `pending_manual_review` 和 `requires_modification`。本 Story 按此实现，产品文档需在后续 sprint 中同步修订。

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- 后端 `submitReflection` 在事务内使用 `SELECT ... FOR UPDATE`，并将首次提交与修改分支的 UPDATE 都带上 `status = ANY($editableStatuses)`，避免并发竞态。
- 为支持任务详情页跳转到心得修改页，在 `TaskDetail` 与小程序 `Task` 类型中补充了 `check_in_id`（后端 `fetchUserCheckIns` 已返回）。
- 修改按钮位于任务详情页底部按钮区，与「立即打卡」互斥显示。
- `requires_modification` 状态下辅导员反馈文案由后续 Story 5.3 实现，本 Story 仅展示通用修改提示。
- `reflection_modified` 采用单标志位；学生主动修改（`pending_manual_review`）限一次，辅导员要求修改（`requires_modification`）不受该标志位限制。
- 验证结果：
  - `api/` `npm run build` 通过
  - `api/` `npx vitest run` 108/108 通过
  - `miniprogram/` `npx tsc --noEmit` 通过

## Change Log

- 2026-06-23: Story 4.4 创建，定义心得提交后一次修改的后端状态机、数据库字段与小程序修改入口规格。
- 2026-06-23: Story 4.4 实现完成：数据库新增 `reflection_modified`、后端 `submitReflection` 支持修改流程、小程序新增修改入口与修改模式、测试全部通过。

## References

- [Source: `_bmad-output/planning-artifacts/epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 4 / Story 4.4]
- [Source: `_bmad-output/planning-artifacts/prds/prd-IdeoTrack-2026-06-22/prd.md` §4.4 FR-10]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-1, AD-6, AD-11, AD-12, AD-17, Consistency Conventions]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md` 颜色、字体、组件规范]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md` 心得输入框、打卡流程、文案禁忌]
- [Source: `_bmad-output/implementation-artifacts/4-2-xin-de-ti-jiao.md` Story 4.2 实现规格]
- [Source: `_bmad-output/implementation-artifacts/4-3-da-ka-jie-guo-fan-kui.md` Story 4.3 实现规格]
- [Source: `api/src/domains/checkins/checkins.service.ts` 当前 `submitReflection` 实现]
- [Source: `api/src/domains/tasks/task.service.ts` 当前 `getMyTaskDetail` 实现]
- [Source: `miniprogram/pages/reflection/index.ts` 当前提交实现]
- [Source: `miniprogram/pages/task/detail/index.ts` 当前任务详情实现]
- [Source: `miniprogram/pages/checkin/result/index.ts` 当前结果页实现]
