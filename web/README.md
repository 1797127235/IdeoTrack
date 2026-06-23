# IdeoTrack 管理后台（Web）

管理员端 Web 后台，基于 Next.js（App Router）+ TypeScript + CSS Modules。
对应 Story 14.1（工程初始化与鉴权）。

## 架构定位

- **AD-17（重写）/ AD-19**：管理员端为 Next.js Web 后台，是后端 REST API 的纯客户端。
- 复用与 `api/`、`miniprogram/` 相同的 JWT 体系（AD-4），**后端零改动**。
- 鉴权：JWT 存 `localStorage`，复用 `POST /api/auth/login`、`POST /api/auth/change-password`、`GET /api/auth/me`。

## 本地开发

```bash
cd web
npm install
npm run dev          # http://localhost:3001
```

前提：本地后端跑在 `http://localhost:3000`（`api/` 目录 `npm run dev`）。

## 环境变量

| 变量 | 开发默认 | 生产 |
|------|----------|------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3000` | `https://ideotrack.cc.cd` |

写在 `web/.env.local`（不入库）。

## 跨域（CORS）

后端 `CLIENT_URL` 支持逗号分隔多域名（`api/src/index.ts`）。

- **开发**：默认 `CLIENT_URL=*` 放行所有源，本地跨域无需配置。
- **生产**：需把 `CLIENT_URL` 收紧为 `ideotrack.cc.cd,https://admin.ideotrack.cc.cd`。

## 部署（生产）

计划方案（Story 14.1 记录，生产联调在后续 Story 落地）：

1. `npm run build` 生成 standalone 产物（或 `next start`）。
2. 在服务器上用 Caddy 反代 `admin.ideotrack.cc.cd` → Web 服务端口。
3. Caddy 自动申请 HTTPS 证书。
4. `deploy.yml` 的 Caddyfile 段预留了 admin 域名块（注释形式），上线时启用。

## 目录结构

```
web/
├── app/
│   ├── layout.tsx          # 根布局（中文 lang、主题）
│   ├── page.tsx            # 管理后台首页（Story 14.1 占位 + 登出）
│   ├── login/              # 登录页
│   └── change-password/    # 首次登录改密页
├── components/
│   └── AuthGuard.tsx       # 管理员守卫（仅放行 role=admin）
├── lib/
│   ├── api.ts              # API 客户端（镜像 mobile/services/api.ts）
│   ├── jwt.ts              # JWT 解码（镜像 mobile/utils/jwt.ts）
│   └── theme.ts            # 主题 token（与 mobile/miniprogram 一致）
└── .env.local              # 本地环境变量（不入库）
```

## 主题

色彩复用项目主色 `#0891B2`，定义在 `lib/theme.ts` 与 `app/globals.css` 的 CSS 变量。
所有页面用 CSS Modules，颜色取 CSS 变量（如 `var(--color-primary)`），避免硬编码。

## 后续 Story

- **14.2**：侧边栏布局 + 各模块导航（任务/名言/组织/用户/报表/运维）。
- **13.4**：运维仪表盘（作为 Web 第一个业务页）。
- **Epic 9/10**：组织管理、报表导出。
