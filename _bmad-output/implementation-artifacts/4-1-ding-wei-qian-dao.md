---
story_id: 4.1
story_key: 4-1-ding-wei-qian-dao
epic: 4
epic_title: 学生打卡流程
status: ready-for-dev
priority: high
points: 3
baseline_commit: NO_VCS
---

# Story 4.1: 定位签到

Status: ready-for-dev

> 来源：Epic 4 Story 4.1 / PRD FR-9 / Architecture AD-1, AD-4, AD-5, AD-11, AD-12, AD-17, NFR-5 / UX-10, UX-11, UX-13, UX-15, UX-16

## Story

作为一名学生，
我想要在任务详情页点击签到并记录当前位置，
以便完成打卡的位置凭证步骤。

## Acceptance Criteria

### AC-1: 正常定位签到成功

- **Given** 学生在任务详情页点击「立即打卡」
- **When** 小程序请求定位权限并获取当前位置
- **Then** 后端创建或更新该学生对该任务的打卡记录
- **And** 记录包含当前经纬度、地址描述和签到时间（FR-9）
- **And** 打卡状态为 `submitted`，等待后续心得提交（AD-11）
- **And** 位置信息通过 HTTPS 传输（NFR-5）
- **And** 签到成功后跳转到心得提交页（Story 4.2）

### AC-2: 定位权限被拒绝

- **Given** 学生点击「立即打卡」
- **When** 用户拒绝定位权限
- **Then** 显示提示「请开启定位权限以完成签到」
- **And** 提供「去设置」入口，跳转到小程序设置页
- **And** 不允许在未获取位置的情况下调用签到 API

### AC-3: 同一任务允许重新签到

- **Given** 学生已对该任务签到过
- **When** 学生再次点击「立即打卡」
- **Then** 系统更新原有打卡记录的位置和时间，以最后一次为准
- **And** 状态重置为 `submitted`（如果已进入后续流程，按 AD-11 状态机处理，V1 简单覆盖）

### AC-4: 仅学生可签到且只能签可见任务

- **Given** 非学生角色或任务对学生不可见
- **When** 调用签到 API
- **Then** 返回 `ACCESS_DENIED` 或 `TASK_NOT_FOUND`
- **And** 不创建打卡记录

### AC-5: 已逾期任务不可签到

- **Given** 任务截止时间已过
- **When** 学生点击「立即打卡」
- **Then** 按钮为禁用态或点击后提示「任务已截止，无法打卡」
- **And** 不创建或更新打卡记录

## Tasks / Subtasks

### 后端任务

- [ ] **Task 1: 数据库表扩展** (AC: #1, #3)
  - [ ] 1.1 在 `check_ins` 表新增定位字段：
    - `latitude` DECIMAL(10, 8) NOT NULL
    - `longitude` DECIMAL(11, 8) NOT NULL
    - `address` TEXT（可选，地址描述）
    - `checked_in_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - [ ] 1.2 更新 `api/src/scripts/migrate.ts` 中的 `MIGRATION_SQL`
  - [ ] 1.3 添加索引 `idx_check_ins_user_task`（已有 `idx_check_ins_task_user`，按需确认）

- [ ] **Task 2: checkins 领域骨架** (AC: #1, #4)
  - [ ] 2.1 创建 `api/src/domains/checkins/checkins.types.ts`
    - 定义 `CheckInStatus`（复用 task.types 中的值或独立维护，推荐独立）
    - 定义 `CreateCheckInInput`、`CheckInResponse`
  - [ ] 2.2 创建 `api/src/domains/checkins/checkins.service.ts`
    - 实现 `createOrUpdateCheckIn({ userId, taskId, latitude, longitude, address })`
    - 校验任务可见性（调用 task 领域公共方法或重复 visibility 逻辑）
    - 校验任务未截止
    - 使用 `INSERT ... ON CONFLICT (task_id, user_id) DO UPDATE` 实现重新签到覆盖
    - 返回标准响应包 `{ success, data }`
  - [ ] 2.3 创建 `api/src/domains/checkins/checkins.controller.ts`
    - 实现 `POST /api/checkins`
  - [ ] 2.4 创建 `api/src/domains/checkins/checkins.routes.ts`
    - 注册路由，使用 `authMiddleware` + `requireRole(['student'])`
  - [ ] 2.5 在 `api/src/index.ts` 注册 `/api/checkins` 路由

- [ ] **Task 3: 统一错误处理** (AC: #2, #4, #5)
  - [ ] 3.1 定义错误码：`CHECKIN_TASK_NOT_FOUND`、`CHECKIN_DEADLINE_PASSED`、`CHECKIN_LOCATION_REQUIRED`、`CHECKIN_ACCESS_DENIED`
  - [ ] 3.2 服务层所有错误通过 `AppError` 抛出，保持统一响应格式

### 小程序端任务

- [ ] **Task 4: 任务详情页入口** (AC: #1, #5)
  - [ ] 4.1 实现 `miniprogram/pages/task/detail/index.ts` / `.wxml` / `.wxss`
  - [ ] 4.2 展示任务标题、内容、截止时间
  - [ ] 4.3 根据任务状态渲染「立即打卡」按钮：
    - 未开始：绿色 CTA 按钮「立即打卡 +10 积分」
    - 已完成/复核中：禁用态「今日已打卡」
    - 已逾期：禁用态「已逾期」
  - [ ] 4.4 点击按钮跳转 `miniprogram/pages/checkin/index?taskId=xxx`

- [ ] **Task 5: 定位签到页** (AC: #1, #2)
  - [ ] 5.1 实现 `miniprogram/pages/checkin/index.ts` / `.wxml` / `.wxss`
  - [ ] 5.2 页面加载时调用 `wx.getLocation`（type: `gcj02`）
  - [ ] 5.3 获取成功后展示位置信息（地址/经纬度）和「确认签到」按钮
  - [ ] 5.4 点击「确认签到」调用 `POST /api/checkins`
  - [ ] 5.5 签到成功后跳转到心得提交页（Story 4.2 占位页或 TODO 跳转）
  - [ ] 5.6 用户拒绝权限时展示引导：提示文案 + 「去设置」按钮调用 `wx.openSetting`
  - [ ] 5.7 加载和提交过程中显示 loading 并禁用重复点击

- [ ] **Task 6: API 客户端与存储** (AC: #1)
  - [ ] 6.1 在 `miniprogram/services/api.ts` 或新建 `miniprogram/services/checkinApi.ts` 封装 `createCheckIn`
  - [ ] 6.2 自动从 `wx.getStorageSync('token')` 读取 JWT 并注入 `Authorization: Bearer <token>`
  - [ ] 6.3 统一处理 401：清除 token 并跳转到登录页

## Dev Notes

### 关键架构约束

- **AD-1 Thin Client**：小程序只做 UX 验证和定位获取，所有业务判断（任务可见性、截止判断、重复签到覆盖）在后端完成。
- **AD-4 JWT 认证**：小程序请求头携带 `Authorization: Bearer <token>`，token 存储在 `wx.setStorageSync('token')`。
- **AD-5 API RBAC**：`POST /api/checkins` 必须限制 `student` 角色。
- **AD-11 Check-in 状态机**：本 Story 只创建 `submitted` 状态的打卡记录，不触发 AI 审核。AI 审核由 Story 4.2 在提交心得后触发。
- **AD-12 Reflection 为子实体**：本 Story 只创建父 `check_ins` 记录，不写入 reflection。`reflection_content` 字段在 Story 4.2 加入。
- **AD-17 分端策略**：本 Story 仅实现学生小程序端。辅导员/管理员端无需此功能。
- **NFR-5 传输安全**：所有 API 调用使用 HTTPS，位置坐标不本地持久化。

### 数据库变更

```sql
-- 在现有 check_ins 表基础上扩展（已通过 Epic 3 迁移创建）
ALTER TABLE check_ins
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 注意：DEFAULT 0 仅用于历史数据兼容；新插入必须由 API 提供真实坐标。
-- 后续可删除默认值：
-- ALTER TABLE check_ins ALTER COLUMN latitude DROP DEFAULT;
-- ALTER TABLE check_ins ALTER COLUMN longitude DROP DEFAULT;
```

### 重新签到逻辑

```sql
INSERT INTO check_ins (task_id, user_id, status, latitude, longitude, address, checked_in_at)
VALUES ($1, $2, 'submitted', $3, $4, $5, NOW())
ON CONFLICT (task_id, user_id)
DO UPDATE SET
  status = EXCLUDED.status,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  address = EXCLUDED.address,
  checked_in_at = EXCLUDED.checked_in_at,
  updated_at = NOW()
RETURNING *;
```

### 任务可见性校验

复用 `tasks.service.ts` 中的 `getMyTaskDetail` 逻辑或抽取为 `assertTaskVisibleToStudent(userId, taskId)`：

- 任务状态为 `published`
- 当前时间 >= `published_at`
- 当前时间 < `deadline_at`（AC-5）
- 任务作用域匹配学生的 `class_id` / `college_id`

### 小程序定位说明

- 使用 `wx.getLocation({ type: 'gcj02' })`，返回国测局坐标。
- 需要在 `miniprogram/app.json` 中声明 `permission` 和 `requiredPrivateInfos`：

```json
{
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于签到打卡"
    }
  },
  "requiredPrivateInfos": ["getLocation"]
}
```

## UX Requirements

- 任务详情页风格遵循 DESIGN.md：背景 `#ECFEFF`、主色 `#0891B2`、CTA `#22C55E`。
- 「立即打卡」按钮位于屏幕下半部拇指易触区域，使用 `cta` 绿色。
- 按钮按下时 scale(0.98) 100ms。
- 定位页展示当前位置时，地址描述优先显示，经纬度可折叠/小字展示。
- 错误提示文案遵循 EXPERIENCE.md：
  - 定位失败：「请开启定位权限以完成签到」
  - 任务已截止：「任务已截止，无法打卡」
- 加载状态使用 DESIGN.md 中定义的加载指示器。

## Testing Requirements

### 后端测试

- [ ] **单元测试**：`checkins.service.ts` 中的任务可见性校验、重新签到覆盖逻辑。
- [ ] **集成测试**：`POST /api/checkins` 各种场景：
  - 学生签正常任务 → 201，返回 check_in id 和 `submitted` 状态
  - 重复签同一任务 → 200，记录被覆盖，checked_in_at 更新
  - 签不存在的任务 → 404 `TASK_NOT_FOUND`
  - 签已截止任务 → 409 `CHECKIN_DEADLINE_PASSED`
  - 非学生角色调用 → 403 `ACCESS_DENIED`
  - 缺少经纬度 → 400 `CHECKIN_LOCATION_REQUIRED`

### 小程序测试

- [ ] **手动测试**：任务详情页渲染、按钮状态、跳转流程。
- [ ] **手动测试**：定位成功/失败路径、权限拒绝引导。
- [ ] **集成测试**：调用后端 API 创建 check_in 记录。

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- 待 Dev 阶段确认：是否将 `CheckInStatus` 从 `task.types.ts` 迁移到 `checkins.types.ts` 独立维护。
- 待 Dev 阶段确认：任务详情页是否由 Story 3.4 完整实现，本 Story 仅补充打卡入口。
- 小程序定位需要在微信开发者工具中配置合法域名和权限声明。

## Change Log

- 2026-06-23: Story 4.1 创建，定义定位签到后端 API 与小程序页面开发规格。

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 4 / Story 4.1]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.4 FR-9]
- [Source: `architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-1, AD-4, AD-5, AD-11, AD-12, AD-17, Consistency Conventions]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md` 颜色、字体、组件规范]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md` 任务详情、打卡流程、文案禁忌]
