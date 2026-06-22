---
title: Sprint Change Proposal — 客户端分端策略
status: approved
created: 2026-06-23
trigger: 客户端按角色分端（学生微信小程序 / 辅导员+管理员 Expo App）
scope_classification: Major
affected_artifacts:
  - ARCHITECTURE-SPINE.md
  - prd.md
  - epics.md
  - sprint-status.yaml
---

# Sprint Change Proposal：客户端分端策略

## Section 1：Issue Summary（问题陈述）

### 触发背景

Epic 3（任务管理）收口后，重新审视客户端分发策略。原 PRD/架构默认三端
共用一个 React Native + Expo App，但在实际评估中发现：

- **学生场景**：高频、轻交互（看任务/签到/交心得/看排行），微信生态触达率
  最高，无需安装、扫码即用，小程序天然适配。
- **辅导员/管理员场景**：教职工人数少，含重操作（批量导入 Excel、PDF/Excel
  导出、全校统计大屏），App 体验更合适；其中导出功能因微信文件沙箱限制无法
  在小程序实现。

### 核心问题

将三端功能全部塞进单一 Expo App，对学生端而言承担了不必要的安装成本，
对导出/报表场景在小程序端又无法满足。需要按角色分端，让每个端聚焦最合适的
场景。

### 证据

1. 微信小程序对学生场景的适配性分析（高频、轻交互、微信内传播）。
2. 微信文件沙箱限制：wx.downloadFile 仅能存到小程序临时目录，无法持久保存/
   转发，导出 Excel/PDF 体验差。
3. 现有架构（API + Supabase）后端完全平台无关，分端只影响前端，后端零返工。
4. 一人开发约束：功能做完再分端会导致学生端 UI 全部重写，重复劳动成本高。

---

## Section 2：Impact Analysis（影响分析）

### 2.1 决策矩阵（已与用户逐项确认）

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 学生端技术栈 | 原生微信小程序 | 性能最佳、限制最少、审核简单 |
| 学生登录方式 | 微信登录 + 首次绑定学号 | 符合微信场景，免密体验好 |
| 辅导员端 | 全程用 Expo App | 教职工人数少、装 App 可接受、导出体验一致 |
| 管理员端 | 保留 Expo App | 复用现有代码，无需新增 Web 栈 |
| 仓库结构 | 并列目录 miniprogram/ | 结构简单，一人开发够用 |
| 分端启动时机 | 现在就分端（Epic 4 起）| 避免学生端 UI 重复重写 |
| 辅导员导出 | 放 Expo App | 小程序文件沙箱限制 |
| 通知推送 | 微信订阅消息（学生）/ App 内通知（辅导员管理员）| 平台适配 |
| 管理端形态 | 保留 Expo App（V2 再考虑 Web）| 复用现有，一人开发 |

### 2.2 Epic 影响矩阵

| Epic | 后端 | 学生小程序 | Expo App（辅导员+管理员）|
|------|------|-----------|------------------------|
| 1 认证 | +openid 绑定接口 | ✅微信登录 | ✅账号密码（已有）|
| 2 名言 | 不变 | ✅展示 | ✅名言库管理（已有）|
| 3 任务 | 不变 | ✅列表/详情 | ✅发布管理（已有）|
| 4 打卡 | 不变 | ✅定位+心得 | — |
| 5 审核 | 不变 | ✅查结果 | ✅辅导员复核 |
| 6 积分 | 不变 | ✅展示 | — |
| 7 排行 | 不变 | ✅展示 | — |
| 8 看板 | 不变 | — | ✅看板/名单/提醒/导出 |
| 9 组织用户 | 不变 | — | ✅批量导入 |
| 10 报表 | 不变 | — | ✅统计/导出 |
| 11 通知 | +订阅消息推送 | ✅收通知（订阅消息）| ✅收通知（App 内）|
| **12 小程序基础设施（新增）** | +wechat 接口 | ✅工程骨架+登录 | — |

### 2.3 Artifact 冲突

| 产物 | 冲突点 | 需要的更新 |
|------|--------|-----------|
| ARCHITECTURE-SPINE.md | 缺分端不变量；Stack 表无小程序；Structural Seed 无 miniprogram/ | 新增 AD-17；更新 Stack 表；更新 Structural Seed |
| prd.md | FR-1 登录描述三端统一；FR-9 定位用 expo API；§9.6 兼容性只提 Android | 更新 FR-1/FR-9/§9.6；§5.2 补微信生态 Out of Scope；更新 Q10 |
| epics.md | 无 Epic 1.6 微信登录；无 Epic 12 小程序基础设施；Epic 11 未分端 | 新增 Story 1.6；新增 Epic 12（3 stories）；Epic 11 补分端说明 |
| sprint-status.yaml | 无 Epic 12 条目 | 新增 epic-12 及 12.1/12.2/12.3 条目 |

### 2.4 技术影响

- **后端**：auth 域新增 2 个接口（wechat/login、wechat/bind），users 表加
  wechat_openid 字段；notification 域接入微信订阅消息推送。约 1-2 天工作量。
- **前端-小程序**：从零搭建，但 services 层和类型定义可高度复用 mobile/services
  的现有代码。组件 UI 用 WXML 重写，可参考现有 RN 组件逻辑。
- **前端-App**：现有 (admin)/(counselor)/(auth) 路由组全部保留复用，
  (student) 路由组停止维护（学生端迁移到小程序），可保留作为设计参考。
- **部署**：API 和 Supabase 不变；小程序需在微信公众平台注册、配置业务域名
  白名单（API 域名需 ICP 备案 + HTTPS）。

---

## Section 3：Recommended Approach（推荐路径）

### 选择：Option 1 — Direct Adjustment（直接调整）

**理由**：
- 后端 API 平台无关，分端不破坏任何已完成工作。
- Epic 1/2/3 已完成的 App 学生端代码作为设计参考保留，不删除。
- 现在就分端（Epic 4 起）避免学生端 UI 重复重写，对一人开发最优。
- 不需要回滚任何已完成 story。

**工作量估算**：
- 小程序基础设施（Epic 12）：2-3 天（含后端 wechat 接口）
- 学生端各 Epic 小程序实现：每个 Epic 学生侧约 1-3 天
- 后端微信登录 + 订阅消息接入：1-2 天

**风险评估**：Low
- 主要风险是微信小程序注册/备案/审核流程（非技术风险），建议尽早启动。
- 技术风险低：后端复用，前端有现有 RN 代码作参考。

**时间线影响**：原 Epic 4-11 计划不变，新增 Epic 12 插在 Epic 4 之前。
学生端功能在 Epic 4-7、11 的小程序侧实现，不增加额外 Epic。

---

## Section 4：Detailed Change Proposals（详细变更提案）

### 4.1 Architecture（ARCHITECTURE-SPINE.md）

**变更 1：新增 AD-17**

```markdown
### AD-17 — 客户端按角色分端部署

- **Binds:** 所有客户端、登录流程、通知推送
- **Prevents:** 学生高频打卡场景承担 App 安装成本；
  微信文件沙箱限制影响导出功能
- **Rule:** 客户端按角色分端：
  - 学生端 → 微信小程序（原生开发，位于 `miniprogram/`）
  - 辅导员端 + 管理员端 → React Native + Expo App（位于 `mobile/`，
    复用现有代码，按角色进入不同视图）
  
  分端边界遵循以下约束：
  - 学生登录用微信登录（wx.login + 首次绑定学号验证）；
    辅导员用工号+密码；管理员用账号密码（均保留现有 JWT 体系）
  - 所有文件下载/导出（FR-24 辅导员导出、FR-28 报告导出）
    在 Expo App，不在小程序（微信文件沙箱限制）
  - 学生通知用微信订阅消息；辅导员/管理员通知用 App 内通知
  - 后端 API 完全平台无关，两端共用同一套 REST 接口
```

**变更 2：更新 Stack 表**

```markdown
| React Native | 0.85 (via Expo SDK 56) — 仅辅导员/管理员端 |
| 微信小程序原生 | 基础库 3.x — 学生端 |
```

**变更 3：更新 Structural Seed**

```text
miniprogram/                    # 微信小程序（仅学生端）
├── pages/
│   ├── auth/                   # 微信登录 + 绑定学号
│   ├── home/                   # 首页（名言 + 任务列表）
│   ├── task/                   # 任务详情 + 打卡
│   ├── checkin/                # 定位签到 + 心得提交
│   ├── leaderboard/            # 班级排行榜
│   ├── profile/                # 个人中心（积分/等级/勋章/日历）
│   └── notifications/          # 通知中心
├── components/
├── services/                   # wx.request 封装
└── app.json
```

### 4.2 PRD（prd.md）

**变更 1：FR-1 用户登录** —— 学生微信登录 + 绑定流程描述
**变更 2：FR-9 定位签到** —— 改用 wx.getLocation
**变更 3：§9.6 Compatibility** —— 学生端小程序，辅导员/管理员端 Expo
**变更 4：§5.2 Out of Scope** —— 补微信支付/裂变
**变更 5：Open Question #10** —— 更新分端决策

### 4.3 Epics（epics.md）

**变更 1：概述** —— 12 个 Epic，42 stories，补充分端策略说明
**变更 2：需求覆盖映射** —— 补充 Story 1.6 微信登录
**变更 3：AD 清单** —— 补充 AD-17
**变更 4：Epic 1 新增 Story 1.6** —— 学生微信登录与学号绑定
**变更 5：新增 Epic 12** —— 微信小程序基础设施（3 stories）
  - 12.1 小程序工程初始化
  - 12.2 微信登录与绑定流程（前端）
  - 12.3 后端微信登录接口（后端）
**变更 6：Epic 11 补充分端说明** —— 订阅消息 vs App 内通知

---

## Section 5：Implementation Handoff（实施交接）

### 5.1 变更范围分类：**Major**

涉及 PRD/架构/Epics 三份核心产物的结构性更新，并新增 Epic。但实际
技术风险低（后端复用、前端有参考）。

### 5.2 用户前置事项（非技术，必须用户本人办理）

| 事项 | 说明 | 紧迫度 |
|------|------|--------|
| 注册微信小程序账号 | https://mp.weixin.qq.com/ 拿 AppID | 🔴 阻塞，越早越好 |
| 下载微信开发者工具 | Windows 版安装 | 🟡 写代码前 |
| API 域名 ICP 备案 | 小程序业务域名白名单要求 | 🔴 阻塞上线，可与开发并行 |

### 5.3 实施顺序（建议）

```
1. [文档更新] 应用本 Proposal 的所有产物变更（架构/PRD/Epics/sprint-status）
2. [用户并行] 注册微信小程序拿 AppID + 下载开发者工具
3. [Epic 12] 搭建小程序工程骨架 + 后端 wechat 接口（Story 12.1/12.2/12.3）
4. [Epic 4 起] 学生端功能在小程序实现（定位/心得用 wx.* API）
5. [Epic 8-10] 辅导员/管理员功能继续在 Expo App 推进
```

### 5.4 成功标准

- ARCHITECTURE-SPINE.md 含 AD-17，Stack/Structural Seed 已更新
- prd.md 的 FR-1/FR-9/§9.6 反映分端
- epics.md 含 Epic 1.6 和 Epic 12
- sprint-status.yaml 含 epic-12 及其 3 个 story
- miniprogram/ 工程能在微信开发者工具中编译运行
- 学生能用微信登录完成绑定并进入首页

---

## 审批

- [x] 用户最终审批（Step 5）
- [x] 应用产物变更（Step 6）— 2026-06-23 完成
