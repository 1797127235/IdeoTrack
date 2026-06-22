---
story_id: 1.4
story_key: 1-4-jue-se-yu-quan-xian-kong-zhi
epic: 1
epic_title: 账号认证与权限体系
status: done
priority: high
points: 3
baseline_commit: 2a274b8
---

# Story 1.4: 角色与权限控制

Status: done

> 来源：Epic 1 Story 1.4 / PRD §4.1 FR-2 / Architecture AD-4, AD-5, AD-14

## Story

作为一名系统用户，
我想要系统根据我的角色控制功能访问范围，
以便不同角色只看到该有的入口和数据。

## Acceptance Criteria

### AC-1: 后端受保护路由校验角色

- **Given** 用户已登录并持有 JWT
- **When** 用户访问需要特定角色的 API
- **Then** 后端读取 JWT 中的 `role`，仅允许指定角色访问
- **And** 无令牌返回 401，角色不符返回 403

### AC-2: 移动端角色路由隔离

- **Given** 用户已登录并拥有角色
- **When** 用户尝试访问不属于自己角色的页面组（如学生访问辅导员页面）
- **Then** 移动端拦截并跳转回登录页或显示无权限提示

### AC-3: 角色覆盖范围

- **Then** 学生只能访问任务、打卡、日历、排行、个人中心对应页面
- **And** 辅导员只能访问看板、复核、个人中心对应页面
- **And** 管理员可以访问任务发布、组织管理、全校报告、名言库对应页面
- **And** 一个用户只能拥有一个角色（V1 不支持一人多角色）

## Tasks / Subtasks

### 后端任务

- [x] **Task 1: RBAC 中间件** (AC: #1)
  - [x] 1.1 创建 `api/src/middleware/rbac.ts`
  - [x] 1.2 导出 `requireRoles(...roles: UserRole[])` 中间件
  - [x] 1.3 依赖 `req.user`（由 `authenticate` 中间件设置），未设置时返回 401
  - [x] 1.4 `req.user.role` 不在允许列表时返回 403，错误码 `ACCESS_DENIED`

- [x] **Task 2: 受保护路由示例** (AC: #1)
  - [x] 2.1 在 `auth.routes.ts` 新增 `GET /api/auth/me`
  - [x] 2.2 该路由使用 `authenticate` 中间件，所有已登录用户可访问
  - [x] 2.3 返回 `{ success: true, data: { userId, role } }`
  - [x] 2.4 为后续 Story 预留按角色限制的路由组合模式：`[authenticate, requireRoles('student')]` 等

- [x] **Task 3: 后端 RBAC 测试** (AC: #1)
  - [x] 3.1 测试无 token 访问 `GET /api/auth/me` → 401
  - [x] 3.2 测试携带有效 token 访问 `GET /api/auth/me` → 200，返回 userId/role
  - [x] 3.3 测试仅允许 `admin` 的占位路由，学生 token 访问 → 403

### 移动端任务

- [x] **Task 4: 角色组布局守卫** (AC: #2, #3)
  - [x] 4.1 更新 `mobile/app/(student)/_layout.tsx`：读取 SecureStore token，解码 role，非 `student` 则替换到登录页
  - [x] 4.2 更新 `mobile/app/(counselor)/_layout.tsx`：同上，仅允许 `counselor`
  - [x] 4.3 更新 `mobile/app/(admin)/_layout.tsx`：同上，仅允许 `admin`
  - [x] 4.4 解码逻辑复用 `utils/jwt.ts` 中的 `decodeJwtPayload`
  - [x] 4.5 加载 token 期间显示与 `app/index.tsx` 一致的 loading 指示器

- [x] **Task 5: 无权限兜底** (AC: #2)
  - [x] 5.1 若角色无效或 token 缺失，统一重定向到 `/(auth)/login`

## Dev Notes

### 关键架构约束

- **AD-4 JWT 认证**：token 仅含 `userId`、`role`、`exp`，后端以 token 中的 role 作为权限依据。
- **AD-5 API 层 RBAC**：权限校验必须在 API 层完成，不能依赖客户端自律。
- **AD-14 用户角色由 users 域 owning**：JWT role 来自登录时读取的 `users.role`，后续用户管理 Story 可修改角色，但已签发 token 仍按原 role 生效至过期。

### 当前代码复用点

- `api/src/middleware/auth.ts` 的 `authenticate` 中间件。
- `mobile/utils/jwt.ts` 的 `decodeJwtPayload`。
- `mobile/app/index.tsx` 的 token 读取 + role 解码 + loading 模式。

### 新增文件清单

**后端：**
- `api/src/middleware/rbac.ts`

**移动端：**
- 无新增文件，修改三个 `_layout.tsx`

### 修改文件清单

**后端：**
- `api/src/domains/auth/auth.routes.ts`
- `api/src/domains/auth/auth.controller.ts`（追加 `meController`）
- `api/tests/auth.test.ts`

**移动端：**
- `mobile/app/(student)/_layout.tsx`
- `mobile/app/(counselor)/_layout.tsx`
- `mobile/app/(admin)/_layout.tsx`

## UX Requirements

- 无权限时不显示具体页面内容，直接替换到登录页。
- loading 状态使用主题色指示器，与启动页保持一致。

## Testing Requirements

### 后端测试

- [x] `GET /api/auth/me` 无 token → 401
- [x] `GET /api/auth/me` 有效 token → 200，返回正确 role
- [x] `POST /admin-only-placeholder` 学生 token → 403 `ACCESS_DENIED`

### 移动端测试

- [x] 手动测试：学生 token 无法进入 `(counselor)` / `(admin)` 路由组
- [x] 手动测试：辅导员 token 无法进入 `(student)` / `(admin)` 路由组
- [x] 手动测试：管理员 token 无法进入 `(student)` / `(counselor)` 路由组

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- 本 Story 建立 RBAC 基础设施，为后续学生/辅导员/管理员各功能页面提供权限守卫。

## Change Log

- 2026-06-22: Story 1.4 实现完成。新增 RBAC 中间件、`GET /api/auth/me`、按角色隔离移动端路由组。

## File List

### 后端
- `api/src/middleware/rbac.ts`
- `api/src/domains/auth/auth.controller.ts`
- `api/src/domains/auth/auth.routes.ts`
- `api/tests/auth.test.ts`

### 移动端
- `mobile/app/(student)/_layout.tsx`
- `mobile/app/(counselor)/_layout.tsx`
- `mobile/app/(admin)/_layout.tsx`

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 1 / Story 1.4]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.1 FR-2]
- [Source: `architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-4, AD-5, AD-14]
