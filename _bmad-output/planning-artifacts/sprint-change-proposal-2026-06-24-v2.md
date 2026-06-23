---
title: Sprint Change Proposal v2 — 管理员端全面迁移至 Next.js Web 后台
status: approved
created: 2026-06-24
trigger: 用户决策将管理员端从 V1 Expo App 提前迁移到 Next.js Web 后台（原 V2 计划提前）
scope_classification: Major
supersedes_partial: sprint-change-proposal-2026-06-24 (Story 13.4 归属调整)
affected_artifacts:
  - ARCHITECTURE-SPINE.md (AD-17 重写)
  - prd.md (兼容性、登录描述)
  - epics.md (Epic 9/10/13 归属改 Web + 新增 Epic 14 Web 基础设施)
  - EXPERIENCE.md (管理员 UX 改 Web 规范)
  - sprint-status.yaml
---

# Sprint Change Proposal v2：管理员端全面迁移至 Next.js Web 后台

## Section 1：Issue Summary（问题陈述）

### 触发背景

在讨论运维仪表盘（Story 13.4）归属时，用户决策：**将管理员端从原计划的「V1 Expo App、V2 Web 后台」直接提前为「V1 Next.js Web 后台」**。即管理员不再使用移动 App，而是一开始就用网页后台。

这推翻了 AD-17 中「Admin client → React Native + Expo App in V1」的设定。

### 触发原因

1. 管理员场景（运维监控、数据报表、批量导入、组织管理）在大屏 + 复杂表单上，Web 优于移动 App。
2. 管理员无需在手机上高频操作，装一个 App 只为管理功能，分发与维护成本不划算。
3. 运维仪表盘、报表导出等「看 + 导出」场景，Web 是更自然的选择。

### 问题类型

Strategic pivot（战略转向）—— 提前执行原 V2 计划，并废弃 Expo App 管理员实现路线。

### 证据

1. 用户连续确认：选择「全面转 Web（大重构）」并接受 MVP 主线暂停的代价。
2. 用户选定技术栈：Next.js。
3. Expo App 管理员端目前只实现了任务管理（3.x 管理员侧）+ 名言库（2.3），功能量小，迁移/废弃成本低。

---

## Section 2：Impact Analysis（影响分析）

### 2.1 Epic Impact

| Epic | 原归属 | 新归属 | 影响 |
|------|--------|--------|------|
| 2.3 名言库管理 | Expo App | **Web** | 重做（已实现于 mobile，迁 web） |
| 3.1/3.2 任务发布（管理员侧） | Expo App | **Web** | 重做（管理员侧；辅导员侧仍在小程序） |
| 9.1–9.4 组织/用户管理 | Expo App | **Web** | 尚未实现，直接按 Web 做 |
| 10.1–10.4 报表/导出 | Expo App | **Web** | 尚未实现，直接按 Web 做 |
| 13.4 运维仪表盘 | Expo App（v1 proposal） | **Web** | 改归属 |
| **14（新增）** | — | **Web 基础设施** | 新增：Next.js 工程骨架 + 鉴权 |

**不改动**：学生端（小程序）、辅导员端（小程序）、后端 API（平台无关，零返工）。

### 2.2 Expo App（mobile/）处置

- 管理员功能（`(admin)/`）**标记废弃**，不再新增功能。
- 学生/辅导员壳页面（`(student)/`、`(counselor)/`）早已废弃（已迁小程序）。
- 保留 `mobile/` 作为历史参考，**不再作为交付端**。后续可整体归档。

### 2.3 Artifact Conflicts

| 产物 | 冲突点 | 需要的更新 |
|------|--------|-----------|
| `ARCHITECTURE-SPINE.md` | AD-17 仍写管理员 Expo App | **重写 AD-17**；新增 **AD-19**（Web 工程决策）；Stack 表 + Structural Seed 补 `web/` |
| `prd.md` | FR-1 登录、§9.6 兼容性写管理员 App | 改为管理员 Web 后台 |
| `epics.md` | Epic 9/10/13、Story 2.3/3.x 归属 App | 归属改 Web；新增 **Epic 14**（Web 基础设施） |
| `EXPERIENCE.md` | UX-5 管理员为移动 App Tab 设计 | 改为 Web 后台导航规范（侧边栏/顶栏布局） |
| `sprint-status.yaml` | 无 epic-14；管理员 story 无 web 标记 | 登记 Epic 14 + story；管理员 story 加 `client: web` |

### 2.4 Technical Impact

- **新增 `web/` 工程**：Next.js（App Router）+ TypeScript + 复用后端 REST API + JWT 鉴权（存 httpOnly cookie 或 localStorage）。
- **后端**：CORS 需新增 Web 域名白名单（CLIENT_URL 已支持逗号分隔，零结构改动）；其余 API 不变。
- **部署**：Web 静态/SSR 产物需额外托管（Caddy 反代 / Vercel / 同服务器）。docker-compose 可加 web 服务或独立部署。
- **运维仪表盘（13.4）**：成为 Web 后台的第一个页面（种子），验证 Web 鉴权与 API 通路。

---

## Section 3：Recommended Approach（推荐路径）

### 选择：Option 1 — Direct Adjustment（直接调整）

**理由**：
- 后端 API 完全平台无关，零返工。
- 管理员功能大多尚未实现（Epic 9/10 全 backlog），直接按 Web 做，无返工。
- 已实现的管理员功能（2.3 名言库、3.x 任务）量小，迁 Web 成本可控。
- 不需要回滚任何学生/辅导员/后端代码。

**工作量估算**：
- Web 工程骨架 + 鉴权（Epic 14）：2–3 天
- 运维仪表盘（13.4，作种子页）：1 天
- 名言库 + 任务管理（管理员侧）迁 Web：2 天
- 后续 Epic 9/10 按 Web 实现（本提案不细化，进入 create-story 时再拆）

**风险评估**：Medium-High
- 主要风险：Web 鉴权 + CORS + 部署是新链路，需调试。
- 次要风险：Next.js 对用户是新技术栈（但 React 基础可复用）。
- **MVP 时间线影响**：管理员功能上线前需先完成 Epic 14（Web 基建），会推迟管理员端可用时间。学生/辅导员端不受影响。

**时间线影响**：
- 学生打卡闭环（Epic 4/5）+ 辅导员看板（Epic 8）不受影响，可继续推进。
- 管理员端（Epic 9/10/13.4）需等 Epic 14 Web 基建完成。

---

## Section 4：Detailed Change Proposals（详细变更提案）

### 4.1 Architecture — 重写 AD-17 + 新增 AD-19

**重写 AD-17**：

```markdown
### AD-17 — Clients are deployed per-role (multi-end)

- **Binds:** All clients, login flows, notification delivery
- **Prevents:** Forcing high-frequency student check-in onto a heavyweight App install; letting the WeChat file sandbox compromise export features; forcing admin management scenarios onto a mobile App
- **Rule:** Clients are deployed per role:
  - **Student client** → WeChat Mini Program (native, `miniprogram/`)
  - **Counselor client** → WeChat Mini Program (native, `miniprogram/`, role-routed)
  - **Admin client** → Next.js Web Dashboard (`web/`) — V1 (提前自原 V2 计划)

  Deployment boundaries:
  - Students: WeChat login (wx.login + binding); counselors: staff-ID + password in Mini Program; admins: account + password in Web Dashboard. All reuse JWT (AD-4).
  - Counselor exports (FR-24): backend-generated temp download links, copied to browser.
  - Admin exports (FR-28): run natively in Web Dashboard (browser download, no sandbox).
  - Student/counselor notifications: WeChat subscribe messages; admin notifications: Web in-app notifications.
  - Backend API is fully platform-agnostic; all ends share the same REST interface.
  - The Expo App (`mobile/`) admin implementation is deprecated and retained as reference only.
```

**新增 AD-19**：

```markdown
### AD-19 — Admin Web dashboard is a Next.js app sharing the REST API

- **Binds:** admin client tech stack, auth transport, deployment
- **Prevents:** divergent admin implementations; mobile/web feature drift; rebuild of backend for web
- **Rule:**
  - Admin dashboard is Next.js (App Router) + TypeScript at `web/`.
  - It consumes the existing REST API (`/api/*`) with the same JWT (AD-4); token stored in httpOnly cookie (preferred) or localStorage.
  - No backend-for-frontend duplication; the Next.js app is a pure client to the API.
  - CORS on the API whitelists the Web origin via CLIENT_URL.
  - Deployment: Caddy reverse-proxies the web origin (or Vercel); same server or separate.
```

### 4.2 PRD（prd.md）

**变更 FR-1 登录**：管理员通过 Next.js Web 后台使用账号 + 密码登录（原 Expo App）。

**变更 §9.6 兼容性**：管理员端为 Next.js Web 后台，支持现代桌面浏览器（Chrome/Edge/Safari）；不再要求移动 App。

### 4.3 Epics — 归属改 Web + 新增 Epic 14

**新增 Epic 14：Web 后台基础设施**

```markdown
## Epic 14：Web 后台基础设施（管理员端）

**目标**：搭建 Next.js Web 后台工程骨架，为 Epic 2.3、3（管理员侧）、9、10、13.4 提供运行基础。
**归属端**：Web（web/）+ 后端 auth/CORS

### Story 14.1：Next.js 工程初始化
作为一名开发者，我想要初始化 web/ 工程骨架，以便管理员 Web 功能能运行。
- 创建 web/（Next.js App Router + TypeScript + 复用 theme tokens）
- 封装 API 客户端（对应 mobile/services/api.ts，JWT 注入、统一错误处理）
- 登录页 + JWT 鉴权（httpOnly cookie 或 localStorage）+ 角色守卫（admin only）
- 后端 CORS 加 Web 域名白名单
- Caddy 反代 Web origin（或独立部署）
- 能在浏览器登录管理员账号、访问受保护页

### Story 14.2：Web 后台布局与导航
- 侧边栏/顶栏布局（概览 / 任务 / 名言 / 组织 / 用户 / 报表 / 运维）
- 管理员首页概览
- 退出登录
```

**归属调整**：Epic 2.3、3.1/3.2（管理员侧）、9.x、10.x、13.4 归属端改为 `Web（web/）`。辅导员侧 3.1/3.2 仍在小程序。

### 4.4 UX — 管理员改 Web 后台规范

**UX-5 更新**：管理员端为 Next.js Web 后台，桌面布局（侧边栏导航 + 主内容区），非移动 Tab。支持响应式但以桌面为大屏主要验证端。

### 4.5 sprint-status.yaml

```yaml
epic-14: backlog  # Web 后台基础设施 (sprint-change-proposal-2026-06-24-v2)
14-1-nextjs-gong-cheng-chu-shi-hua: backlog  # web/ 骨架 + 鉴权 + CORS
14-2-web-hou-tai-bu-ju-yu-dao-hang: backlog  # 侧边栏/顶栏布局
epic-14-retrospective: optional
```

管理员 story（2.3、3.1管理员侧、9.x、10.x、13.4）加注 `client: web`。Epic 13 Story 13.4 归属从 mobile 改 web。

---

## Section 5：Implementation Handoff（实施交接）

### 5.1 变更范围分类：Major

重写核心架构决策 AD-17、新增 AD-19、新增 Epic 14、多 Epic 归属迁移。后端零返工。

### 5.2 用户前置事项

| 事项 | 说明 | 紧迫度 |
|------|------|--------|
| Web 域名 | 管理员 Web 后台访问域名（如 admin.ideotrack.cc.cd） | 🟡 写 14.1 前 |
| 部署方式 | 同服务器 Caddy 反代 vs Vercel | 🟡 写 14.1 前 |
| JWT 存储方式 | httpOnly cookie（推荐，需后端配合）vs localStorage（简单） | 🟢 可用 localStorage 起步 |

### 5.3 实施顺序

1. **[Web 基建]** Epic 14：Next.js 骨架 + 鉴权 + CORS + 部署
2. **[运维种子页]** Story 13.4：运维仪表盘（验证 Web 通路）
3. **[迁移]** Story 2.3 名言库、3.x 任务管理（管理员侧）迁 Web
4. **[新功能]** Epic 9/10 按 Web 实现
5. **[并行，不受影响]** 学生打卡闭环（Epic 4/5）+ 辅导员看板（Epic 8）继续在小程序推进

### 5.4 成功标准

- 管理员能在浏览器登录 Next.js Web 后台。
- Web 后台调用后端 API（带 JWT），CORS 正常。
- 运维仪表盘在 Web 显示四区数据。
- Expo App（mobile/）管理员功能标记废弃。
- AD-17 / AD-19 / PRD / epics / UX 反映 Web 后台策略。

---

## 审批

- [x] 用户最终审批（已批准，应用全部变更）

## 修订记录

| 版本 | 日期 | 内容 |
|------|------|------|
| 1.0 | 2026-06-24 | 管理员端全面迁移至 Next.js Web 后台，提前 V2；重写 AD-17，新增 AD-19 + Epic 14 |
