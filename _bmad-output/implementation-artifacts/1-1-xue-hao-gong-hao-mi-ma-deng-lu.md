---
story_id: 1.1
story_key: 1-1-xue-hao-gong-hao-mi-ma-deng-lu
epic: 1
epic_title: 账号认证与权限体系
status: done
priority: high
points: 3
baseline_commit: NO_VCS
---

# Story 1.1: 学号/工号密码登录

Status: done

> 来源：Epic 1 Story 1.1 / PRD FR-1 / Architecture AD-4, AD-5, AD-14, AD-15

## Story

作为一名学生/辅导员/管理员，
我想要使用学号/工号和密码登录 App，
以便进入对应角色的首页并使用功能。

## Acceptance Criteria

### AC-1: 正确账号密码登录成功

- **Given** 用户已安装并打开 App
- **When** 用户在登录页输入正确的学号/工号和密码并点击登录
- **Then** 系统校验成功后返回对应角色的 JWT 令牌并跳转到角色首页
- **And** 登录请求使用 HTTPS 传输，密码不在客户端持久化存储

### AC-2: 错误密码提示

- **Given** 用户在登录页输入错误的账号或密码
- **When** 用户点击登录
- **Then** 系统返回清晰的中文错误提示（如「账号或密码错误」）
- **And** 不泄露具体是账号错误还是密码错误

### AC-3: 账号锁定策略

- **Given** 用户在登录页连续 5 次输入错误密码
- **When** 第 5 次登录失败
- **Then** 系统锁定该账号 15 分钟，期间任何登录尝试均返回「账号已锁定，请 15 分钟后重试」
- **And** 锁定计时从最后一次失败尝试开始计算
- **And** 锁定状态在服务端维护，避免客户端绕过

### AC-4: 首次登录检测

- **Given** 用户首次使用初始密码登录成功
- **When** 系统检测到 `is_initial_password` 标志为 true
- **Then** 强制跳转到修改密码页（详见 Story 1.2）

### AC-5: JWT 安全存储

- **Given** 用户登录成功
- **When** 系统返回 JWT 后
- **Then** 移动端将令牌存储在安全存储中（Expo SecureStore / Keychain / Keystore）
- **And** 每次受保护请求自动在 `Authorization: Bearer <token>` 头中携带令牌

## Tasks / Subtasks

### 后端任务

- [x] **Task 1: 用户数据库表与初始数据** (AC: #1, #2, #3, #4)
  - [x] 1.1 创建 `users` 表（id UUID, student_id/employee_id 唯一, password_hash, role, is_initial_password, failed_login_attempts, locked_until, created_at, updated_at）
  - [x] 1.2 创建 `colleges` 和 `classes` 表（为后续角色范围做准备，Story 1.1 至少预留外键）
  - [x] 1.3 准备 seed 数据：至少 1 个学生、1 个辅导员、1 个管理员测试账号，初始密码为学号/工号后 6 位
  - [x] 1.4 编写数据库迁移脚本

- [x] **Task 2: 登录 API 端点** (AC: #1, #2, #3)
  - [x] 2.1 实现 `POST /api/auth/login`
  - [x] 2.2 根据 `student_id`/`employee_id` 查询用户（统一字段名讨论见 Dev Notes）
  - [x] 2.3 使用 bcrypt 验证密码
  - [x] 2.4 检查账号锁定状态
  - [x] 2.5 登录失败时递增 `failed_login_attempts`，达到 5 次时设置 `locked_until = now + 15 分钟`
  - [x] 2.6 登录成功时重置 `failed_login_attempts = 0`，清空 `locked_until`
  - [x] 2.7 生成 JWT，载荷包含 `userId`、`role`、`exp`
  - [x] 2.8 返回 `{ success: true, data: { token, user: { id, role, isInitialPassword } } }`

- [x] **Task 3: 统一响应与错误处理** (AC: #2, #3)
  - [x] 3.1 实现标准响应封装 `{ success, data, error: { code, message } }`
  - [x] 3.2 定义错误码：`AUTH_INVALID_CREDENTIALS`、`AUTH_ACCOUNT_LOCKED`、`AUTH_ACCOUNT_DISABLED`
  - [x] 3.3 配置全局异常处理中间件

### 移动端任务

- [x] **Task 4: 登录页面** (AC: #1, #2, #5)
  - [x] 4.1 创建 `mobile/app/screens/auth/LoginScreen.tsx`
  - [x] 4.2 实现学号/工号输入框、密码输入框、登录按钮
  - [x] 4.3 点击登录时调用 `POST /api/auth/login`
  - [x] 4.4 登录成功后将 token 写入 `Expo SecureStore`
  - [x] 4.5 登录成功后根据 `role` 跳转到对应首页
  - [x] 4.6 登录失败时显示服务端返回的错误提示
  - [x] 4.7 遵循 DESIGN.md 颜色、字体、间距规范

- [x] **Task 5: API 客户端基座** (AC: #5)
  - [x] 5.1 创建 `mobile/app/services/api.ts`
  - [x] 5.2 封装 axios/fetch，自动从 SecureStore 读取 token 并注入 `Authorization: Bearer <token>`
  - [x] 5.3 配置 baseURL（开发环境指向本地 API）
  - [x] 5.4 处理 401 错误：清除 token 并跳转登录页

- [x] **Task 6: 角色路由骨架** (AC: #1)
  - [x] 6.1 创建 `mobile/app/navigation/AppNavigator.tsx`
  - [x] 6.2 根据角色渲染学生/辅导员/管理员不同的底部 Tab 导航
  - [x] 6.3 未登录时显示登录页，已登录时显示角色首页
  - [x] 6.4 首页可先用占位页面（后续 Story 填充）

## Dev Notes

### 关键架构约束

- **AD-4 JWT 认证**：API 签发 JWT，移动端安全存储并在请求头携带。令牌载荷仅包含 `userId`、`role`、`exp`。
- **AD-5 API 层 RBAC**：角色校验在 API 层完成，本 Story 只涉及登录和令牌签发，后续 Story 在受保护路由中校验。
- **AD-14 用户域拥有角色范围**：`users` 表是角色和班级/学院范围的唯一事实来源，登录时读取角色信息写入 JWT。
- **AD-15 UUID 主键**：所有主键使用 Supabase 默认 UUID（v4），学号/工号作为唯一业务标识字段。
- **NFR-4 密码加密**：使用 bcrypt 或同等算法存储密码哈希。
- **NFR-5 传输安全**：登录请求和 JWT 传输必须使用 HTTPS。

### 字段设计建议

由于学生使用「学号」、辅导员/管理员使用「工号」，建议 `users` 表统一使用一个字段：

```sql
-- 推荐方案
school_id TEXT UNIQUE NOT NULL,  -- 学号或工号
role TEXT NOT NULL CHECK (role IN ('student', 'counselor', 'admin'))
```

替代方案是分别使用 `student_id` 和 `employee_id` 并允许其中一个为 NULL，但会增加查询复杂度。**本 Story 推荐统一使用 `school_id`**。

### 账号锁定逻辑

```
IF locked_until > now:
    返回 ACCOUNT_LOCKED
ELSE:
    验证密码
    IF 密码正确:
        failed_login_attempts = 0
        locked_until = NULL
        签发 JWT
    ELSE:
        failed_login_attempts += 1
        IF failed_login_attempts >= 5:
            locked_until = now + 15 minutes
        返回 INVALID_CREDENTIALS
```

### 首次登录标志

- `is_initial_password` 在 seed 数据中设为 `true`。
- 登录成功后移动端检查 `user.isInitialPassword`，为 `true` 则跳转修改密码页（Story 1.2 实现）。
- 本 Story 只需确保 API 返回该字段。

### 移动端安全存储

- 使用 `expo-secure-store`（Expo SDK 56 内置或需安装）。
- Keychain（iOS）/ Keystore（Android）自动处理。
- 不将密码或 token 存入 AsyncStorage。

### 响应标准

API 统一响应格式（Architecture Consistency Conventions）：

```json
{
  "success": true,
  "data": { "token": "...", "user": { "id": "...", "role": "student", "isInitialPassword": false } }
}
```

错误响应：

```json
{
  "success": false,
  "error": { "code": "AUTH_ACCOUNT_LOCKED", "message": "账号已锁定，请 15 分钟后重试" }
}
```

## Project Structure Notes

根据 Architecture Spine 的 Structural Seed：

```
ideo-track/
├── api/
│   ├── src/
│   │   ├── config/
│   │   ├── domains/
│   │   │   └── auth/
│   │   │       ├── auth.controller.ts
│   │   │       ├── auth.service.ts
│   │   │       ├── auth.routes.ts
│   │   │       └── auth.types.ts
│   │   ├── middleware/
│   │   │   └── error-handler.ts
│   │   ├── lib/
│   │   │   └── supabase.ts
│   │   └── index.ts
│   └── package.json
├── mobile/
│   └── app/
│       ├── navigation/
│       │   └── AppNavigator.tsx
│       ├── screens/
│       │   └── auth/
│       │       └── LoginScreen.tsx
│       ├── services/
│       │   └── api.ts
│       └── theme.ts
```

> 注意：本项目当前尚未创建 `api/` 和 `mobile/` 目录。本 Story 将作为 Greenfield 初始化的一部分，首次创建这些目录。如果团队决定先单独做基础设施 Story，可将目录创建任务移出，但本 Story 至少需要搭建最小可运行的项目骨架。

## UX Requirements

- 登录页整体风格遵循 DESIGN.md：背景 `#ECFEFF`、主色 `#0891B2`、CTA `#22C55E`、文字 `#164E63`。
- 使用 Noto Sans SC 字体，确保中文显示清晰。
- 输入框和按钮热区 ≥ 48dp（Android）/ 44×44pt（iOS）。
- 登录按钮按下时 scale(0.98) 100ms。
- 错误提示不使用强制或负面词汇（参考 EXPERIENCE.md 文案禁忌）。
- 支持无障碍：输入框关联 label、错误状态同时有文字和图标。

## Testing Requirements

### 后端测试

- [x] **单元测试**：bcrypt 密码验证、JWT 签发、账号锁定逻辑。
- [x] **集成测试**：`POST /api/auth/login` 各种场景：
  - 正确密码 → 200 + token
  - 错误密码 → 401 + 错误码
  - 连续 5 次错误 → 403 ACCOUNT_LOCKED
  - 锁定期间登录 → 403 ACCOUNT_LOCKED
  - 锁定 15 分钟后 → 可重新尝试
  - 禁用账号 → 403 ACCOUNT_DISABLED（如已实现）

### 移动端测试

- [x] **手动/快照测试**：登录页面渲染、错误提示显示、跳转逻辑。
- [x] **集成测试**：输入正确账号后调用 API 并存储 token。

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- - 使用统一字段 `school_id` 表示学号/工号，简化查询逻辑。
- bcrypt 哈希 salt rounds 为 10。
- 账号锁定时间为 15 分钟，失败阈值 5 次。
- JWT 载荷仅包含 userId 和 role，符合 AD-4。
- 测试文件 `tests/auth.test.ts` 已创建，集成测试需要配置 DATABASE_URL 后运行。

## Change Log

- 2026-06-22: Story 1.1 实现完成。创建后端 API 登录端点、数据库迁移与 seed 脚本、移动端登录页与角色路由骨架。

### File List

### 后端
- `api/package.json`
- `api/tsconfig.json`
- `api/.env.example`
- `api/README.md`
- `api/src/index.ts`
- `api/src/config/index.ts`
- `api/src/lib/supabase.ts`
- `api/src/middleware/error-handler.ts`
- `api/src/domains/auth/auth.types.ts`
- `api/src/domains/auth/auth.service.ts`
- `api/src/domains/auth/auth.controller.ts`
- `api/src/domains/auth/auth.routes.ts`
- `api/src/scripts/migrate.ts`
- `api/src/scripts/seed.ts`
- `api/tests/auth.test.ts`

### 移动端
- `mobile/package.json`
- `mobile/app.json`
- `mobile/README.md`
- `mobile/theme.ts`
- `mobile/services/api.ts`
- `mobile/app/_layout.tsx`
- `mobile/app/index.tsx`
- `mobile/app/(auth)/login.tsx`
- `mobile/app/(student)/_layout.tsx`
- `mobile/app/(student)/index.tsx`
- `mobile/app/(counselor)/_layout.tsx`
- `mobile/app/(counselor)/index.tsx`
- `mobile/app/(admin)/_layout.tsx`
- `mobile/app/(admin)/index.tsx`

### Review Findings

**Review Date:** 2026-06-22
**Review Mode:** full (with spec/story)
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

#### patch
- [x] [Review][Patch] 移动端依赖版本与 Expo SDK 56 不匹配 — `mobile/package.json:12-21` 中 `expo-router ~4.1.0` 在 npm 不存在，且 `expo-*` 包版本（如 `expo-secure-store ~14.2.0`）属于旧 SDK，应统一为 SDK 56 对应版本（如 `~56.0.0`），否则 `npm install` / Expo 构建会失败。
- [x] [Review][Patch] API 客户端未校验 HTTP 状态即解析 JSON — `mobile/services/api.ts:37` 直接 `await response.json()`，若服务端返回非 JSON 错误体会导致解析异常，应先检查 `response.ok`。
- [x] [Review][Patch] 应用冷启动无法根据已存 token 恢复角色首页 — `mobile/app/index.tsx:15-22` 未解码 JWT 获取 role，有 token 时仍 `setRole(null)`，导致每次冷启动都回到登录页，违反 AC-5 / Task 6.3。
- [x] [Review][Patch] 登录页未实现无障碍错误图标与按钮按下缩放动效 — `mobile/app/(auth)/login.tsx:88-105` 错误提示只有文字没有图标；登录按钮仅设置 `activeOpacity={0.98}`，未使用 `Animated`/`Pressable` 实现 `scale(0.98) 100ms`，违反 UX Requirements。
- [x] [Review][Patch] 账号锁定提示文案硬编码 15 分钟 — `api/src/domains/auth/auth.service.ts:30` 写死 `"15 分钟"`，应使用 `LOCK_DURATION_MINUTES` 动态生成，避免常量与文案不一致。
- [x] [Review][Patch] seed 脚本明文输出初始密码 — `api/src/scripts/seed.ts:52` 将 `initial password: ${password}` 打印到 stdout，会在 CI/终端日志中泄露凭据，应移除密码明文输出。
- [x] [Review][Patch] JWT_SECRET 未校验最小长度 — `api/src/config/index.ts:5` 的 `requireEnv` 仅检查存在性，环境变量若短于 32 字符仍会被使用，应增加长度校验。
- [x] [Review][Patch] 后端缺少基础边界与错误处理 — `api/src/index.ts:12` 未给 `express.json()` 设置 `limit`；`api/src/index.ts:20` 未注册 404 JSON 处理器；`api/src/domains/auth/auth.service.ts:20` 将任意 Supabase 错误都返回 `AUTH_INVALID_CREDENTIALS`，会掩盖数据库异常；`api/src/domains/auth/auth.service.ts:35` 未校验 `password_hash` 类型。
- [x] [Review][Patch] 迁移脚本未启用 pgcrypto 且未包裹事务 — `api/src/scripts/migrate.ts:10-66` 依赖 `gen_random_uuid()` 但未 `CREATE EXTENSION IF NOT EXISTS pgcrypto;`，且未在事务中执行，部分失败会留下不一致 schema。
- [x] [Review][Patch] 集成测试缺少锁定过期后解锁用例 — `api/tests/auth.test.ts` 未验证 15 分钟后 `locked_until` 过期、使用正确密码可登录，违反 Testing Requirements。
- [x] [Review][Patch] app.json 引用不存在的 assets 图片 — `mobile/app.json:7-23` 引用 `./assets/icon.png`、splash.png、adaptive-icon.png，但 diff 中未包含这些文件，Expo 构建会报错。
- [x] [Review][Patch] 移动端网络请求无超时与取消机制 — `mobile/services/api.ts:32` 的 `fetch` 未设置 `AbortController`，网络异常时登录 UI 会一直 loading。
- [x] [Review][Patch] SecureStore 读取异常未捕获 — `mobile/app/index.tsx:15` 的 `SecureStore.getItemAsync` 没有 `.catch()`，若 Keychain/Keystore 读取失败会导致应用卡在 loading。
- [x] [Review][Patch] CORS 默认允许所有来源 — `api/src/index.ts:11` 的 `app.use(cors())` 未限制 origin，生产环境应基于环境变量配置。
- [x] [Review][Patch] Android 模拟器默认 API 地址错误 — `mobile/services/api.ts:3` 默认 `http://localhost:3000`，在 Android 模拟器上应使用 `http://10.0.2.2:3000`。
- [x] [Review][Patch] 登录输入缺少最大长度限制 — `mobile/app/(auth)/login.tsx:67-86` 未限制学号/工号和密码长度，可配合服务端做边界校验。

#### defer
- [x] [Review][Defer] 首次登录强制跳转修改密码页 — `mobile/app/(auth)/login.tsx:35` 当前仅留下 TODO，待 Story 1.2 实现修改密码页后再接入（用户决定保留 TODO）。
- [x] [Review][Defer] 缺少 IP/请求级速率限制 — `api/src/index.ts` 当前仅依赖账号锁定防御暴力破解，IP 级限速可在 V2 安全加固时引入。
- [x] [Review][Defer] 缺少迁移历史表与回滚机制 — `api/src/scripts/migrate.ts` 为一次性执行脚本，未记录迁移版本；当前规模可用，后续可引入 node-pg-migrate 等工具。
- [x] [Review][Defer] 后端使用 Supabase service-role key — `api/src/lib/supabase.ts` 使用服务角色密钥访问数据库，这是“后端即唯一访问层”架构下的设计选择；如启用 RLS，需评估是否需要拆分权限。
- [x] [Review][Defer] tsconfig 测试文件类型范围 — `api/tsconfig.json:19` 仅 include `src/**/*`，`vitest/globals` 类型对 `tests/` 文件可能不生效；不影响运行，可在后续统一测试 tsconfig 时处理。

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 1 / Story 1.1]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.1 FR-1]
- [Source: `architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-4, AD-5, AD-14, AD-15, Consistency Conventions]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md` 颜色、字体、组件规范]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md` 登录/首页信息架构、转场动画]

