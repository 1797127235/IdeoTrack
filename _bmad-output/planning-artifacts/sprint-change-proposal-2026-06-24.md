---
title: Sprint Change Proposal — 运维可见性与数据保护 (Epic 13)
status: approved
created: 2026-06-24
trigger: 排查运维现状时发现 MVP 缺少数据库备份、健康监控、日志轮转；用户希望补齐并把运维状态做成管理员可见界面
scope_classification: Major
affected_artifacts:
  - epics.md
  - prd.md
  - ARCHITECTURE-SPINE.md
  - EXPERIENCE.md
  - sprint-status.yaml
---

# Sprint Change Proposal：运维可见性与数据保护（Epic 13）

## Section 1：Issue Summary（问题陈述）

### 触发背景

在 2026-06-24 排查后端运维现状时发现：IdeoTrack MVP 阶段缺少运维可见性与数据保护能力。系统已部署到生产服务器（docker-compose 三容器：postgres / api / caddy + GitHub Actions 自动部署），但：

- **无数据库备份机制**：项目内无 cron、无 pg_dump 脚本、无任何备份产物。
- **无健康监控/告警**：API 容器无 healthcheck，`/health` 端点无人调用，服务挂了无法及时感知。
- **日志无持久化与轮转**：生产日志只进 stdout，Docker json-file 驱动未配 `max-size`，长期运行将写满磁盘；容器重建后历史日志全丢。

用户（项目所有者 Liu）明确希望：**在 MVP 阶段补齐这些运维能力，并做成管理员在 Expo App 内可见的状态界面**，而不只是命令行。

### 问题类型

New requirement emerged from stakeholders（新需求浮现）。同时附带一类规划漏洞：

- **规划漏洞**：PRD 的 NFR-8（基础敏感词过滤和**日志审计**能力）、NFR-10（**每日备份**核心数据）是 MVP 明确要求，但当前 12 个 Epic / 44 个 Story 中**没有任何一个承接这两条 NFR**。本次变更同时补上这个缺口。
- **全新需求**：把运维状态（健康/备份/资源/错误日志）展现给管理员，属于原 MVP 未规划的新增范围。

### 证据

1. 全项目搜索 `backup|cron|pg_dump` —— 无任何命中（grep 确认）。
2. `epics.md` 需求覆盖映射（line 137-169）—— NFR-8 / NFR-10 未出现在任何 story 的覆盖需求中。
3. `docker-compose.yml` —— 三容器均无 `logging` 轮转配置、无 `healthcheck`（api 容器）。
4. 用户在本次会话中明确选择：四项运维信息全要（健康/备份/资源/日志）+ 备份用 cron + API 读目录方案。

---

## Section 2：Impact Analysis（影响分析）

### 2.1 Epic Impact

| Epic | 影响 | 说明 |
|------|------|------|
| 1-8、10-12 | 无影响 | 这些 Epic 的功能与运维无关 |
| 9（管理员） | 轻微关联 | 运维仪表盘进入管理员 App 首页网格，但不修改 Epic 9 现有 story（用户/组织管理） |
| **13（新增）** | **新增 Epic** | 「运维可见性与数据保护」，4 个 story |

**不淘汰、不回滚任何已完成工作。** 纯新增。

### 2.2 Artifact Conflicts

| 产物 | 冲突点 | 需要的更新 |
|------|--------|-----------|
| `epics.md` | 无 Epic 13；NFR-8/NFR-10 无承接 story | 新增 Epic 13（4 story）；Epic 列表补一行 |
| `prd.md` | NFR-8/NFR-10 无 epic 映射；无「运维仪表盘」FR | 补 NFR→Epic 映射；新增 FR-32 |
| `ARCHITECTURE-SPINE.md` | 无运维数据暴露/备份策略决策 | 新增 AD-18 |
| `EXPERIENCE.md` (UX-5) | 管理员首页无「系统状态」入口 | 管理员首页网格新增卡片（不新增 Tab） |
| `sprint-status.yaml` | 无 epic-13 及其 story | 登记新 epic + 4 story（均 backlog） |

### 2.3 Technical Impact

- **后端**：新增 `api/src/domains/ops/` 域（routes/controller/service/types），挂载到 `/api/ops`。4 个 admin-only 端点。不改动现有域。
- **基础设施**：`docker-compose.yml` 加日志轮转 + `./logs`、`./backups` 卷挂载；新增 `scripts/backup-db.sh`；`deploy.yml` 加 cron 注册步骤。
- **管理员端**：新增 `mobile/app/(admin)/system-status.tsx` + `mobile/services/systemOpsApi.ts`；首页网格加卡片。
- **CI/CD**：deploy.yml 首次部署注册 cron job。
- **数据**：无 schema 变更（备份是文件，运维状态是实时读取，不持久化）。

---

## Section 3：Recommended Approach（推荐路径）

### 选择：Option 1 — Direct Adjustment + 部分 Option 3（MVP 范围界定）

**理由**：
- 纯新增 Epic + story，不回滚、不返工任何已完成功能。
- 后端 RBAC/域结构/API 封装均已就绪，ops 域照现有模式新建即可。
- NFR-10 备份本就是 MVP 承诺（上线前必做），本次正好补上规划漏洞。

**MVP 归属界定**：
- Story 13.1（每日备份）+ 13.2（日志轮转落盘）→ **MVP 必做**（对应 NFR-10/NFR-8，上线前必须）
- Story 13.3（运维 API）+ 13.4（仪表盘）→ **MVP 前，但优先级略低**（增强可见性，不阻塞核心打卡链路）

**工作量估算**：
- 基础设施（13.1+13.2）：0.5–1 天
- 后端 ops 域（13.3）：1 天
- 管理员仪表盘（13.4）：1–1.5 天
- 文档更新 + 测试：0.5 天
- **合计约 3–4 天**

**风险评估**：Medium
- 主要风险：API 容器读取宿主机资源受 Docker 隔离限制，需通过卷挂载而非宿主机直读（已通过 AD-18 约束）。
- 安全考量：ops 端点全部 admin-only（`requireRoles('admin')`）；路径硬编码防目录穿越；只返回错误日志摘要不含心得正文（日志本就没有）。
- 技术风险低：后端复用现有 RBAC/响应封装/域结构。

**时间线影响**：
- Epic 13 建议排在主干链路（Epic 4/5/8）之后、MVP 上线之前。它是「上线准备」性质，不阻塞功能开发。

---

## Section 4：Detailed Change Proposals（详细变更提案）

### 4.1 Epics（epics.md）

**新增 Epic 13**（插入 Epic 12 之后）：

```markdown
## Epic 13：运维可见性与数据保护

**目标**：保障 MVP 上线后的数据安全（每日备份）与运维可见性，让管理员无需登录服务器即可掌握系统健康、备份、资源与错误日志状态。

**覆盖需求**：NFR-8（日志审计）、NFR-10（每日备份）、新增 FR-32（运维仪表盘）、AD-18
**归属端**：后端（api/ops 域）+ 管理员 Expo App（mobile/）+ 基础设施（docker-compose / cron）

**范围说明**：
- Story 13.1（每日备份）、13.2（日志轮转落盘）为 MVP 必做，对应 NFR-10/NFR-8。
- Story 13.3（运维 API）、13.4（仪表盘）为 MVP 前增强，不阻塞核心打卡链路。

### Story 13.1：数据库每日备份（MVP 必做）

作为一名项目维护者，
我想要系统每日自动备份数据库，
以便在数据丢失或损坏时能恢复。

**验收标准：**
- **Given** 服务器已部署
- **When** 到达每日凌晨 3:00（cron 触发）
- **Then** 执行 pg_dump 导出到 /opt/IdeoTrack/backups/db-backup-YYYYMMDD-HHMMSS.sql
- **And** 保留最近 14 天的备份，超出自动删除
- **And** 备份脚本幂等，可手动重跑
- **And** 备份不依赖后端进程（走系统 cron），API 挂了备份照跑
- **And** 异地备份（对象存储/另一台机器）留待 V2

**归属端**：基础设施（scripts/backup-db.sh + 服务器 cron）

### Story 13.2：日志轮转与生产落盘（MVP 必做）

作为一名项目维护者，
我想要生产日志持久化落盘并自动轮转，
以便排查问题时有历史日志且不会写满磁盘。

**验收标准：**
- **Given** 生产容器运行中
- **When** 日志产生时
- **Then** 三容器（postgres/api/caddy）均配置 json-file 日志驱动，max-size 10m / max-file 3
- **And** api 容器挂载 ./logs:/app/logs 卷，并设 LOG_FILE_DIR=/app/logs
- **And** pino 同时写 stdout 和 /app/logs/app.log，落盘到宿主机持久化
- **And** 容器重建后宿主机日志文件不丢失

**归属端**：基础设施（docker-compose.yml）

### Story 13.3：后端运维 API（ops 域，admin-only）

作为一名管理员，
我想要通过 API 读取系统运维状态，
以便运维仪表盘展示数据。

**验收标准：**
- **Given** 新增 api/src/domains/ops 域
- **When** 实现以下端点（全部 authenticate + requireRoles('admin')）
- **Then** 提供：
  - GET /api/ops/health —— API 进程存活 + Postgres 连通性（SELECT 1）+ 运行时长
  - GET /api/ops/backups —— 列 /app/backups 下备份文件（文件名/大小/时间/是否成功）
  - GET /api/ops/system —— 磁盘使用率 + Node 进程内存 + 容器运行时长
  - GET /api/ops/logs?limit=50&level=error —— 读 app.log 尾部 N 行按 level 过滤
- **And** 所有路径硬编码到挂载点，不接受用户输入拼路径（防目录穿越）
- **And** fs/DB 读取失败时返回降级数据（null），不让运维页搞挂后端

**归属端**：后端（api/src/domains/ops/）

### Story 13.4：管理员运维仪表盘（App）

作为一名管理员，
我想要在 App 内查看系统运维状态，
以便不登录服务器也能掌握系统健康。

**验收标准：**
- **Given** 管理员进入「系统状态」页
- **When** 页面加载或下拉刷新
- **Then** 展示四区：
  1. 服务健康：API✅/Postgres✅ + 运行时长
  2. 系统资源：磁盘进度条、内存占用
  3. 备份记录：最近备份列表（时间/大小/状态），最近一次距今多久高亮
  4. 错误日志：最近 N 条 error 日志（时间+消息），可展开详情
- **And** 管理员首页网格新增「🛠️ 系统状态」卡片入口
- **And** 不新增 Tab；样式复用 theme tokens

**归属端**：管理员 Expo App（mobile/app/(admin)/system-status.tsx + mobile/services/systemOpsApi.ts）
```

**Epic 列表补一行**：`13. Epic 13：运维可见性与数据保护`

### 4.2 PRD（prd.md）

**新增 FR-32**（管理员端功能需求表）：

```markdown
| 运维仪表盘 | FR-32 | P0（上线前） | 管理员可在 App 内查看服务健康状态、数据库备份记录、系统资源占用、最近错误日志，无需登录服务器。 |
```

**NFR 映射补充**（覆盖映射表）：
- NFR-8（日志审计）→ 由 Story 13.2 + 13.3 承接
- NFR-10（每日备份）→ 由 Story 13.1 承接

### 4.3 Architecture（ARCHITECTURE-SPINE.md）

**新增 AD-18**：

```markdown
### AD-18 — Operations data exposed read-only to the API container

- **Binds:** backup strategy, log persistence, ops API surface
- **Prevents:** silent data loss; API container being unable to read operational state
- **Rule:**
  - Database backups run via host cron (pg_dump), not in-process — survives API crashes.
  - Backups written to /opt/IdeoTrack/backups, mounted read-only (./backups:/app/backups:ro) into the api container.
  - Production logs written to /app/logs (mounted ./logs volume) with Docker json-file rotation (max-size 10m / max-file 3).
  - A new ops domain exposes admin-only read endpoints (health / backups / system / logs) under /api/ops.
  - No host root info exposed; only container-scoped memory/disk.
```

### 4.4 UX Design（EXPERIENCE.md）

**更新 UX-5 管理员**：管理员首页概览网格新增「🛠️ 系统状态」卡片，跳转 `./system-status`。不新增 Tab、无 wireframe 结构变化（沿用现有卡片网格模式）。

### 4.5 Sprint Status（sprint-status.yaml）

**新增条目**：

```yaml
epic-13: backlog
13-1-shu-ju-ku-mei-ri-bei-fen: backlog  # MVP 必做 (NFR-10)
13-2-ri-zhi-lun-zhuan-yu-sheng-chan-luo-pan: backlog  # MVP 必做 (NFR-8)
13-3-hou-duan-yun-wei-api: backlog  # admin-only ops 域
13-4-guan-li-yuan-yun-wei-yi-biao-pan: backlog  # 管理员 App 仪表盘
epic-13-retrospective: optional
```

---

## Section 5：Implementation Handoff（实施交接）

### 5.1 变更范围分类：Major

涉及 PRD、Architecture、Epics、UX、Sprint Status 五份核心产物更新 + 新增 Epic。但后端零返工（复用现有 RBAC/域结构），新增基础设施脚本，技术风险可控。

### 5.2 用户前置事项

| 事项 | 说明 | 紧迫度 |
|------|------|--------|
| 备份保留天数 | 默认 14 天，可调 | 🟢 用默认即可 |
| 异地备份 | V2 再做（对象存储） | 🟢 不阻塞 |
| cron 时间 | 默认每日 03:00 | 🟢 用默认即可 |

### 5.3 实施顺序（建议）

1. **[基础设施]** Story 13.1 + 13.2：backup 脚本 + docker-compose 日志轮转/卷挂载 + cron 注册
2. **[后端]** Story 13.3：ops 域（4 端点）
3. **[管理员端]** Story 13.4：systemOpsApi + system-status 页 + 首页卡片
4. **[文档]** 应用 4.1-4.5 的产物变更到 epics/prd/architecture/ux/sprint-status
5. **[测试]** ops.service 纯函数单元测试；后端端点本地验证；管理员页编译验证

### 5.4 成功标准

- 数据库每日自动备份到 /opt/IdeoTrack/backups，保留 14 天，可手动触发验证。
- 生产日志落盘 + 轮转，磁盘不会被日志写满。
- `/api/ops/*` 四个端点 admin-only，非 admin 返回 403。
- 管理员可在 App 内看到健康/资源/备份/日志四区，下拉刷新。
- NFR-8 / NFR-10 正式有 story 承接，PRD 映射闭合。

---

## 审批

- [x] Step 3 五项变更提案用户逐项确认（A/B/C/D+E 全部 Approve）
- [x] Section 1+2 分析方向用户确认
- [x] 用户最终审批（Step 5）

## 修订记录

| 版本 | 日期 | 内容 |
|------|------|------|
| 1.0 | 2026-06-24 | 初始提案：新增 Epic 13 运维可见性与数据保护，4 story，闭合 NFR-8/NFR-10 漏洞 |
