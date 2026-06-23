---
story_id: 4.3
story_key: 4-3-da-ka-jie-guo-fan-kui
epic: 4
epic_title: 学生打卡流程
status: in-progress
priority: high
points: 2
baseline_commit: 80b260615d1ee282488d44d3030b53895ee8cf34
---

# Story 4.3：打卡结果反馈

Status: in-progress

> 来源：Epic 4 Story 4.3 / PRD §4.4 FR-11 / Architecture AD-1, AD-6, AD-10, AD-11, AD-12, AD-17 / NFR-2, NFR-5 / UX-10, UX-13, UX-15, UX-16

## Story

作为一名学生，
我想要在提交心得后立即看到打卡结果，
以便知道是否打卡成功或需要复核。

## Acceptance Criteria

### AC-1: AI 初审通过后的成功反馈

- **Given** 学生已成功提交心得
- **When** AI 初审返回 `ai_approved`
- **Then** 小程序跳转到 `miniprogram/pages/checkin/result/index?checkInId=<id>&taskId=<id>&status=ai_approved`
- **And** 页面显示「今日打卡完成！」绿色对勾动画 + 轻微震动（UX-10）
- **And** 页面展示本次获得积分 +10、当前连续打卡天数、等级进度
- **And** 若本次打卡触发了勋章条件（连续 7 天/30 天），展示勋章获得动画
- **And** 底部提供「返回首页」和「查看日历」按钮

### AC-2: AI 初审未通过的复核反馈

- **Given** 学生已成功提交心得
- **When** AI 初审返回 `pending_manual_review`
- **Then** 小程序跳转到结果页 `status=pending_manual_review`
- **And** 页面显示「需要复核」状态与文案「心得可以再具体一点，说说你的真实感受吧」或对应复核原因
- **And** 提示学生可补充内容（若仍可修改）或等待辅导员复核
- **And** 若状态仍处于 `submitted`/`ai_reviewing` 且未使用修改机会，显示「修改心得」按钮
- **And** 提供「返回首页」和「查看任务详情」按钮

### AC-3: 结果页数据不依赖伪造占位

- **Given** 学生进入打卡结果页
- **When** 页面加载
- **Then** 结果页从后端获取真实的连续打卡天数、本次积分、等级进度、勋章信息
- **And** 不再显示 Story 4.2 中硬编码的固定数据
- **And** 加载失败时回退到任务详情并给出友好错误提示（UX-16）

### AC-4: 仅学生可查看自己的打卡结果

- **Given** 非学生角色或访问非本人的 `check_in`
- **When** 调用结果查询接口
- **Then** 返回 `ACCESS_DENIED` 或 `CHECKIN_NOT_FOUND`

## Tasks / Subtasks

### 后端任务

- [ ] **Task 1: 新增打卡结果汇总接口** (AC: #3, #4)
  - [ ] 1.1 在 `api/src/domains/checkins/checkins.types.ts` 新增 `CheckInResultSummary` 类型：
    - `check_in_id`, `task_id`, `task_title`, `reflection_content`, `status`
    - `base_points: number`（固定 10）
    - `streak_days: number`（用户连续打卡天数）
    - `next_level_progress: number`（0–100，按连续天数计算）
    - `earned_badge: '坚持一周' | '坚持一月' | null`
  - [ ] 1.2 在 `api/src/domains/checkins/checkins.service.ts` 实现 `getCheckInResult(userId, checkInId)`：
    - 校验 `checkInId` 为 UUID 且属于当前学生，否则抛 `CHECKIN_NOT_FOUND`
    - 查询对应任务标题与心得内容
    - 计算 `streak_days`：统计该用户状态为 `approved` 或 `ai_approved` 的打卡记录，按自然日去重，从今日往前连续的天数
    - `next_level_progress`：若 `streak_days < 7` 则为 `streak_days / 7 * 100`；若 `< 30` 则为 `streak_days / 30 * 100`；否则为 100
    - `earned_badge`：`streak_days >= 30` 为「坚持一月」；`>= 7` 为「坚持一周」；否则 null
  - [ ] 1.3 在 `api/src/domains/checkins/checkins.controller.ts` 新增 `getCheckInResultController` 处理 `GET /api/checkins/:id/result`
  - [ ] 1.4 在 `api/src/domains/checkins/checkins.routes.ts` 注册路由，限制 `student` 角色

- [ ] **Task 2: 后端测试** (AC: #3, #4)
  - [ ] 2.1 在 `api/tests/checkins.test.ts` 新增 `GET /api/checkins/:id/result` 测试：
    - 正常查询返回 200，字段完整，streak_days >= 1
    - 非本人 check_in 返回 404 `CHECKIN_NOT_FOUND`
    - 非学生角色返回 403 `ACCESS_DENIED`
    - 无效 UUID 返回 400 `VALIDATION_ERROR`

- [ ] **Task 3: 构建与回归测试** (AC: #3)
  - [ ] 3.1 运行 `npm run build` 于 `api/`
  - [ ] 3.2 运行 `npm test` 于 `api/`，确保全部通过

### 小程序端任务

- [ ] **Task 4: 封装结果查询 API** (AC: #3)
  - [ ] 4.1 在 `miniprogram/services/checkinApi.ts` 新增：
    - 接口 `CheckInResultSummary`
    - 函数 `getCheckInResult(checkInId: string)` 调用 `GET /api/checkins/${checkInId}/result`

- [ ] **Task 5: 结果页接入真实数据** (AC: #1, #2, #3)
  - [ ] 5.1 修改 `miniprogram/pages/checkin/result/index.ts`：
    - `onLoad` 中保留参数校验，同时调用 `loadCheckInResult(checkInId)`
    - 成功后设置 `result` 数据；失败时回退到 `loadTaskDetail` 并提示「数据加载失败，已显示任务信息」
    - 成功状态触发震动 `wx.vibrateShort`
  - [ ] 5.2 修改 `miniprogram/pages/checkin/result/index.wxml`：
    - 成功页使用 `result.base_points`、`result.streak_days`、`result.next_level_progress` 替换硬编码数值
    - 若 `result.earned_badge` 非空，展示勋章动画区域
    - 待复核页标题改为「需要复核」，副文案使用复核原因或默认提示

- [ ] **Task 6: 勋章动画与交互细节** (AC: #1)
  - [ ] 6.1 在 `miniprogram/pages/checkin/result/index.wxss` 添加勋章弹出动画（scale + opacity）
  - [ ] 6.2 按钮按下保持 `scale(0.98) 100ms`（UX-10）

- [ ] **Task 7: 类型检查与回归** (AC: #3)
  - [ ] 7.1 运行 `npm run tsc` 于 `miniprogram/`，确保无类型错误

## Dev Notes

### 关键架构约束

- **AD-1 Thin Client**：结果页只做展示，积分/连续天数/勋章计算由后端接口返回。
- **AD-10 Domain Boundaries**：本 Story 所有后端逻辑放在 `checkins` 域，不侵入 `reviews` 或未来 `points` 域。
- **AD-11 Check-in 状态机**：本 Story 不修改状态机；`ai_approved` 视为打卡成功反馈，最终 `approved` 状态与积分发放由后续 Epic 6 处理。
- **AD-12 Reflection 子实体**：结果接口复用 `check_ins` 表中已存储的 `reflection_content`。
- **AD-17 分端策略**：仅实现学生小程序端。
- **NFR-2**：AI 初审已在 `submitReflection` 中保证 3 秒超时降级；结果页仅展示已有结果。
- **NFR-5**：接口通过 HTTPS 传输。

### 现有代码清单（不要重复实现）

- ✅ `api/src/domains/checkins/checkins.service.ts` — 已有 `submitReflection`、状态机、事务锁
- ✅ `api/src/domains/checkins/checkins.controller.ts` / `routes.ts` — 已有路由注册模式
- ✅ `miniprogram/pages/checkin/result/index.*` — 页面结构已预实现，需替换硬编码数据并补动画
- ✅ `miniprogram/services/checkinApi.ts` — 已有 `submitReflection`，补充 `getCheckInResult`
- ✅ `miniprogram/services/taskApi.ts` — 已有 `getMyTaskDetail` 作为降级回显

### 连续天数计算逻辑

```sql
-- 伪代码：查询用户所有有效打卡日期（ai_approved 视为 V1 成功）
SELECT DISTINCT DATE(checked_in_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai') AS day
FROM check_ins
WHERE user_id = $1 AND status IN ('approved', 'ai_approved')
ORDER BY day DESC;
```

从最大日期向前遍历，直到出现断档即为连续天数。当前打卡记录（若状态为 `ai_approved`）会被包含。

### 结果页跳转流程

```
/pages/reflection/index 提交心得
  ↓ 调用 POST /api/checkins/:id/reflection
  ↓ 返回 status
/pages/checkin/result/index?checkInId=...&taskId=...&status=ai_approved|pending_manual_review
  ↓ 调用 GET /api/checkins/:id/result 获取真实反馈数据
  ↓ 展示成功/待复核 UI
```

### 需要修正的现有问题

1. `miniprogram/pages/checkin/result/index.wxml:35-51` 硬编码 `+10` 积分、`1` 连续天数、`10%` 等级进度，需替换为接口数据。
2. 待复核状态标题文案与 UX 规范不完全一致，需调整为「需要复核」并补充补充内容提示。
3. 成功页缺少勋章获得动画；本 Story 按连续天数简单判定勋章条件（与 Epic 6 最终规则可能不同，后续可替换）。

## UX Requirements

- 成功页：绿色对勾动画 + 轻微震动（`wx.vibrateShort({ type: 'light' })`）
- 成功文案：「今日打卡完成！」副标题「你的心得已通过 AI 初审」
- 待复核文案：标题「需要复核」；副标题根据复核原因显示，如「心得可以再具体一点，说说你的真实感受吧」
- 积分/连续天数/等级进度使用真实数据，避免伪造固定值
- 勋章获得时展示弹窗或卡片动画，文案「获得勋章：坚持一周/坚持一月」
- 按钮按下 `scale(0.98) 100ms`
- 页面背景 `#ECFEFF`，卡片背景 `#FFFFFF`，圆角 32rpx
- 错误状态使用文字 + 图标，不依赖颜色作为唯一状态标识（UX-13）

## Testing Requirements

### 后端测试

- [ ] **集成测试**：`GET /api/checkins/:id/result`
  - 正常查询 → 200，返回 `base_points=10`、`streak_days` 正确、`next_level_progress` 在 0–100 之间
  - 非本人 check_in → 404 `CHECKIN_NOT_FOUND`
  - 辅导员/管理员调用 → 403 `ACCESS_DENIED`
  - 无效 UUID → 400 `VALIDATION_ERROR`
  - 多次连续打卡 → `streak_days` 按自然日去重计算

### 小程序测试

- [ ] **手动测试**：AI 初审通过后进入成功页，显示真实连续天数与积分
- [ ] **手动测试**：待复核页显示「需要复核」与修改按钮
- [ ] **手动测试**：连续 7 天打卡成功时展示「坚持一周」勋章动画
- [ ] **类型检查**：`npm run tsc` 通过

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- 待实现后填写

## Change Log

- 2026-06-24: Story 4.3 创建，定义打卡结果反馈的后端汇总接口与小程序结果页数据接入。

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 4 / Story 4.3]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.4 FR-11]
- [Source: `architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-1, AD-6, AD-10, AD-11, AD-12, AD-17]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md` 打卡成功反馈、文案禁忌]
- [Source: `implementation-artifacts/4-2-xin-de-ti-jiao.md` 前置 Story 实现与代码评审结论]
