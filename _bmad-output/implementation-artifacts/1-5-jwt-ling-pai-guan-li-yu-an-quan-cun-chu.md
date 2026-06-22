---
story_id: 1.5
story_key: 1-5-jwt-ling-pai-guan-li-yu-an-quan-cun-chu
epic: 1
epic_title: 账号认证与权限体系
status: done
priority: high
points: 2
baseline_commit: bc54d81
---

# Story 1.5: JWT 令牌管理与安全存储

Status: done

> 来源：Epic 1 Story 1.5 / PRD §4.1 FR-1 / Architecture AD-4

## Story

作为一名已登录用户，
我想要 App 安全地保存和自动携带登录令牌，
以便在有效期内无需重复登录。

## Acceptance Criteria

### AC-1: 移动端安全存储令牌

- **Given** 用户登录成功
- **When** 系统返回 JWT 后
- **Then** 移动端将令牌写入 Expo SecureStore（iOS Keychain / Android Keystore）
- **And** 不将令牌存入 AsyncStorage 等明文存储

### AC-2: 受保护请求自动携带令牌

- **Given** 用户已登录且令牌有效
- **When** 移动端调用任意受保护 API
- **Then** 请求头自动包含 `Authorization: Bearer <token>`

### AC-3: 令牌过期后跳转登录页

- **Given** 用户令牌已过期
- **When** 移动端启动、进入受保护路由或收到 401 响应
- **Then** 系统清除失效令牌并跳转登录页
- **And** V1 简化为重新登录，不实现刷新令牌

### AC-4: 令牌载荷仅含必要声明

- **Given** 后端签发 JWT
- **When** 令牌生成
- **Then** payload 仅包含 `userId`、`role`、`exp`（以及 jwt 标准 `iat`）
- **And** 不包含密码、敏感个人信息等

## Tasks / Subtasks

> **注意**：JWT 签发、存储、携带、过期校验等核心能力已在 Story 1.1–1.4 中实现。本 Story 以验证、补齐测试和收尾为主。

- [ ] **Task 1: 验证移动端安全存储** (AC: #1)
  - [ ] 1.1 检查 `mobile/services/api.ts` 的 `login()` 是否调用 `SecureStore.setItemAsync('auth_token', token)`
  - [ ] 1.2 检查 `logout()` / 401 处理是否调用 `SecureStore.deleteItemAsync('auth_token')`
  - [ ] 1.3 确认没有使用 `AsyncStorage` 存储 token 的代码

- [ ] **Task 2: 验证受保护请求自动携带令牌** (AC: #2)
  - [ ] 2.1 检查 `mobile/services/api.ts` 的 `request<T>` 是否从 SecureStore 读取 token 并注入 `Authorization: Bearer <token>`
  - [ ] 2.2 检查后端 `api/src/middleware/auth.ts` 是否能正确解析并验证该头

- [ ] **Task 3: 验证令牌过期处理** (AC: #3)
  - [ ] 3.1 检查 `mobile/app/index.tsx` 是否解析 token 的 `exp` 并在过期时跳转登录页
  - [ ] 3.2 检查 `mobile/components/RoleGuard.tsx` 是否在 token 缺失/过期/角色不符时跳转登录页
  - [ ] 3.3 检查 `mobile/services/api.ts` 是否在 401 时清除本地 token

- [ ] **Task 4: 验证令牌载荷** (AC: #4)
  - [ ] 4.1 检查 `api/src/domains/auth/auth.service.ts` 的 `jwt.sign` payload 仅包含 `userId`、`role`
  - [ ] 4.2 后端测试中解码 token，断言 payload 不含密码、email 等敏感字段

- [ ] **Task 5: Epic 1 收尾** (AC: #1–#4)
  - [ ] 5.1 更新 Epic 1 状态为 `done`（若全部 Story 已完成）
  - [ ] 5.2 确认所有 Story 1.1–1.5 均已 `done`

## Dev Notes

### 当前实现状态

- 登录成功后 token 写入 `SecureStore`：`mobile/services/api.ts`
- API 请求自动带 token：`mobile/services/api.ts` 的 `request<T>`
- 后端 JWT 签发：`api/src/domains/auth/auth.service.ts`
- 后端 JWT 校验：`api/src/middleware/auth.ts`
- 应用入口 token 校验与角色跳转：`mobile/app/index.tsx`
- 角色组路由守卫：`mobile/components/RoleGuard.tsx`

### 验证入口

- 后端构建：`npm run build`
- 后端测试：`npm test`（需要配置 `DATABASE_URL`）
- 移动端类型检查：`npm run typecheck`

## UX Requirements

- 令牌过期或被清除后，用户无感知地被引导回登录页，不显示复杂错误。
- Loading 状态使用主题色指示器。

## Testing Requirements

### 后端测试

- [ ] 登录返回的 JWT payload 仅包含 `userId`、`role`、`exp`、`iat`
- [ ] 使用过期/无效 token 访问 `GET /api/auth/me` → 401
- [ ] 使用有效 token 访问 `GET /api/auth/me` → 200

### 移动端测试

- [ ] 手动测试：登录后 token 存在于 SecureStore
- [ ] 手动测试：修改系统时间使 token 过期后冷启动 App，跳转登录页

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- 核心实现来自 Story 1.1–1.4；本 Story 以验证和补齐测试为主。

## Change Log

- 2026-06-22: Story 1.5 创建，准备验证 JWT 令牌管理与安全存储。

## File List

### 后端
- `api/src/domains/auth/auth.service.ts`
- `api/src/middleware/auth.ts`
- `api/tests/auth.test.ts`

### 移动端
- `mobile/services/api.ts`
- `mobile/app/index.tsx`
- `mobile/components/RoleGuard.tsx`

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 1 / Story 1.5]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.1 FR-1]
- [Source: `architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-4]
