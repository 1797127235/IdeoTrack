---
story_id: 1.2
story_key: 1-2-shou-ci-deng-lu-qiang-zhi-xiu-gai-chu-shi-mi-ma
epic: 1
epic_title: 账号认证与权限体系
status: done
priority: high
points: 3
baseline_commit: 48cc663
---

# Story 1.2: 首次登录强制修改初始密码

Status: done

> 来源：Epic 1 Story 1.2 / PRD §4.1 FR-1 / Architecture AD-4, AD-5, AD-14, AD-15

## Story

作为一名新用户，
我想要在首次登录后修改初始密码，
以便保障账号安全。

## Acceptance Criteria

### AC-1: 首次登录后强制跳转修改密码页

- **Given** 用户使用初始密码登录成功
- **When** 系统返回的 `isInitialPassword` 为 true
- **Then** 移动端强制跳转到修改密码页，而不是直接进入角色首页
- **And** 用户在完成修改前不能进入角色首页

### AC-2: 新密码校验规则

- **Given** 用户在修改密码页输入新密码
- **When** 新密码长度少于 6 位，或新密码与当前（初始）密码相同，或两次输入不一致
- **Then** 系统返回清晰的中文错误提示
- **And** 不提交请求到后端

### AC-3: 修改成功后更新密码哈希并清除首次登录标志

- **Given** 用户输入符合规则的新密码并提交
- **When** 后端校验当前密码正确
- **Then** 使用 bcrypt 重新哈希新密码
- **And** 更新 `users.password_hash` 并将 `is_initial_password` 设为 false
- **And** 返回修改成功，移动端跳转对应角色首页

### AC-4: 密码加密存储

- **Given** 用户提交新密码
- **When** 后端保存新密码
- **Then** 数据库中只存储 bcrypt 哈希值，不存储明文（NFR-4）

## Tasks / Subtasks

### 后端任务

- [x] **Task 1: 修改密码 API 端点** (AC: #3, #4)
  - [x] 1.1 新增 `POST /api/auth/change-password`
  - [x] 1.2 新增 JWT 认证中间件，从 `Authorization: Bearer <token>` 中解析 `userId`，挂载到 `req.user`
  - [x] 1.3 校验请求体：`currentPassword`、`newPassword`（长度 ≥ 6，且不能与 `currentPassword` 相同）
  - [x] 1.4 根据 `req.user.userId` 查询用户，使用 bcrypt 校验 `currentPassword`
  - [x] 1.5 使用 bcrypt（salt rounds 10）生成新密码哈希
  - [x] 1.6 更新 `users` 表：`password_hash = 新哈希`，`is_initial_password = false`
  - [x] 1.7 返回标准成功响应 `{ success: true, data: null }`

- [x] **Task 2: 路由与错误处理** (AC: #2, #3)
  - [x] 2.1 在 `auth.routes.ts` 注册 `POST /change-password`，并使用认证中间件
  - [x] 2.2 定义错误码：`AUTH_UNAUTHORIZED`、`AUTH_INVALID_PASSWORD`、`AUTH_WEAK_PASSWORD`、`AUTH_SAME_PASSWORD`
  - [x] 2.3 统一通过 `AppError` + 全局错误处理返回 `{ success: false, error: { code, message } }`

### 移动端任务

- [x] **Task 3: 修改密码页** (AC: #1, #2)
  - [x] 3.1 创建 `mobile/app/(auth)/change-password.tsx`
  - [x] 3.2 提供三个输入框：当前密码、新密码、确认新密码（均 secureTextEntry）
  - [x] 3.3 客户端校验：新密码长度 ≥ 6、两次输入一致、新密码 ≠ 当前密码
  - [x] 3.4 错误提示使用文字 + 图标（沿用 LoginScreen 风格）
  - [x] 3.5 提交按钮实现 `scale(0.98)` 100ms 按下动效
  - [x] 3.6 修改成功后根据 `role` 跳转到对应角色首页

- [x] **Task 4: 登录流程接入** (AC: #1)
  - [x] 4.1 更新 `mobile/app/(auth)/login.tsx`
  - [x] 4.2 登录成功后若 `result.user.isInitialPassword === true`，则 `router.replace('/(auth)/change-password')`
  - [x] 4.3 否则按原逻辑进入角色首页

- [x] **Task 5: API 客户端扩展** (AC: #3)
  - [x] 5.1 在 `mobile/services/api.ts` 新增 `changePassword(currentPassword, newPassword)`
  - [x] 5.2 复用已有的 `request<T>` 基座（自动携带 token、超时、401 处理）

## Dev Notes

### 关键架构约束

- **AD-4 JWT 认证**：修改密码属于受保护操作，必须验证 JWT。由于 Story 1.5 才完整实现令牌刷新/过期策略，本 Story 先新增一个最小认证中间件，供 `auth` 域内部使用。
- **AD-5 API 层 RBAC**：本 Story 只校验用户是否已登录（即 token 有效），不区分角色；所有角色都需要修改初始密码。
- **AD-14 用户域拥有角色范围**：`users` 表是密码和 `is_initial_password` 标志的唯一事实来源；`auth` service 直接操作 `users` 表。
- **AD-15 UUID 主键**：所有主键使用 Supabase 默认 UUID（v4）。
- **NFR-4 密码加密**：bcrypt 哈希 salt rounds 沿用 Story 1.1 的 10。

### 当前代码复用点

- 复用 `api/src/middleware/error-handler.ts` 的 `AppError`。
- 复用 `api/src/domains/auth/auth.service.ts` 中的 bcrypt / supabase 模式。
- 复用 `mobile/app/(auth)/login.tsx` 的颜色、字体、按钮动效、错误提示结构。
- 复用 `mobile/services/api.ts` 的 `request<T>` 基座。

### 新增文件清单

**后端：**
- `api/src/middleware/auth.ts` — JWT 认证中间件
- `api/src/domains/auth/auth.controller.ts` — 追加 `changePasswordController`（也可直接扩展现有 controller）
- `api/src/domains/auth/auth.types.ts` — 追加 `ChangePasswordInput`

**移动端：**
- `mobile/app/(auth)/change-password.tsx` — 修改密码页面
- `mobile/utils/jwt.ts` 已存在，Story 1.2 不修改

### 修改文件清单

**后端：**
- `api/src/domains/auth/auth.service.ts` — 新增 `changePassword` service
- `api/src/domains/auth/auth.routes.ts` — 注册 `POST /change-password`
- `api/src/domains/auth/auth.controller.ts` — 新增 controller 函数

**移动端：**
- `mobile/app/(auth)/login.tsx` — 首次登录跳转改密页
- `mobile/services/api.ts` — 新增 `changePassword` API 调用

### 已知限制

- JWT payload 仅包含 `userId`、`role`、`exp`，不包含 `is_initial_password`。因此**应用冷启动时若 SecureStore 中已有 token，会直接按 role 进入角色首页**，不会再次强制改密。本 Story 仅在登录成功后立即检查并跳转。若未来需要 token 恢复时也强制改密，需要扩展 `/auth/me` 接口或在 token 中增加标志（需架构决策）。

## UX Requirements

- 页面风格沿用 `DESIGN.md`：背景 `#ECFEFF`、主色 `#0891B2`、CTA `#22C55E`、文字 `#164E63`。
- 使用 Noto Sans SC 字体。
- 输入框和按钮热区 ≥ 48dp（Android）/ 44×44pt（iOS）。
- 提交按钮按下时 `scale(0.98)` 100ms。
- 错误提示不使用强制或负面词汇，同时显示文字和图标。
- 支持无障碍：输入框关联 label、错误状态同时有文字和图标。

## Testing Requirements

### 后端测试

- [x] **集成测试**：`POST /api/auth/change-password` 各种场景：
  - 未携带 token → 401
  - 当前密码错误 → 401/403 错误码
  - 新密码长度 < 6 → 400 校验错误
  - 新密码与当前密码相同 → 400 错误码
  - 正常修改 → 200，数据库 `is_initial_password` 变为 false
  - 修改后用新密码可登录，旧密码不可登录

### 移动端测试

- [x] **手动/快照测试**：修改密码页渲染、错误提示显示、跳转逻辑。
- [x] **集成测试**：输入符合规则的新密码后调用 API 并跳转角色首页。

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- Story 1.1 已建立登录 API、用户表、JWT 签发与移动端登录页；本 Story 在其基础上扩展修改密码流程。
- 后端新增 `api/src/middleware/auth.ts` JWT 认证中间件，供 `change-password` 使用。
- 后端新增 `POST /api/auth/change-password`，校验当前密码、新密码规则，使用 bcrypt 更新哈希并清除 `is_initial_password`。
- 移动端新增 `mobile/app/(auth)/change-password.tsx`，首次登录成功后强制跳转，修改成功后按角色进入首页。
- 集成测试覆盖：未认证、当前密码错误、新密码太短、新密码与当前密码相同、正常修改后旧密码失效/新密码可登录。
- 后端认证中间件为 Story 1.2 最小实现，Story 1.4/1.5 可在此基础上扩展 RBAC 与令牌刷新。

## File List

### 后端
- `api/src/middleware/auth.ts`
- `api/src/domains/auth/auth.controller.ts`
- `api/src/domains/auth/auth.routes.ts`
- `api/src/domains/auth/auth.service.ts`
- `api/src/domains/auth/auth.types.ts`

### 移动端
- `mobile/app/(auth)/change-password.tsx`
- `mobile/app/(auth)/login.tsx`
- `mobile/services/api.ts`

### Review Findings

**Review Date:** 2026-06-22
**Review Mode:** full (with spec/story)
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

#### patch
- [x] [Review][Patch] Controller Zod 拦截弱密码校验 — `api/src/domains/auth/auth.controller.ts` 的 `changePasswordSchema` 设置了 `newPassword: z.string().min(6, ...)`，导致长度不足时直接返回 `VALIDATION_ERROR`，服务层定义的 `AUTH_WEAK_PASSWORD` 永远不会触发，集成测试也会失败。应移除长度校验或映射到对应错误码。
- [x] [Review][Patch] 后端密码未 trim 与移动端不一致 — `auth.service.ts` 的 `changePassword` 未对 `currentPassword` / `newPassword` trim，而移动端会 trim 后发送，可能导致空格密码或后续登录不一致。
- [x] [Review][Patch] 后端缺少新密码最大长度限制 — 移动端限制 64 位，后端应同步限制，避免 bcrypt 处理过长密码或前后端不一致。
- [x] [Review][Patch] JWT 认证中间件未校验 payload 字段 — `api/src/middleware/auth.ts` 未检查 `payload.userId` / `payload.role` 是否存在，缺失时可能导致后续 DB 查询出现未定义值。
- [x] [Review][Patch] 修改密码后跳转依赖 URL role 参数 — `mobile/app/(auth)/change-password.tsx` 使用 `useLocalSearchParams` 的 `role` 决定跳转目标，应改为从 JWT payload 中解码 role，避免参数被篡改。
- [x] [Review][Patch] API 客户端 401 清 token 误伤改密失败 — `mobile/services/api.ts` 对所有 401 都清除 SecureStore token，用户输错当前密码时会被强制登出。改密接口的 401 不应清 token。
- [x] [Review][Patch] 更新密码未确认是否实际更新到行 — `auth.service.ts` 调用 `supabase.from('users').update(...)` 后未检查返回数据，若用户行已被删除可能误报成功。
- [x] [Review][Patch] 集成测试状态依赖 — `api/tests/auth.test.ts` 中后续测试依赖前面测试把密码改为 `newPassword`，测试顺序或失败时会导致后续用例不稳定，应增加 `beforeEach`/`afterEach` 重置。

#### defer
- [x] [Review][Defer] change-password 端点缺少速率限制 — 当前仅登录有账号锁定，改密端点可后续 V2 安全加固时增加。
- [x] [Review][Defer] 修改密码后已有 JWT 仍有效 — 当前 token 仅含 `userId`/`role`/`exp`，无版本/失效机制，留待 Story 1.5 或 V2。
- [x] [Review][Defer] 密码复杂度/常见密码检查 — AC 仅要求长度 ≥6 且不等于初始密码。
- [x] [Review][Defer] 缺少密码修改审计日志/时间戳 — 超出本 Story 范围。
- [x] [Review][Defer] 非原子读写存在并发覆盖风险 — 需要数据库事务/RPC，后续优化。

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 1 / Story 1.2]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.1 FR-1]
- [Source: `architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-4, AD-5, AD-14, AD-15, Consistency Conventions]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md` 颜色、字体、组件规范]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md` 登录/首页信息架构、转场动画]

## Change Log

- 2026-06-22: Story 1.2 实现完成。新增修改密码 API、JWT 认证中间件、移动端修改密码页与首次登录强制跳转。
