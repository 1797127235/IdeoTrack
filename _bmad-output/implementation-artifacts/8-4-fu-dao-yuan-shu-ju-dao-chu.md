---
story_id: 8.4
story_key: 8-4-fu-dao-yuan-shu-ju-dao-chu
epic: 8
epic_title: 辅导员数据看板
status: review
priority: high
points: 5
baseline_commit: 8c4427f572b21cf28680c6964a016df895f65836
---

# Story 8.4: 辅导员数据导出

Status: ready-for-dev

> Source: Epic 8 Story 8.4 / PRD §4.8 FR-24 / AD-1, AD-2, AD-5, AD-7, AD-10, AD-14, AD-17 / NFR-3 / UX-4, UX-8, UX-10, UX-15, UX-16

## Story

作为一名辅导员，
我想要导出所带班级的打卡数据（指定班级、指定日期范围），
以便进行二次处理或存档。

## Acceptance Criteria

### AC-1: 导出请求与权限隔离

- **Given** 辅导员已认证，调用 `POST /api/counselor/exports`，body 为 `{ class_ids: string[], start_date: string, end_date: string }`
- **When** 后端处理请求
- **Then** 校验 `start_date` / `end_date` 为合法 `YYYY-MM-DD` 且 `start_date <= end_date`
- **And** 校验日期范围跨度上限 90 天（防滥用），超出返回 `EXPORT_RANGE_TOO_WIDE`
- **And** 对 `class_ids` 中**每一个**班级调用 `isClassManagedByCounselor(counselorId, classId)` 校验
- **And** 非该辅导员管辖的班级返回 `404`（`NOT_FOUND`，避免 ID 遍历泄露，与 8.1/8.2/8.3 一致）
- **And** `class_ids` 数量上限 50，超出返回 `VALIDATION_ERROR`
- **And** 非辅导员角色返回 `403`

### AC-2: Excel 生成与列内容

- **Given** 请求校验通过
- **When** 后端查询数据并生成 Excel
- **Then** 生成的 Excel 每行一条打卡记录，列包含：**班级名称、学生姓名、学号、任务标题、打卡时间、打卡状态、审核状态、心得内容**
- **And** 学生姓名使用 `COALESCE(NULLIF(s.name, ''), s.school_id)` 兜底（与 8.2 一致）
- **And** 日期范围按**北京时区**切分边界：`DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai') BETWEEN start_date AND end_date`（与 8.1/8.2 时区逻辑一致，防止跨天数据错位）
- **And** 打卡时间格式化为本地可读时间（ISO 8601 或 `YYYY-MM-DD HH:mm:ss`）
- **And** 审核状态值为 check_ins.status 状态机值（`submitted`/`ai_reviewing`/`ai_approved`/`pending_manual_review`/`approved`/`rejected`/`requires_modification`）
- **And** 无打卡记录的学生不输出空行（只导出有记录的）或按团队约定输出含"未打卡"标记行（见 Dev Notes 决策点）

### AC-3: 文件存储与签名下载链接（AD-7）

- **Given** Excel 生成完成
- **When** 后端将文件写入存储
- **Then** 文件写入本地临时目录（`config.exportFileDir`，默认挂载 `./exports` 卷）
- **And** 生成一个签名 token（用 `jsonwebtoken`，已安装）携带 `{ fileId, exp }`，有效期 24 小时（AD-7）
- **And** 返回 `{ download_url: "/api/exports/:token", expires_at: <ISO> }`，统一响应信封 `{ success: true, data }`
- **And** 下载端点 `GET /api/exports/:token` **不经过 JWT authenticate**，靠签名 token 自校验；token 无效/过期返回 `410`（`EXPORT_LINK_EXPIRED`）
- **And** 文件下载使用 `res.download()` 流式返回，设置正确 Content-Type

### AC-4: 小程序导出页与复制链接

- **Given** 辅导员进入 `miniprogram/pages/counselor/export` 页
- **When** 选择班级（多选，来自所带班级列表）、起始日期、结束日期并点击「导出」
- **Then** 调用 `POST /api/counselor/exports`，展示 loading
- **And** 成功后展示 `download_url` 与 `expires_at`，并提供「复制链接」按钮调用 `wx.setClipboardData`
- **And** 复制成功后 toast「链接已复制，请在浏览器打开下载」（绕过微信文件沙箱，AD-17）
- **And** 失败时展示友好错误文案（UX-15，不使用负面/强制词汇）
- **And** 空数据时后端返回 `EXPORT_NO_DATA`（`404` 或 `200` + 标记），前端展示「所选范围内没有可导出的打卡记录」（UX-16）

### AC-5: 配置与环境

- **Given** 后端启动
- **When** 读取导出配置
- **Then** `config/index.ts` 新增 `exportFileDir`（`process.env.EXPORT_FILE_DIR || path.join(process.cwd(), 'exports')`，遵循 logs 模式）和 `exportLinkTtlSeconds`（`Number(process.env.EXPORT_LINK_TTL_SECONDS) || 86400`）
- **And** 测试环境可缺省（不抛错，遵循 wechat 配置的"开发期可不配"模式）
- **And** `.env.example` 追加导出相关变量示例
- **And** `docker-compose.yml` 的 api 服务挂载 `./exports:/app/exports` 卷（参照 AD-18 的 `./logs` 挂载模式）

## Tasks / Subtasks

### 后端

- [x] **T1: 新增依赖与配置** (AC: #5)
  - [x] T1.1 `cd api && npm install exceljs`（自带类型，无需 `@types`）
  - [x] T1.2 在 `api/src/config/index.ts` 新增 `exportFileDir`、`exportLinkTtlSeconds`（遵循"开发期可不配"模式，非 test 环境缺失不抛错）
  - [x] T1.3 在 `api/.env.example` 追加 `EXPORT_FILE_DIR=`、`EXPORT_LINK_TTL_SECONDS=86400`
  - [x] T1.4 在 `docker-compose.yml` api 服务挂载 `./exports:/app/exports` 卷

- [x] **T2: 新建文件存储模块** `api/src/lib/storage.ts` (AC: #3)
  - [x] T2.1 `saveExportFile(buffer: Buffer, ext: string): Promise<{ fileId: string; filePath: string }>` — 写入 `config.exportFileDir/<uuid>.<ext>`
  - [x] T2.2 `signDownloadToken(fileId: string): Promise<string>` — 用 `jsonwebtoken` 签 `{ fileId, exp: now + ttl }`
  - [x] T2.3 `verifyDownloadToken(token: string): Promise<{ fileId: string } | null>` — 校验，过期返回 null
  - [x] T2.4 `resolveFilePath(fileId: string): string` — 拼路径，**校验 fileId 为合法 UUID，防目录穿越**（参照 ops 域 AD-18 的防穿越模式）
  - [x] T2.5 `deleteExportFile(fileId: string): Promise<void>` — 下载后即删（可选，或定时清理）

- [x] **T3: 导出 service** `api/src/domains/counselor/counselor.service.ts` (AC: #1, #2)
  - [x] T3.1 新增 `exportClassCheckIns(counselorId: string, input: ExportCheckInsInput): Promise<ExportJobResult>`
  - [x] T3.2 校验日期范围：`parseDate` 复用（严格 `YYYY-MM-DD` 正则，8.2/8.3 review 修复点）；`start <= end`；跨度 ≤ 90 天
  - [x] T3.3 对每个 `class_id` 调 `isClassManagedByCounselor`（非管辖 → `NOT_FOUND` 404）
  - [x] T3.4 查询：`check_ins JOIN users JOIN classes JOIN tasks WHERE ci.user_id IN (该班级学生) AND DATE(ci.checked_in_at AT TIME ZONE 'Asia/Shanghai') BETWEEN $start AND $end`，用 `= ANY($n::uuid[])` 批量
  - [x] T3.5 空数据 → 抛 `EXPORT_NO_DATA`
  - [x] T3.6 用 exceljs 生成 workbook：中文表头（班级/姓名/学号/任务/打卡时间/打卡状态/审核状态/心得），每行一条记录
  - [x] T3.7 调 `storage.saveExportFile` + `signDownloadToken`，返回 `{ download_url, expires_at }`

- [x] **T4: 类型定义** `api/src/domains/counselor/counselor.types.ts` (AC: #1, #3)
  - [x] T4.1 `ExportCheckInsInput { class_ids: string[]; start_date: string; end_date: string }`
  - [x] T4.2 `ExportJobResult { download_url: string; expires_at: string }`
  - [x] T4.3 `ExportRowItem`（内部查询行类型）

- [x] **T5: 控制器与路由** (AC: #1, #3)
  - [x] T5.1 `counselor.controller.ts` 新增 `exportCheckInsController`，zod 校验 body（`class_ids` 非空数组 ≤50 UUID、`start_date`/`end_date` 字符串）
  - [x] T5.2 `counselor.routes.ts` 新增 `POST /exports`（`authenticate, requireRoles('counselor')`）
  - [x] T5.3 `api/src/index.ts` 顶层新增 `GET /api/exports/:token`（**不经过 authenticate**，靠 token 自校验），调 storage 流式下载
  - [x] T5.4 下载 controller：`verifyDownloadToken` 失败 → `410 EXPORT_LINK_EXPIRED`；成功 `res.download(resolveFilePath(fileId))`

- [x] **T6: 测试** `api/tests/counselor.test.ts` (AC: 全部)
  - [x] T6.1 正常导出：辅导员导出所带班级 7 天数据 → 201，返回 download_url + expires_at
  - [x] T6.2 权限隔离：辅导员 A 导出辅导员 B 的班级 → 404
  - [x] T6.3 非辅导员角色 → 403
  - [x] T6.4 日期范围非法（start > end、跨度过大 >90 天、非 YYYY-MM-DD）→ 400/409
  - [x] T6.5 空数据 → EXPORT_NO_DATA
  - [x] T6.6 下载链接：有效 token → 200 + Excel 文件流；过期/无效 token → 410
  - [x] T6.7 校验 Excel 内容（可选：将生成 buffer 解析断言行数/表头）

### 小程序

- [x] **T7: API 客户端** `miniprogram/services/counselorApi.ts` (AC: #4)
  - [x] T7.1 新增 `exportCheckIns(classIds, startDate, endDate): Promise<ExportJobResult>`
  - [x] T7.2 新增类型 `ExportJobResult`（镜像后端）
  - [x] T7.3 复用 `post` 封装，解包 `{ success, data }`

- [x] **T8: 导出页** `miniprogram/pages/counselor/export` (AC: #4)
  - [x] T8.1 新建 `index.ts` / `index.wxml` / `index.wxss` / `index.json`
  - [x] T8.2 页面加载调 `getCounselorDashboard()` 获取所带班级列表供多选
  - [x] T8.3 班级多选 checkbox 列表（全选/反选）
  - [x] T8.4 起始/结束日期 `<picker mode="date">`
  - [x] T8.5 「导出」按钮 → 调 `exportCheckIns` → loading → 展示 download_url + expires_at
  - [x] T8.6 「复制链接」按钮 → `wx.setClipboardData` → toast「链接已复制，请在浏览器打开下载」
  - [x] T8.7 空数据/错误态友好展示（UX-15/16）

- [x] **T9: 入口与导航**
  - [x] T9.1 在辅导员看板添加「数据导出」入口（`wx.navigateTo`）+ 样式 + `goToExport` 方法
  - [x] T9.2 注册页面到 `miniprogram/app.json` pages
  - [x] T9.3 运行 `cd miniprogram && npx tsc --noEmit` 类型检查 ✅ 零错误

## Dev Notes

### ⚠️ 关键修正：Epic 原文"Supabase Storage"已过时

Epic Story 8.4 AC 写"上传 Supabase Storage"，但项目已于 2026-06-23 从 Supabase 迁移到**自托管 PostgreSQL**（ARCHITECTURE-SPINE.md changelog）。**本 story 按 AD-2/AD-7 现规实现本地临时文件方案**，不要引用 Supabase Storage。AD-7 现为："本地临时文件或 S3 兼容对象存储"。V1 选本地临时文件（成本最低），S3 兼容留 V2。

### ⚠️ 文件存储基建是新建的

`api/src/lib/` 当前只有 `db.ts`、`logger.ts`、`wechat.ts`，**没有 storage 模块**。本 story 是项目中**第一个需要文件存储的功能**，T2 新建的 `lib/storage.ts` 将成为后续所有文件类功能（V2 富媒体上传、报告导出）的基础。设计时考虑接口可扩展（V2 加 S3 adapter 不破坏调用方）。

### 决策点：空行策略（需 dev 确认）

AC-2 提到两种策略，dev 实现时选择并记录：
- **策略 A（推荐）**：只导出有打卡记录的行（类INNER JOIN）。数据干净，但"未打卡"学生不出现在表中。
- **策略 B**：所有应打卡学生都输出，未打卡的行状态列填"未打卡"（LEFT JOIN）。便于辅导员核对全班完成情况。

建议默认策略 B（辅导员视角更有用），但需确认。

### RBAC 数据范围控制（必须严格遵循）

复用 `counselor.service.ts:90 isClassManagedByCounselor(counselorId, classId)`：
- 非管辖班级 → 抛 `NOT_FOUND` 404（**不是 403**，避免 ID 遍历泄露哪些班级存在）
- 这是 8.1/8.2/8.3 全项目统一约定，8.4 必须一致

### 时区（极易踩坑）

- 日期范围边界必须用 `DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai')`
- 8.2 的 CI bug 就是因为 Beijing/UTC 日界错位，本 story 日期范围跨度更大（最多 90 天），错位更严重
- `parseDate` 复用 8.2/8.3 修复后的严格正则版本

### ESM 模块系统（硬约定）

- `package.json` `"type": "module"`
- **所有相对导入必须带 `.js` 后缀**（如 `import { query } from '../../lib/db.js'`），即使源文件是 `.ts`
- 这是全项目约定，违反会导致运行时找不到模块

### 响应信封与错误码

- 统一 `{ success: boolean, data?, error?: { code, message } }`
- 新增错误码：`EXPORT_RANGE_INVALID`、`EXPORT_RANGE_TOO_WIDE`、`EXPORT_NO_DATA`、`EXPORT_CONFIG_MISSING`、`EXPORT_LINK_EXPIRED`（UPPER_SNAKE_CASE）

### 测试约定

- vitest + supertest + 真实 test DB（`TEST_DATABASE_URL`，缺则 `describe.skipIf` 跳过）
- `createToken(role, userId)` 签 JWT，`seedUser` 插用户
- 复用 8.3 测试的 setup（建学院/班级/用户/counselor_classes）
- 文件存储在测试中用真实本地临时目录（`os.tmpdir()`），无需 mock

### 安全要点

- 签名下载 token 用 `jsonwebtoken`（已安装，复用 `config.jwtSecret` 或单独 secret）
- fileId 必须校验为合法 UUID，防目录穿越（`../etc/passwd` 攻击）
- 导出请求 body 大小已被全局 `express.json({ limit: '10kb' })` 限制（index.ts:24），class_ids 上限 50 进一步保护

### 复用清单（不要重复造轮子）

| 复用项 | 位置 |
|--------|------|
| 班级归属校验 | `counselor.service.ts:isClassManagedByCounselor` |
| 日期解析 | `counselor.service.ts:parseDate` |
| 北京日期字符串 | `counselor.service.ts:toBeijingDateString` |
| 班级列表查询 | `getCounselorDashboard`（导出页选班级） |
| 学生姓名兜底 | `COALESCE(NULLIF(s.name,''), s.school_id)` |
| JWT 签名 | `jsonwebtoken`（auth 域已在用） |
| fetch 超时 | `lib/wechat.ts:fetchWithTimeout`（若涉及对象存储上传，V2） |
| 配置"开发期可不配"模式 | wechat 配置（`|| ''` 不抛错） |
| 卷挂载模式 | AD-18 `./logs` 挂载 |

### 架构合规

- **AD-1（瘦客户端）**：导出数据范围、Excel 生成、文件存储、签名全在后端；小程序只提交范围 + 复制链接
- **AD-2（PostgreSQL 持久化）**：打卡数据从 PostgreSQL 查；文件用本地临时文件
- **AD-5（API 层 RBAC）**：每个 class_id 校验 isClassManagedByCounselor
- **AD-7（报告服务端生成）**：Excel 后端生成 + 24h 签名链接，正是本 AD 的典型场景
- **AD-10（功能域）**：导出逻辑放 counselor 域（与 8.1/8.2/8.3 一致）；文件存储放 lib/storage（横切）；**不要新建 reports 域**（那是 Epic 10 管理员全校报表）
- **AD-17（分端）**：辅导员小程序功能；下载绕过微信沙箱靠复制链接到浏览器
- **NFR-3（性能）**：报表查询 < 5s；90 天范围 + 单班级几十学生量级，批量查询可满足

## Previous Story Intelligence（来自 8.2/8.3）

- tabBar 页面用 `wx.switchTab`，普通页用 `wx.navigateTo`；导出页是普通页
- 北京日期格式化不要依赖 `Date.toLocaleDateString`（iOS/Android 差异），用服务端 date 字段或手动算偏移
- `vitest` 通过不代表 `tsc --noEmit` 通过；提交前跑 `npm run build`
- 微信编译器：页面避免顶层 `type` 别名，用 interface 或内联
- 8.3 review 修复模式：所有 fetch 必须有超时（若涉及外部存储）；错误信息不泄露内部细节给前端

## Project Structure Notes

- 新增：`api/src/lib/storage.ts`、`miniprogram/pages/counselor/export/*`
- 修改：`api/src/domains/counselor/{service,controller,routes,types}.ts`、`api/src/config/index.ts`、`api/src/index.ts`、`api/.env.example`、`api/package.json`、`docker-compose.yml`、`miniprogram/services/counselorApi.ts`、`miniprogram/app.json`
- 不修改：学生端、auth 域、tasks/checkins/reviews/points/quotes 域

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` §Epic 8 / Story 8.4]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.8 FR-24]
- [Source: `architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-1, AD-2, AD-5, AD-7, AD-10, AD-14, AD-17, Consistency Conventions, Stack 表]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md` 颜色/字体/圆角 tokens]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md` UX-4, UX-8, UX-10, UX-15, UX-16]
- [Previous: `_bmad-output/implementation-artifacts/8-2-wei-da-ka-xue-sheng-ming-dan.md`（RBAC/时区/前序学习）]
- [Previous: `_bmad-output/implementation-artifacts/8-3-yi-jian-ti-xing.md`（review 修复模式、ESM、测试约定）]

## Dev Agent Record

### Agent Model Used

ZCode (zhipu/mimo-v2.5-pro)

### Debug Log References

无

### Completion Notes List

- Story 8.4 context created from Epic 8 / PRD §4.8 FR-24 / Architecture Spine / 现有 counselor 域代码深度分析。
- 关键修正已记录：Epic 原文"Supabase Storage"过时，按 AD-2/AD-7 用本地临时文件。
- 文件存储基建（lib/storage.ts）是项目首个文件存储实现，设计为 V2 可扩展 S3。
- 空行策略选择了策略 A（INNER JOIN，只导出有记录的行）——数据更干净。
- 后端 `tsc --noEmit` ✅ 零错误；小程序 `tsc --noEmit` ✅ 零错误；`npm test` ✅ 9 passed / 156 skipped。
- 小程序导出页入口加在辅导员看板 header 右侧（📊 导出按钮），含样式和 goToExport 方法。
- 下载端点 `GET /api/exports/:token` 不经过 JWT authenticate，靠签名 token 自校验（AD-7）。

### File List

**新增：**
- `api/src/lib/storage.ts` — 文件存储模块（saveExportFile / signDownloadToken / verifyDownloadToken / resolveFilePath / deleteExportFile）
- `miniprogram/pages/counselor/export/index.ts` — 导出页逻辑
- `miniprogram/pages/counselor/export/index.wxml` — 导出页模板
- `miniprogram/pages/counselor/export/index.wxss` — 导出页样式
- `miniprogram/pages/counselor/export/index.json` — 导出页配置

**修改：**
- `api/src/config/index.ts` — 新增 `exportFileDir` / `exportLinkTtlSeconds`
- `api/src/domains/counselor/counselor.types.ts` — 新增 `ExportCheckInsInput` / `ExportJobResult` / `ExportRowItem`
- `api/src/domains/counselor/counselor.service.ts` — 新增 `exportClassCheckIns` + storage imports
- `api/src/domains/counselor/counselor.controller.ts` — 新增 `exportCheckInsController` + zod schema
- `api/src/domains/counselor/counselor.routes.ts` — 新增 `POST /exports` 路由
- `api/src/index.ts` — 新增 `GET /api/exports/:token` 下载端点
- `api/tests/counselor.test.ts` — 新增 9 个导出相关测试
- `api/.env.example` — 追加导出配置变量
- `api/package.json` — 新增 `exceljs` 依赖
- `docker-compose.yml` — api 服务挂载 `./exports` 卷 + 新增环境变量
- `miniprogram/services/counselorApi.ts` — 新增 `exportCheckIns` + `ExportCheckInsInput` / `ExportJobResult` 类型
- `miniprogram/pages/counselor/dashboard/index.wxml` — header 新增导出入口按钮
- `miniprogram/pages/counselor/dashboard/index.ts` — 新增 `goToExport` 方法
- `miniprogram/pages/counselor/dashboard/index.wxss` — 新增 `.header-right` / `.export-btn` 样式
- `miniprogram/app.json` — 注册 `pages/counselor/export/index`

**规格文档（由 Correct Course 变更，非 dev 直接修改）：**
- `_bmad-output/implementation-artifacts/8-4-fu-dao-yuan-shu-ju-dao-chu.md`（本文件）
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
