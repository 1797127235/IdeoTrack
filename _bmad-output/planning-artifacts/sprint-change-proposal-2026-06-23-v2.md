---
title: Sprint Change Proposal — 辅导员端迁入微信小程序，管理员端保留 App + Web V2
status: approved
created: 2026-06-23
trigger: 用户确认「学生 + 辅导员使用微信小程序；管理员 V1 使用 Expo App，V2 补充 Web 后台」
scope_classification: Major
affected_artifacts:
  - ARCHITECTURE-SPINE.md
  - prd.md
  - epics.md
  - ux-designs/EXPERIENCE.md
  - sprint-status.yaml
---

# Sprint Change Proposal：辅导员端迁入微信小程序

## Section 1：Issue Summary（问题陈述）

### 触发背景

在 2026-06-23 的 Sprint Change Proposal v1 中，已决定将**学生端**拆分为原生微信小程序（`miniprogram/`），辅导员/管理员端保留 Expo App（`mobile/`）。

经用户再次确认，希望进一步调整：

- **学生 + 辅导员**均使用**微信小程序**（`miniprogram/`）。
- **管理员**在 V1 继续使用 **Expo App**（`mobile/`），V2 再补充 **Web 后台**。

### 核心问题

原 v1 方案将辅导员保留在 Expo App，主要出于导出功能（Excel/PDF）对微信文件沙箱的顾虑。但用户认为辅导员日常查看班级数据、复核心得、一键提醒等高频操作在微信小程序中更为便捷；导出功能可通过「后端生成临时下载链接 → 复制到浏览器下载」绕过小程序沙箱限制。管理员因涉及复杂报表、批量导入、全校级管理，仍由 App 承载更合适，Web 后台作为 V2 增强。

### 证据

1. 用户明确决策：「辅导员和学生用小程序，管理员使用 app 最好支持 web？」。
2. 辅导员核心场景（看板、复核、提醒）以查看和轻操作为主，小程序足够承载。
3. 导出场景已在 v1 方案中识别为可通过后端临时链接方案解决。
4. 管理员场景（批量 Excel 导入、多维度统计、PDF/Excel 报告）在大屏和复杂表单上 App/Web 优于小程序。
5. 后端 API 平台无关，本次调整只影响前端归属，后端无需返工。

---

## Section 2：Impact Analysis（影响分析）

### 2.1 决策矩阵

| 决策项 | V1 选择 | V2 选择 | 理由 |
|--------|---------|---------|------|
| 学生端 | 原生微信小程序 | 原生微信小程序 | 已决策，高频轻交互 |
| 辅导员端 | 原生微信小程序 | 原生微信小程序 | 查看/复核/提醒为主，微信触达高 |
| 管理员端 | Expo App（`mobile/`） | Web 后台（V2）+ 可保留 App | 复杂报表、批量导入、大屏管理 |
| 辅导员登录 | 小程序内工号 + 密码 | 小程序内工号 + 密码 | 延续现有账号体系，不强制绑定个人微信 |
| 管理员登录 | Expo App 账号 + 密码 | Web 后台账号 + 密码（V2） | 延续现有账号体系 |
| 辅导员导出 | 后端临时链接 → 复制浏览器下载 | 后端临时链接 → 复制浏览器下载 | 小程序文件沙箱限制 |
| 管理员导出 | Expo App 内下载 | Web 后台下载（V2） | App 内文件下载更自然 |
| 学生通知 | 微信订阅消息 | 微信订阅消息 | 平台原生 |
| 辅导员通知 | 小程序订阅消息 / 服务通知 | 小程序订阅消息 / 服务通知 | 辅导员在小程序内 |
| 管理员通知 | App 内通知中心 | Web 站内通知（V2） | 管理员在 App/Web 内 |

### 2.2 Epic / Story 影响矩阵

| Epic | 后端 | 学生小程序 | 辅导员小程序 | 管理员 App |
|------|------|-----------|-------------|-----------|
| 1 认证 | 不变 | ✅ 微信登录+绑定（1.6） | ✅ 工号密码登录 | ✅ 账号密码登录 |
| 2 名言 | 不变 | ✅ 展示 | — | ✅ 名言库管理 |
| 3 任务 | 不变 | ✅ 列表/详情/打卡 | ✅ 发布班级任务 | ✅ 发布全校/学院任务 |
| 4 打卡 | 不变 | ✅ 定位+心得 | — | — |
| 5 审核 | 不变 | ✅ 查结果 | ✅ 辅导员复核（5.3） | — |
| 6 激励 | 不变 | ✅ 打卡日历（6.4） | — | — |
| 7 排行 | 不变 | —（V2 班级榜） | — | — |
| 8 看板 | 不变 | — | ✅ 看板/名单/提醒/导出 | — |
| 9 组织用户 | 不变 | — | — | ✅ 学院/班级/用户管理 |
| 10 报表 | 不变 | — | — | ✅ 统计/导出 |
| 11 通知 | 补辅导员小程序通知 | ✅ 订阅消息 | ✅ 订阅/服务通知 | ✅ App 内通知 |
| 12 小程序基础设施 | 已就绪 | 已就绪 | **需扩展** | — |

### 2.3 Artifact 冲突

| 产物 | 冲突点 | 需要的更新 |
|------|--------|-----------|
| `ARCHITECTURE-SPINE.md` | AD-17 仍写「辅导员 + 管理员 Expo App」 | 更新 AD-17：学生/辅导员 → 小程序；管理员 → App/Web V2 |
| `prd.md` | FR-1 登录描述；§9.6 兼容性；Open Question 10 | 更新三端登录描述、兼容性说明 |
| `epics.md` | 概述、AD-17 行、Epic 12 名称/范围、各 Story 归属端 | 更新分端归属；Epic 12 扩展为「学生 + 辅导员小程序基础设施」 |
| `ux-designs/EXPERIENCE.md` | UX-4 辅导员 3 Tab 为 App 设计 | 补充辅导员小程序版导航与页面规范 |
| `sprint-status.yaml` | 无辅导员小程序专项条目 | 增加备注/标签，标识辅导员侧 story 需在小程序实现 |

### 2.4 技术影响

- **后端**：无需改动，API 已平台无关。
- **小程序（miniprogram/）**：
  - 新增辅导员角色入口与底部 Tab（看板 / 复核 / 我的）。
  - 新增辅导员页面：班级数据概览、未打卡名单、一键提醒、数据导出、心得复核。
  - 任务发布页需支持辅导员发布班级任务。
  - 登录页需按角色分流：学生微信登录 / 辅导员工号密码登录。
- **Expo App（mobile/）**：
  - 移除辅导员路由与视图（或标记为 deprecated），保留管理员路由。
  - 学生路由组已停止维护，可继续作为设计参考。
- **Web 后台**：V2 再立项，V1 不实现。

---

## Section 3：Recommended Approach（推荐路径）

### 选择：Option 1 — Direct Adjustment（直接调整）

**理由**：

- 后端完全复用，零返工。
- 小程序基础设施（Epic 12）已完成，只需扩展辅导员侧页面。
- 不需要回滚已完成的学生签到（Story 4.1）等代码。
- 将辅导员从 Expo App 迁出后，App 代码只保留管理员，结构更清晰。

**工作量估算**：

- 文档更新（PRD/Architecture/Epics/UX/Sprint Status）：0.5 天
- 辅导员小程序基础设施（登录分流、角色导航、TabBar）：1 天
- 辅导员看板（Epic 8）小程序实现：2-3 天
- 辅导员复核（Story 5.3）小程序实现：1-2 天
- 任务发布辅导员侧（Epic 3）小程序实现：1-2 天
- 导出临时链接方案（后端 + 小程序复制链路）：1 天
- 移除/清理 Expo App 中辅导员相关路由：0.5 天

**风险评估**：Medium

- 主要风险：小程序内辅导员操作表单和列表的交互体验需仔细设计。
- 次要风险：导出临时链接方案依赖用户手动复制到浏览器，需明确 UX 提示。
- 技术风险低：后端复用，已有学生小程序基础。

**时间线影响**：

- Epic 8 及 Story 5.3 的实现端从 `mobile/` 改为 `miniprogram/`，工作量略有增加。
- Epic 3 辅导员发布任务需在小程序补页面。
- 原计划 Epic 4-11 的时序不变，但部分 story 的实现位置调整。

---

## Section 4：Detailed Change Proposals（详细变更提案）

### 4.1 Architecture（ARCHITECTURE-SPINE.md）

**变更 1：更新 AD-17**

```markdown
### AD-17 — Clients are deployed per-role (multi-end)

- **Binds:** All clients, login flows, notification delivery
- **Prevents:** Forcing high-frequency student check-in scenarios onto a heavyweight App install; letting the WeChat file sandbox compromise export features
- **Rule:** Clients are deployed per role:
  - **Student client** → WeChat Mini Program (native development, located at `miniprogram/`)
  - **Counselor client** → WeChat Mini Program (native development, located at `miniprogram/`, role-routed into counselor views)
  - **Admin client** → React Native + Expo App in V1 (located at `mobile/`), Web Admin Dashboard in V2

  Deployment boundaries follow these constraints:
  - Students log in via WeChat login (`wx.login` + first-time student-ID binding).
  - Counselors log in via staff-ID + password inside the Mini Program.
  - Admins log in via account + password inside the Expo App (V1) or Web Dashboard (V2).
  - All three flows reuse the existing JWT system (AD-4).
  - Counselor exports (FR-24) are generated on the backend and returned as temporary download links; the user copies the link to a browser to download, bypassing the WeChat Mini Program file sandbox.
  - Admin exports (FR-28) run natively in the Expo App (V1) and in the Web Dashboard (V2).
  - Student notifications use WeChat subscribe messages; counselor notifications use Mini Program subscribe/service messages; admin notifications use in-App notifications (V1) or Web notifications (V2).
  - The backend API is fully platform-agnostic; all ends share the same REST interface.
```

**变更 2：更新 Stack 表**

```markdown
| React Native | 0.85 (via Expo SDK 56) — admin client only (V1) |
| 微信小程序原生 (WeChat Mini Program) | base library 3.x — student + counselor client |
| Web Admin Dashboard | V2 deferred |
```

**变更 3：更新 Structural Seed**

在 `miniprogram/` 结构下新增辅导员目录：

```text
miniprogram/
├── pages/
│   ├── auth/                   # 登录分流（学生微信登录 / 辅导员工号密码）
│   ├── student/                # 学生端页面（home / task / checkin / calendar / profile）
│   └── counselor/              # 辅导员端页面
│       ├── dashboard/          # 班级数据概览
│       ├── review/             # 心得复核列表与详情
│       ├── absentees/          # 未打卡学生名单 + 一键提醒
│       ├── export/             # 数据导出（临时链接）
│       └── task-publish/       # 发布班级任务
├── components/
├── services/                   # wx.request 封装
└── app.json
```

### 4.2 PRD（prd.md）

**变更 1：FR-1 用户登录**

OLD:

```markdown
- 学生通过微信小程序登录（`wx.login` 获取 openid，首次登录需绑定学号验证身份）。
- 辅导员和管理员通过 Expo App 使用工号/账号 + 密码登录。
```

NEW:

```markdown
- 学生通过微信小程序登录（`wx.login` 获取 openid，首次登录需绑定学号验证身份）。
- 辅导员通过微信小程序使用工号 + 密码登录。
- 管理员通过 Expo App（V1）或 Web 后台（V2）使用账号 + 密码登录。
```

**变更 2：FR-1 Consequences**

更新「辅导员/管理员输入正确的账号密码后，系统返回对应角色的首页」为：

- 辅导员在微信小程序输入工号密码后，进入辅导员看板首页。
- 管理员在 Expo App 输入账号密码后，进入管理员首页。

**变更 3：§9.6 Compatibility**

OLD:

```markdown
- 学生端为微信小程序，支持微信基础库 3.x 及以上。
- 辅导员端和管理员端为 React Native + Expo App，优先支持 Android 端，跨平台框架同时覆盖 iOS，以 Android 为主要验证端。
```

NEW:

```markdown
- 学生端和辅导员端为微信小程序，支持微信基础库 3.x 及以上。
- 管理员端 V1 为 React Native + Expo App，优先支持 Android 端，跨平台框架同时覆盖 iOS，以 Android 为主要验证端；V2 补充 Web 后台。
```

**变更 4：Open Question 10**

更新为反映最新分端决策。

### 4.3 Epics（epics.md）

**变更 1：概述与范围说明**

OLD:

```markdown
> **范围**：V1 MVP，覆盖学生（微信小程序）、辅导员和管理员（Expo App）三端。
> **分端策略**（AD-17）：学生端为微信小程序（`miniprogram/`），辅导员/管理员端为 Expo App（`mobile/`）。
```

NEW:

```markdown
> **范围**：V1 MVP，覆盖学生（微信小程序）、辅导员（微信小程序）、管理员（Expo App）三端；管理员 Web 后台推迟到 V2。
> **分端策略**（AD-17）：学生端和辅导员端为微信小程序（`miniprogram/`），管理员端 V1 为 Expo App（`mobile/`），V2 补充 Web 后台。
```

**变更 2：AD-17 行**

更新 AD-17 描述行。

**变更 3：Epic 12 名称与目标**

OLD:

```markdown
## Epic 12：微信小程序基础设施（学生端）

**目标**：搭建学生端微信小程序的技术骨架，为 Epic 1-7、11 的学生侧功能提供运行基础。
**归属端**：学生小程序（`miniprogram/`）+ 后端 `auth` 域
```

NEW:

```markdown
## Epic 12：微信小程序基础设施（学生端 + 辅导员端）

**目标**：搭建微信小程序的技术骨架，按角色为学生和辅导员提供不同的入口与导航，支撑 Epic 1-8、11 的小程序侧功能。
**归属端**：学生 + 辅导员小程序（`miniprogram/`）+ 后端 `auth` 域
```

**变更 4：各 Story 归属端标注**

- Story 1.6：学生小程序
- Story 3.1/3.2：管理员 App + 辅导员小程序
- Story 5.3：辅导员小程序
- Story 8.1/8.2/8.3/8.4：辅导员小程序
- Story 11.2：辅导员小程序通知

### 4.4 UX Design（EXPERIENCE.md）

**变更 1：新增辅导员小程序导航规范**

- 辅导员底部 3 Tab：看板 / 复核 / 我的
- 顶部角色切换/退出入口由小程序右上角菜单承载
- 导出页提供「复制下载链接」按钮 + 操作指引

**变更 2：更新 UX-4**

UX-4 描述保留 App 版辅导员 Tab，新增小程序版说明。

### 4.5 Sprint Status（sprint-status.yaml）

- 在辅导员相关 story（5.3、8.1-8.4、3.x 辅导员侧）增加 `client: miniprogram` 标签或注释。
- 管理员相关 story（9.x、10.x）保留 `client: mobile` 标签或注释。

---

## Section 5：Implementation Handoff（实施交接）

### 5.1 变更范围分类：Major

涉及 PRD、Architecture、Epics、UX、Sprint Status 五份核心产物更新，并改变辅导员侧实现端。但后端零改动，技术风险可控。

### 5.2 用户前置事项

| 事项 | 说明 | 紧迫度 |
|------|------|--------|
| 确认辅导员微信小程序登录方式 | 工号 + 密码（不强制微信绑定） | 🟡 写代码前 |
| 确认辅导员导出临时链接 UX | 复制链接 → 浏览器下载 | 🟡 写代码前 |
| 管理员 Web 后台需求优先级 | V2 再评估 | 🟢 暂不阻塞 |

### 5.3 实施顺序（建议）

1. [文档更新] 应用本 Proposal 的所有产物变更。
2. [小程序] 扩展 `miniprogram/`：角色分流登录、辅导员 TabBar、空页面骨架。
3. [后端] 实现导出临时链接生成接口（供辅导员/管理员复用）。
4. [小程序] 实现辅导员看板（Epic 8）与复核（Story 5.3）。
5. [小程序] 实现辅导员任务发布（Epic 3 辅导员侧）。
6. [App] 清理 Expo App 中辅导员相关路由与视图，保留管理员功能。

### 5.4 成功标准

- PRD/Architecture/Epics/UX 均反映「学生 + 辅导员小程序；管理员 App/Web V2」策略。
- `miniprogram/` 能根据登录角色进入学生或辅导员首页。
- 辅导员可在小程序完成班级数据概览、未打卡名单、一键提醒、数据导出、心得复核。
- 管理员仍在 Expo App 中完成组织管理、任务发布、统计报表、报告导出。
- 已移除/隔离 Expo App 中的辅导员代码，避免维护两份实现。

---

## 审批

- [x] 用户最终审批（Step 5）
