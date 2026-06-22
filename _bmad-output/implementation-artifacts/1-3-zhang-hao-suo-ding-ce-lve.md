---
story_id: 1.3
story_key: 1-3-zhang-hao-suo-ding-ce-lve
epic: 1
epic_title: 账号认证与权限体系
status: done
priority: high
points: 2
baseline_commit: 86c45f7
---

# Story 1.3: 账号锁定策略

Status: done

> 来源：Epic 1 Story 1.3 / PRD §4.1 FR-1 / Architecture AD-4, AD-5

## Story

作为一名系统用户，
我想要在连续输入错误密码后账号被临时锁定，
以便防止暴力破解。

## Acceptance Criteria

### AC-1: 连续 5 次错误密码后锁定 15 分钟

- **Given** 用户在登录页连续 5 次输入错误密码
- **When** 第 5 次登录失败
- **Then** 系统锁定该账号 15 分钟
- **And** 锁定期间任何登录尝试均返回「账号已锁定，请 15 分钟后重试」

### AC-2: 锁定计时从最后一次失败尝试开始计算

- **Given** 账号已被锁定
- **When** 锁定计时期间
- **Then** 锁定起算点为第 5 次失败尝试的时间

### AC-3: 锁定状态由服务端维护

- **Given** 用户尝试绕过客户端锁定
- **When** 直接向登录 API 发送请求
- **Then** 服务端根据 `users.locked_until` 字段判定并拒绝请求

## Tasks / Subtasks

> **注意**：账号锁定核心逻辑已在 Story 1.1 中实现。本 Story 主要进行验收验证、补充测试与文档化。

- [x] **Task 1: 验证后端锁定逻辑** (AC: #1, #2, #3)
  - [x] 1.1 检查 `api/src/domains/auth/auth.service.ts` 中 `MAX_FAILED_ATTEMPTS = 5`、`LOCK_DURATION_MINUTES = 15`
  - [x] 1.2 确认失败次数递增、达到阈值时设置 `locked_until = now + 15 分钟`
  - [x] 1.3 确认锁定期间请求直接返回 `AUTH_ACCOUNT_LOCKED`，不重置或递增计数
  - [x] 1.4 确认登录成功后重置 `failed_login_attempts = 0` 和 `locked_until = null`

- [x] **Task 2: 验证移动端错误展示** (AC: #1)
  - [x] 2.1 检查 `mobile/app/(auth)/login.tsx` 是否正确显示服务端返回的锁定提示
  - [x] 2.2 确保错误提示包含文字 + 图标

- [x] **Task 3: 补充/确认集成测试** (AC: #1, #2, #3)
  - [x] 3.1 确认 `api/tests/auth.test.ts` 已包含：连续 5 次失败触发锁定、锁定期间请求被拒绝、锁定过期后可登录
  - [x] 3.2 若缺少针对锁定策略的独立测试描述，补充测试用例或注释

## Dev Notes

### 当前实现状态

- Story 1.1 已实现登录失败计数、账号锁定与解锁逻辑。
- 关键代码位于 `api/src/domains/auth/auth.service.ts`。
- `users` 表字段：`failed_login_attempts`、`locked_until`。
- 移动端仅展示服务端返回的错误信息，不维护锁定状态。

### 验证入口

- 后端构建：`npm run build`
- 后端测试：`npm test`（需要配置 `DATABASE_URL`）
- 移动端类型检查：`npm run typecheck`

## UX Requirements

- 锁定提示直接使用服务端返回文案，保持与其他错误提示一致。
- 错误提示同时显示文字和图标。

## Testing Requirements

### 后端测试

- [x] 连续 5 次错误密码 → 第 5 次返回 403 `AUTH_ACCOUNT_LOCKED`
- [x] 锁定期间使用正确密码登录 → 仍然返回 403 `AUTH_ACCOUNT_LOCKED`
- [x] 锁定 15 分钟后使用正确密码登录 → 返回 200
- [x] 登录成功后 `failed_login_attempts` 重置为 0、`locked_until` 清空

### 移动端测试

- [x] 手动测试：触发锁定后，登录页显示锁定提示

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- 核心实现来自 Story 1.1；本 Story 以验证和补齐测试为主。

## Change Log

- 2026-06-22: Story 1.3 验证完成。核心锁定逻辑已在 Story 1.1 实现，补充了「登录成功后重置失败次数/锁定状态」集成测试。

## File List

### 后端
- `api/src/domains/auth/auth.service.ts`
- `api/tests/auth.test.ts`

### 移动端
- `mobile/app/(auth)/login.tsx`

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 1 / Story 1.3]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.1 FR-1]
- [Source: `architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-4, AD-5]
