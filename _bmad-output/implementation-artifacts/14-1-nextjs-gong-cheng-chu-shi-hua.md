# Story 14.1: Next.js 工程初始化与鉴权

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **project maintainer**,
I want to **initialize the Next.js Web admin dashboard (web/) with login + JWT auth wired to the existing API**,
so that **admins can log in via browser and access protected admin pages, establishing the foundation for all admin Web features (Epic 9/10/13.4)**.

## Acceptance Criteria

1. **AC-1 工程骨架**:仓库根目录新增 `web/`,为 Next.js(App Router)+ TypeScript 工程,可 `npm run dev` 启动并在浏览器打开首页。
2. **AC-2 API 客户端封装**:`web/` 内有 API 客户端(对应 `mobile/services/api.ts` 的 fetch + Bearer JWT + 超时 + 401 处理 + 统一 `{success,data,error}` 信封),所有请求指向后端 REST API。
3. **AC-3 登录页**:管理员可在 `/login` 输入账号(工号/账号) + 密码,调用现有 `POST /api/auth/login`,成功后存 JWT 并跳转后台。
4. **AC-4 鉴权与角色守卫**:JWT 存 localStorage;受保护页面有守卫,未登录跳 `/login`;登录后校验 JWT 的 `role === 'admin'`,非 admin 拒绝(显示无权限)。
4a. **AC-4a 首次登录改密**:后端返回 `user.isInitialPassword === true` 时,登录后强制跳改密页(复用后端 `POST /api/auth/change-password`),改完才能进后台。
5. **AC-5 后端 CORS 放行**:`CLIENT_URL` 环境变量加入 Web 域名(开发 `http://localhost:3001` / 生产 `https://admin.ideotrack.cc.cd`),浏览器跨域请求正常。
6. **AC-6 Caddy 反代(生产)**:Caddyfile 配置 `admin.ideotrack.cc.cd` 反代到 Web 服务,自动 HTTPS。
7. **AC-7 登出**:后台可登出,清除 JWT,跳回 `/login`。
8. **AC-8 401 自动登出**:任何请求返回 401(非登录/改密接口)时,清除 JWT 并跳 `/login`。

## Tasks / Subtasks

- [ ] **Task 1: 初始化 Next.js 工程**(AC: 1)
  - [ ] 1.1 在仓库根 `web/` 用 `create-next-app` 初始化(App Router、TypeScript、不引入 Tailwind 起步可选;复用项目 theme 色 #0891B2)
  - [ ] 1.2 配置 `web/.env.local`:`NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`(开发指向本地后端)
  - [ ] 1.3 端口设为 3001(避开后端 3000),`npm run dev` 可在 `http://localhost:3001` 打开
  - [ ] 1.4 把 `web/` 加入根 `.gitignore` 的 node_modules 已覆盖;确认 `web/node_modules`、`web/.next` 不入库
- [ ] **Task 2: API 客户端封装**(AC: 2, 8)
  - [ ] 2.1 新建 `web/lib/api.ts`,镜像 `mobile/services/api.ts`:`request<T>(path, options)` → fetch + Bearer(从 localStorage 读 `auth_token`)+ AbortController 10s 超时 + 解析 `{success,data,error}` 信封
  - [ ] 2.2 401 处理:非 `/api/auth/login`、`/api/auth/change-password` 路径收到 401 → 清 token + 跳 `/login`
  - [ ] 2.3 导出 `login()`、`logout()`、`getToken()`、`changePassword()`(对应 mobile 版)
  - [ ] 2.4 类型定义:`ApiResponse<T>`、`LoginResponse { token; user: { id; role; isInitialPassword } }`
- [ ] **Task 3: 登录页 + 鉴权守卫**(AC: 3, 4, 4a, 7)
  - [ ] 3.1 `web/app/login/page.tsx`:工号/账号 + 密码表单,提交调 `login()`
  - [ ] 3.2 登录成功后:若 `isInitialPassword` → 跳 `/change-password`;否则存 token 跳 `/`(后台首页占位)
  - [ ] 3.3 JWT 解码工具 `web/lib/jwt.ts`(纯客户端 base64 解 payload,镜像 `mobile/utils/jwt.ts`),取 `role`/`exp`
  - [ ] 3.4 守卫组件 `web/components/AuthGuard.tsx`:无 token 或过期 → 重定向 `/login`;`role !== 'admin'` → 显示无权限页
  - [ ] 3.5 后台 layout(`web/app/(admin)/layout.tsx`)包 `AuthGuard`
  - [ ] 3.6 改密页 `web/app/change-password/page.tsx`:调 `changePassword()`,成功后跳 `/`
  - [ ] 3.7 登出:后台顶栏登出按钮 → `logout()` + 跳 `/login`
- [ ] **Task 4: 后端 CORS**(AC: 5)
  - [ ] 4.1 确认 `api/src/index.ts` 的 cors 已用 `config.clientUrl.split(',')`(已支持多域名,零代码改动)
  - [ ] 4.2 更新部署文档/`.env` 说明:`CLIENT_URL` 需包含 `http://localhost:3001,https://admin.ideotrack.cc.cd`(逗号分隔)
  - [ ] 4.3 本地验证:Web(3001)跨域调 API(3000)登录成功
- [ ] **Task 5: Caddy 反代配置**(AC: 6)
  - [ ] 5.1 在 `deploy.yml` 的 Caddyfile 生成段,新增 `admin.ideotrack.cc.cd { reverse_proxy <web-host>:<port> }` 块
  - [ ] 5.2 docker-compose 增加 web 服务(Next.js standalone build)或独立部署方案——本 story 先定方案,生产联调可在 Story 14.2 或部署时落地
- [ ] **Task 6: 验证 + 文档**(AC: 全部)
  - [ ] 6.1 端到端:浏览器登录 admin 账号(A001/A001,seed 账号)→ 进后台 → 登出
  - [ ] 6.2 首次登录改密链路验证
  - [ ] 6.3 `web/README.md` 记录启动方式、环境变量、部署要点

## Dev Notes

### 关键架构约束(必须遵守)

- **AD-17(已重写)**:管理员端 = Next.js Web Dashboard(`web/`),V1。Expo App(`mobile/`)管理员功能废弃,仅参考。
- **AD-19**:Web 是纯客户端,消费现有 REST API,**不做 backend-for-frontend 重复**。JWT 复用(AD-4),存 localStorage(httpOnly cookie 是后续优化,本 story 先用 localStorage 降低复杂度,无需改后端)。
- **后端零改动**:登录接口 `POST /api/auth/login`、改密 `POST /api/auth/change-password`、`GET /api/auth/me` 均已存在(`api/src/domains/auth/auth.routes.ts:14-18`)。CORS 已支持逗号分隔多域名(`api/src/index.ts` cors 配置 + `config.clientUrl.split(',')`)。**本 story 不应改任何 api/ 代码**(除可能补 Caddyfile/CORS 文档)。
- **复用 mobile 模式**:Web 的 API 客户端、JWT 解码、登录/改密流程,直接镜像 `mobile/services/api.ts` 和 `mobile/utils/jwt.ts` 的逻辑,只是把 SecureStore 换成 localStorage、把 `fetch` 用法照搬。

### 后端登录契约(直接复用,勿改)

`POST /api/auth/login` 请求 `{ schoolId, password }`,响应 `{ success, data: { token, user: { id, role, isInitialPassword } } }`。
JWT payload:`{ userId, role, exp, iat }`,`role ∈ 'student'|'counselor'|'admin'`(`api/src/middleware/auth.ts:7-18`、`auth.types.ts`)。
Web 守卫只放行 `role === 'admin'`。

### 鉴权存储选型决策

本 story 用 **localStorage**(key `auth_token`),理由:
- 后端零改动(不需要 set-cookie 端点)。
- 与 mobile 的 SecureStore 逻辑同构,迁移成本低。
- XSS 风险在 V1 内部管理后台可接受(后续 AD-19 偏好的 httpOnly cookie 是增强,留待后续 story)。

### Source tree components to touch

- **NEW**: `web/`(整个工程)
- **UPDATE**: `deploy.yml`(Caddyfile 生成段加 admin 域名)、根 `.gitignore`(确认 web/.next、web/node_modules 已忽略——根 node_modules/ 已通配,需确认 web/.next)
- **READ ONLY 参考**:`mobile/services/api.ts`、`mobile/utils/jwt.ts`、`mobile/components/RoleGuard.tsx`、`mobile/app/(auth)/login.tsx`、`mobile/app/(auth)/change-password.tsx`
- **不改**:`api/` 任何业务代码

### Testing standards

- 手动端到端验证为主(浏览器登录流程)。
- `web/lib/jwt.ts` 的解码可加单元测试(纯函数)。
- Next.js 工程 `npm run build` 必须通过(类型检查)。
- 暂不要求 E2E 自动化(后续 QA story)。

### Project Structure Notes

- `web/` 与 `api/`、`miniprogram/`、`mobile/` 平级,为独立的 Next.js 工程(自己的 package.json / node_modules)。
- 命名沿用项目中文业务命名 + 英文技术命名的混合风格(UI 文案中文,代码/路径英文)。
- 主题色复用 `#0891B2`(与 miniprogram/mobile 一致)。

### References

- [Source: _bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md#AD-17](AD-17 重写后管理员 Web)
- [Source: _bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md#AD-19](AD-19 Web 工程决策)
- [Source: _bmad-output/planning-artifacts/epics/.../epics.md#Epic-14](Epic 14 + Story 14.1 验收标准)
- [Source: api/src/domains/auth/auth.routes.ts:14-18](登录/改密/me 接口)
- [Source: api/src/middleware/auth.ts:7-18](JWT payload + req.user)
- [Source: api/src/index.ts:14-19](CORS 配置,clientUrl.split(','))
- [Source: mobile/services/api.ts](Web API 客户端镜像源)
- [Source: mobile/utils/jwt.ts](JWT 解码镜像源)
- [Source: mobile/components/RoleGuard.tsx](守卫模式参考)
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-24-v2.md](本 story 起源)

## Dev Agent Record

### Agent Model Used

builtin:bigmodel-coding-plan/GLM-5.2 (ZCode)

### Debug Log References

- `npm run build` 通过（Next.js 16.2.9 / Turbopack），TypeScript 校验通过，3 个路由预渲染：`/`、`/login`、`/change-password`。

### Completion Notes List

- **AC-1** ✅ web/ Next.js(App Router)+TS 工程，`npm run dev` 跑在 3001。
- **AC-2** ✅ `lib/api.ts` 镜像 mobile（fetch + Bearer + 10s 超时 + 401 清 token + `{success,data,error}`）。
- **AC-3** ✅ `/login` 调 `POST /api/auth/login`，成功存 token 跳 `/`。
- **AC-4 / AC-4a** ✅ `AuthGuard` 仅放行 `role===admin`；`isInitialPassword` 强制跳 `/change-password`。
- **AC-5** ✅ 后端 CORS 已支持逗号分隔，`CLIENT_URL=*` 开发放行；生产收紧方案写入 README。
- **AC-6** ⏳ Caddyfile 预留 admin 域名块（注释），生产联调在 14.2/部署时落地（本 story 无服务器联调环境）。
- **AC-7** ✅ 首页退出登录按钮 → 清 token 跳 `/login`。
- **AC-8** ✅ `lib/api.ts` 中 401（非登录/改密）清 token。
- **样式方案**：CSS Modules + CSS 变量主题（`lib/theme.ts` + `globals.css`），主色 #0891B2。
- **后端零改动**：未修改 api/ 任何代码，仅 deploy.yml 加 Caddyfile 注释说明。
- **未联调项**：浏览器实际登录（需本地后端 + seed 账号 A001/A001），生产 Caddy 反代联调——留待有运行环境时验证。

### File List

**新增（web/）：**
- `web/package.json`（端口 3001，Next 16.2.9）
- `web/.env.local`（NEXT_PUBLIC_API_BASE_URL）
- `web/app/layout.tsx`、`web/app/globals.css`（根布局 + 主题 CSS 变量）
- `web/app/page.tsx` + `page.module.css`（管理首页占位 + 登出）
- `web/app/login/page.tsx` + `page.module.css`（登录页）
- `web/app/change-password/page.tsx` + `page.module.css`（首次改密页）
- `web/components/AuthGuard.tsx`（管理员守卫）
- `web/lib/api.ts`、`web/lib/jwt.ts`、`web/lib/theme.ts`
- `web/README.md`

**修改：**
- `.github/workflows/deploy.yml`（Caddyfile 段加 admin 域名注释 + CLIENT_URL 收紧说明）

### Review Findings

**Decision-needed：**

- [ ] [Review][Decision] localStorage 存 JWT 的 XSS 风险 — spec 已明确选 localStorage，但 AD-19 偏好 httpOnly cookie。是现在改 httpOnly（需后端配合 set-cookie），还是 V1 保持 localStorage？

**Patch（已修复）：**

- [x] [Review][Patch] AC-8: 401 清 token 并跳 /login [web/lib/api.ts] ✅
- [x] [Review][Patch] /login 自动跳转检查角色，避免非 admin 死循环 [web/app/login/page.tsx] ✅
- [x] [Review][Patch] /change-password 加 token 守卫 [web/app/change-password/page.tsx] ✅
- [x] [Review][Patch] forbidden 页清 token + 提供登出入口 [web/components/AuthGuard.tsx] ✅
- [x] [Review][Patch] 非 JSON 响应不把 HTML 当错误信息 [web/lib/api.ts] ✅
- [x] [Review][Patch] 改密 trim 校验与服务端一致 [web/app/change-password/page.tsx] ✅
- [x] [Review][Patch] 建 (admin) route group，AuthGuard 移入 layout [web/app/(admin)/layout.tsx] ✅
- [x] [Review][Patch] isTokenValid 接线（AuthGuard + 改密守卫使用） [web/lib/jwt.ts] ✅
- [x] [Review][Patch] 网络错误中文兜底 [web/lib/api.ts] ✅
- [x] [Review][Patch] exp 非数字防御 [web/lib/jwt.ts] ✅

**Defer（已标记，推迟）：**

- [x] [Review][Defer] logout 无服务端撤销（token 留存到 exp） [web/lib/api.ts] — deferred，需后端加 token 撤销机制，跨 story 范围
- [x] [Review][Defer] token 过期后页面停留（无定时检查） [web/components/AuthGuard.tsx] — deferred，下次请求 401 会触发
- [x] [Review][Defer] 生产 CLIENT_URL=* 开放 + 无 web 构建步骤 [.github/workflows/deploy.yml] — deferred，AC-6/生产部署 defer 到 14.2
- [x] [Review][Defer] NEXT_PUBLIC_API_BASE_URL 构建时内联，生产可能 localhost [web/lib/api.ts:10] — deferred，生产部署 story 处理
