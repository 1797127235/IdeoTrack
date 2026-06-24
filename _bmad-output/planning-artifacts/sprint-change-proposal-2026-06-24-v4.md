---
title: Sprint Change Proposal v4 — Implementation Readiness 修复与管理员 Web MVP 缺口补齐
created: 2026-06-24
trigger: |
  bmad-check-implementation-readiness 报告（2026-06-24）发现：
  1. Epic 12 / Epic 14 为技术里程碑 Epic，违反 Epic 必须交付用户价值原则；
  2. 业务 Epic 依赖基础设施 Epic，破坏 Epic 独立性；
  3. UX 文档（EXPERIENCE.md / DESIGN.md）未同步最新分端决策；
  4. 管理员 Web 后台导航结构在 UX 与 Epics 间不一致；
  5. 地理围栏配置 UI 缺失；
  6. 管理员 Web 端 MVP 关键功能（组织/用户/报表/围栏/通知/运维）仍为静态原型，未连接后端。
scope_classification: Major（Epic 结构重组 + 多产物更新 + Web 端大量实现工作）
affected_artifacts:
  - _bmad-output/planning-artifacts/epics/epics-IdeoTrack-2026-06-22/epics.md
  - _bmad-output/planning-artifacts/prds/prd-IdeoTrack-2026-06-22/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md
  - web/（连接后端、补齐 MVP 功能）
  - deferred-work.md
---

# Sprint Change Proposal v4：Implementation Readiness 修复与管理员 Web MVP 缺口补齐

> 本提案基于 `bmad-check-implementation-readiness` 报告（2026-06-24）生成，处理 IR 发现的结构问题、文档同步问题，以及管理员 Web 端 MVP 实现缺口。
> 相关已批准提案：v2（管理员端迁移 Web）、v3（围栏+派发+P1 内容）。

---

## Section 1：Issue Summary

### 触发背景

在完成 `bmad-check-implementation-readiness` 评估后，发现 IdeoTrack 的规划文档与当前实现状态之间存在系统性偏差。虽然功能覆盖率 100%（32/32 FRs 都有 Story 承接），但 Epic 结构、文档同步、管理员 Web 端实现进度均需要 course correction。

### 核心问题

1. **Epic 12「微信小程序基础设施」和 Epic 14「Web 后台基础设施」是技术里程碑 Epic**，不是用户价值 Epic，违反 `create-epics-and-stories` 核心原则。
2. **业务 Epic 依赖基础设施 Epic**，例如 Epic 1 Story 1.6 依赖 Epic 12，Epic 4 Story 4.5 依赖 Epic 14.2，破坏 Epic 独立性。
3. **UX 文档未同步最新分端决策**：`EXPERIENCE.md` 仍写「V1 专注手机端、不支持 Web/桌面」；`DESIGN.md` 仍写「React Native（Expo）+ Next.js Web 后台」和「清新教育风」。
4. **管理员 Web 导航结构不一致**：UX 侧（学院/班级/学生分开，打卡/心得/积分独立）与 Epic 14.2（概览/任务/名言/组织/用户/报表/运维）不匹配。
5. **地理围栏配置 UI 缺失**：功能已进 MVP，但 UX 文档中无明确设计。
6. **管理员 Web 端仍为静态原型**：`web/lib/data.ts` 提供全站 mock 数据，组织/用户/报表/围栏/通知/运维均未连接后端。
7. **运维仪表盘当前展示操作日志**，不是真正的服务健康/资源/备份/错误日志面板。
8. **部分 Story 缺少 NFR 量化 AC**。

### 问题类型

结构性调整 + 文档同步 + 实现补齐。属于 **Hybrid**：以 Direct Adjustment 为主，辅以优先级重排。

---

## Section 2：Impact Analysis

### 2.1 Epic Impact

| Epic | 影响 |
|------|------|
| Epic 12 | **解散**。内容下沉为跨 Epic 通用实现任务或并入 Epic 1。 |
| Epic 14 | **解散**。内容下沉为跨 Epic 通用实现任务或并入各管理员业务 Epic。 |
| Epic 13 | **拆分**。13.1/13.2/13.3 保留为「数据保护与运维基础」；13.4 改属 Web，与运维 API 组成新的 Epic 14「运维仪表盘」。 |
| Epic 1 | Story 1.6 扩展为完整微信登录+绑定故事（含前后端）；Story 12.4（辅导员小程序登录）可并入 Epic 1 或 Epic 8。 |
| Epic 2 | Story 2.3 名言库管理归属 Web，需连接后端。 |
| Epic 3 | Story 3.1/3.2 管理员侧归属 Web，需按 v3 派发模式+P1 内容连接后端。 |
| Epic 4 | Story 4.5 地理围栏后端已实现，需补充 Web 配置 UI。 |
| Epic 5 | 基本不受影响。 |
| Epic 6/7 | V2，当前无影响。 |
| Epic 8 | 辅导员端，不受影响。 |
| Epic 9 | 组织/用户管理，Web 原型存在但未连 API，需大量实现。 |
| Epic 10 | 报表/导出，Web 原型存在但未连 API。 |
| Epic 11 | 通知中心，Web 原型存在但未实现。 |

### 2.2 Story Impact

- 需删除：Story 12.1、12.3、14.1、14.2（作为独立用户故事）。
- 需扩展：Story 1.6、2.3、3.1、3.2。
- 需新增/重开：Story 4.5 Web UI、Epic 9 各 story 的 Web 实现、Epic 10 各 story 的 Web 实现、Epic 11 Web 通知中心、新的 Epic 14 Story 14.1 运维仪表盘。
- 需补充 AC：将 NFR 转化为可测试 AC。

### 2.3 Artifact Conflicts

| 产物 | 冲突 |
|------|------|
| `epics.md` | 含 Epic 12/14 独立章节；Epic 13 混合技术/价值任务；需求覆盖映射缺 FR-32；NFR-16 描述未同步。 |
| `ARCHITECTURE-SPINE.md` | Stack 表和 Structural Seed 仍按旧分端策略；Capability Map 管理员登录仍写 mobile；ER 图含 LEADERBOARD_ENTRY 持久化表。 |
| `EXPERIENCE.md` | Form-Factor 仍写不支持 Web；UI System 只列 RN 技术栈；管理员导航结构与 Epics 不一致；缺地理围栏配置 UI。 |
| `DESIGN.md` | 仍写「清新教育风」和 RN+Web 技术栈，与项目根目录 DESIGN.md/PRODUCT.md 的最新极简蓝色方向冲突。 |
| `web/` | 全站 mock 数据；运维页展示操作日志而非真正运维面板。 |
| `deferred-work.md` | 需登记 P3 富媒体 V2（已砍）等。 |

### 2.4 Technical Impact

- 后端：组织/用户/报表/通知/ops 域 API 需要补充或完善。
- Web：需要统一 API 客户端、鉴权、错误处理、加载态，并替换所有 mock 数据。
- 小程序：不受影响。
- 部署：Web 端需要接入 Caddy 反代或独立部署。

---

## Section 3：Recommended Approach

### 选择：Hybrid（Direct Adjustment + MVP 优先级重排）

**理由：**
- 不需要回滚任何已批准的 v2/v3 决策。
- Epic 12/14 结构问题通过解散/下沉解决，不破坏用户价值交付。
- UX 文档更新是纯文档同步。
- Web 端 MVP 缺口通过补充/重开现有 Epic 的故事来解决，不需要从 PRD 中移除功能。
- 需要重新排定 sprint 优先级：Web 公共基座 → 组织/用户管理 → 报表/围栏/通知/运维。

### 工作量与风险

| 维度 | 评估 |
|------|------|
| 工作量 | High（主要是 Web 端连接后端和补齐功能） |
| 风险 | Medium（Web 鉴权、API 联调、schema 设计需协调） |
| 时间线影响 | 管理员端可用时间会推迟，学生/辅导员端不受影响 |

---

## Section 4：Detailed Change Proposals

### 4.1 Epic 12 解散

**OLD：** Epic 12 作为独立 Epic，含 Story 12.1（小程序工程初始化）、12.2（微信登录前端）、12.3（后端微信登录接口）、12.4（辅导员小程序登录）。

**NEW：**
- Story 12.1 → 跨 Epic 通用实现任务「微信小程序工程初始化」。
- Story 12.2 → 并入 Epic 1 Story 1.6 的前端验收标准。
- Story 12.3 → 并入 Epic 1 Story 1.6 的后端验收标准。
- Story 12.4 → 并入 Epic 1 作为新 Story 1.7，或并入 Epic 8 辅导员首页。

### 4.2 Epic 14 解散

**OLD：** Epic 14 作为独立 Epic，含 Story 14.1（Next.js 工程初始化与鉴权）、14.2（Web 后台布局与导航）。

**NEW：**
- Story 14.1 → 跨 Epic 通用实现任务「管理员 Web 公共基座」。
- Story 14.2 → 通用布局组件下沉为公共基座；各模块页面分别并入 Epic 2.3、Epic 3（管理员侧）、Epic 9、Epic 10、Epic 14（运维仪表盘）的验收标准。

### 4.3 Epic 13 拆分

**OLD：** Epic 13「运维可见性与数据保护」混合技术任务（13.1 备份、13.2 日志轮转）和用户价值任务（13.3 运维 API、13.4 仪表盘），且 13.4 归属 Expo App。

**NEW：**
- **Epic 13：数据保护与运维基础**（技术）
  - Story 13.1：数据库每日备份
  - Story 13.2：日志轮转与生产落盘
  - Story 13.3：后端运维 API
- **Epic 14：运维仪表盘**（管理员 Web 价值）
  - Story 14.1：管理员 Web 运维仪表盘（调用 ops API，展示服务健康/系统资源/备份记录/错误日志）

### 4.4 Architecture Spine 更新

**Stack 表：**
- 将「React Native — admin client only (V1)」改为「React Native + Expo — 已废弃的管理员 App，仅参考保留」。
- 将「Web Admin Dashboard — V2 deferred」改为「Next.js Web Admin Dashboard — 管理员客户端（V1）」。

**Structural Seed：**
- 新增 `web/` 目录说明（Next.js App Router、管理员路由组、services/ API 客户端）。
- 将 `mobile/` 说明从「admin client only (V1)」改为「已废弃，仅参考保留」。

**Capability Map：**
- 管理员登录/鉴权从 `mobile/app/services` 改为 `web/`。

**ER 图：**
- 移除 `LEADERBOARD_ENTRY` 持久化表，注释说明班级排行榜按 AD-16 按需计算。

### 4.5 EXPERIENCE.md 更新

**Form-Factor：**
- 明确学生/辅导员端为微信小程序，管理员端为桌面 Web 浏览器。
- 调整「不支持的形态」表述。

**UI System：**
- 区分小程序侧（微信原生组件、echarts-for-weixin、iconfont）与 Web 侧（Next.js App Router、Recharts、Lucide React）。

**管理员导航结构：**
- 统一为侧边栏入口：概览 / 任务 / 名言 / 组织 / 用户 / 报表 / 运维。
- 明确二级页面映射（如「组织」下含学院列表、班级列表）。

**新增地理围栏配置页面 UX：**
- 地图选点 + 半径输入 + 作用域选择 + 围栏列表。
- 坐标统一 gcj02，半径 50–5000 米。

### 4.6 DESIGN.md 更新

- 视觉方向从「清新教育风（青色+绿色）」改为「极简克制（蓝色强调色 + true off-white + 细边框）」。
- 技术栈从「React Native（Expo）+ Next.js Web 后台」改为「微信小程序（学生/辅导员）+ Next.js Web 后台（管理员）」。
- 颜色 tokens 与项目根目录 `DESIGN.md` 对齐。

### 4.7 补齐管理员 Web MVP 实现

| 模块 | 需完成工作 |
|------|-----------|
| **组织管理** | 学院/班级 CRUD，班级关联学院，删除前检查学生。 |
| **用户管理** | 用户列表、单条添加、Excel/CSV 批量导入、角色与班级/学院分配、启用/禁用账号。 |
| **报表统计** | 按全校/学院/班级/时间段查看打卡率、未打卡人数、心得提交数、AI 初审通过率、人工复核数；图表展示。 |
| **报告导出** | Excel/PDF 导出，PDF 含封面、摘要、趋势图、排名图、明细表。 |
| **地理围栏** | Web 配置 UI（见 4.5），连接后端 `checkins` 域。 |
| **通知中心** | Web 通知列表、未读红点、系统通知/任务发布/账号状态变更分类展示。 |
| **运维仪表盘** | 将 `web/app/(admin)/operations/page.tsx` 从操作日志改为四区运维面板（服务健康、系统资源、备份记录、错误日志）。 |

### 4.8 文档同步项

- **epics.md**：更新 Epic 列表、概述、需求覆盖映射（补 FR-32）、跨 Epic 通用实现任务、修订记录。
- **prd.md**：NFR-16 描述同步为 PRD 表述。
- **Story AC**：补充 NFR 量化验收标准（加载时间、响应时间、密码加密、热区、对比度等）。
- **deferred-work.md**：登记人脸识别 V2、P3 自托管富媒体 V2（已砍，仅记录）。

---

## Section 5：Implementation Handoff

### 5.1 变更范围分类

**Major**：涉及 Epic 结构重组、多产物更新、Web 端大量实现工作。

### 5.2 实施顺序建议

1. **文档同步**（低耦合、高优先级）
   - 更新 `epics.md`、`ARCHITECTURE-SPINE.md`、`EXPERIENCE.md`、`DESIGN.md`。
2. **Web 公共基座**
   - 接入真实 JWT 鉴权、统一 API 客户端、错误处理、加载态。
3. **后端 API 补齐**
   - 组织/用户/报表/通知/ops 域按需完善。
4. **Web 端 MVP 功能实现**
   - 组织管理 → 用户管理 → 报表统计/导出 → 地理围栏配置 → 通知中心 → 运维仪表盘。
5. **学生/辅导员端并行推进**
   - Epic 4/5/8 不受影响，可继续。

### 5.3 角色分工

| 角色 | 职责 |
|------|------|
| **Product Manager / Architect** | 监督 Epic 结构重组、Architecture/UX 文档更新、MVP 优先级确认。 |
| **Developer agent** | 执行 Web 公共基座、后端 API 补齐、Web 端各模块实现、文档小修。 |
| **Product Owner** | 确认导航结构、字段细节、导出模板、通知类型等业务规则。 |

### 5.4 成功标准

- [ ] Epic 12 / Epic 14 不再作为独立 Epic 存在。
- [ ] Epic 13 拆分为「数据保护」和「运维仪表盘」。
- [ ] `ARCHITECTURE-SPINE.md` 的 Stack/Structural Seed/Capability Map/ER 图与最新决策一致。
- [ ] `EXPERIENCE.md` 支持管理员 Web 端，导航结构与 Epics 一致。
- [ ] `DESIGN.md` 与项目根目录设计方向一致。
- [ ] `web/` 所有页面从 mock 数据切换到真实 API。
- [ ] 管理员可完成组织管理、用户管理、报表查看/导出、地理围栏配置、通知查看、运维监控。
- [ ] 运维仪表盘展示服务健康、系统资源、备份记录、错误日志，而非操作日志。

---

## 审批

- [ ] Epic 12 / Epic 14 解散
- [ ] Epic 13 拆分、新增 Epic 14 运维仪表盘
- [ ] Architecture Spine 更新
- [ ] UX 文档更新与导航统一
- [ ] DESIGN.md 视觉方向同步
- [ ] 管理员 Web MVP 缺口补齐
- [ ] 文档同步项（NFR AC、FR-32 映射、deferred-work）

---

## 修订记录

| 版本 | 日期 | 内容 |
|------|------|------|
| 1.0 | 2026-06-24 | 初版：基于 IR 报告生成，处理 Epic 结构、UX 同步、Web MVP 缺口 |
