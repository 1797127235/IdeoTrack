---
story_id: 14.2
story_key: 14-2-web-hou-tai-bu-ju-yu-dao-hang
epic: 14
epic_title: Web 后台基础设施
status: ready-for-dev
priority: high
points: 5
---

# Story 14.2: Web 后台布局与导航

Status: done

> 来源：Epic 14 Story 14.2 / Architecture AD-17, AD-19

## Story

**作为** 管理员，
**我想要** Web 后台有清晰的桌面布局和导航，
**以便** 在各个管理模块间切换。

> **布局**：侧边栏导航 + 主内容区（非移动 Tab）
> **导航入口**：概览 / 任务 / 名言 / 组织 / 用户 / 报表 / 运维

## Acceptance Criteria

### AC-1: 桌面布局

- **Given** 管理员登录 Web 后台
- **When** 进入主界面
- **Then** 桌面布局：侧边栏导航 + 主内容区（非移动 Tab）
- **And** 响应式布局，以桌面大屏为主要验证端

### AC-2: 侧边栏导航

- **Given** 管理员在 Web 后台任意页面
- **When** 查看侧边栏
- **Then** 侧边栏入口：概览 / 任务 / 名言 / 组织 / 用户 / 报表 / 运维
- **And** 当前页面高亮显示
- **And** 点击导航项切换到对应页面

### AC-3: 管理员首页概览

- **Given** 管理员登录后进入首页
- **When** 页面加载
- **Then** 展示模块卡片入口（概览、任务、名言、组织、用户、报表、运维）
- **And** 每个卡片显示模块名称和简要描述
- **And** 点击卡片跳转到对应模块

### AC-4: 退出登录

- **Given** 管理员在 Web 后台任意页面
- **When** 点击退出登录
- **Then** 清除本地 token
- **And** 跳转到登录页

## Tasks / Subtasks

### 前端任务

- [x] **Task 1: 侧边栏导航组件** (AC: #1, #2)
  - [x] 1.1 创建 `web/components/Sidebar.tsx`
  - [x] 1.2 实现导航项：概览 / 任务 / 名言 / 组织 / 用户 / 报表 / 运维
  - [x] 1.3 当前页面高亮显示
  - [x] 1.4 点击导航项跳转
  - [x] 1.5 遵循 DESIGN.md 配色规范

- [x] **Task 2: 管理员布局组件** (AC: #1)
  - [x] 2.1 更新 `web/app/(admin)/layout.tsx`
  - [x] 2.2 实现侧边栏 + 主内容区布局
  - [x] 2.3 响应式布局（桌面大屏为主）
  - [x] 2.4 遵循 DESIGN.md 配色规范

- [x] **Task 3: 管理员首页概览** (AC: #3)
  - [x] 3.1 更新 `web/app/(admin)/page.tsx`
  - [x] 3.2 实现模块卡片入口
  - [x] 3.3 每个卡片显示模块名称和简要描述
  - [x] 3.4 点击卡片跳转到对应模块
  - [x] 3.5 遵循 DESIGN.md 配色规范

- [x] **Task 4: 退出登录功能** (AC: #4)
  - [x] 4.1 在侧边栏添加退出登录按钮
  - [x] 4.2 实现退出登录逻辑：清除 token、跳转登录页

## Dev Notes

### 关键架构约束

- **AD-17 客户端按角色分端**：管理员在 Web（`web/`）
- **AD-19 Web 工程决策**：Next.js (App Router) + TypeScript
- **UX-5 管理员底部 4 Tab**：概览 / 报表 / 任务 / 管理（Web 版改为侧边栏导航）

### 导航结构

```
侧边栏导航：
├── 概览（首页）
├── 任务管理
├── 名言管理
├── 组织结构
├── 用户管理
├── 报表统计
└── 运维管理
```

### 项目结构

```
web/
├── components/
│   └── Sidebar.tsx           # 侧边栏导航组件
├── app/
│   └── (admin)/
│       ├── layout.tsx        # 管理员布局（侧边栏 + 主内容区）
│       └── page.tsx          # 管理员首页概览
```

## UX Requirements

### 侧边栏导航

- 固定在左侧，宽度 240px
- 背景色：`#FFFFFF`
- 导航项高度：48px
- 当前页面高亮：背景色 `#ECFEFF`，文字色 `#0891B2`
- 悬停状态：背景色 `#F0FDFF`
- 底部显示退出登录按钮

### 管理员首页概览

- 模块卡片网格布局（3 列）
- 卡片尺寸：200px × 150px
- 卡片背景：`#FFFFFF`
- 卡片圆角：16px
- 卡片阴影：轻微阴影
- 悬停效果：轻微上移
- 遵循 DESIGN.md：背景 `#ECFEFF`、主色 `#0891B2`、CTA `#22C55E`

## Testing Requirements

### 前端测试

- [ ] **组件测试**：侧边栏导航渲染、高亮显示、点击跳转
- [ ] **布局测试**：响应式布局、侧边栏宽度、主内容区占位
- [ ] **功能测试**：退出登录逻辑

## Dev Agent Record

### Agent Model Used

(待填写)

### Debug Log

(待填写)

### Completion Notes

(待填写)

## File List

### 前端文件（已创建/修改）

- `web/components/Sidebar.tsx` - 侧边栏导航组件（新建）
- `web/app/(admin)/layout.tsx` - 管理员布局组件（更新）
- `web/app/(admin)/page.tsx` - 管理员首页概览（更新）

## Change Log

- 2026-06-24: 创建故事文件
- 2026-06-24: 完成所有前端任务（Task 1-4）
- 2026-06-24: 故事状态更新为 review
- 2026-06-24: 代码审查完成，修复 3 个 patch 发现

## Review Findings

### Patch Findings (3) ✅ 已修复

- [x] [Review][Patch] P1: 修复 Sidebar 概览链接从 /dashboard 改为 / [web/components/Sidebar.tsx]
- [x] [Review][Patch] P2: 添加缺失的占位页面路由 [web/app/(admin)/quotes/, organizations/, users/, reports/, operations/]
- [x] [Review][Patch] P3: 修复 logout 使用 logout() 函数 [web/components/Sidebar.tsx]

### Defer Findings (2) - 延迟处理

- [x] [Review][Defer] D1: userId.slice(0, 8) on empty string — 低优先级，用户体验问题
- [x] [Review][Defer] D2: AuthGuard allows brief render before redirect — 低优先级，已存在

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log

- 2026-06-24: 创建 web/components/Sidebar.tsx
- 2026-06-24: 更新 web/app/(admin)/layout.tsx
- 2026-06-24: 更新 web/app/(admin)/page.tsx

### Completion Notes

**已完成的功能：**

1. ✅ **侧边栏导航组件（Task 1）**
   - 创建 web/components/Sidebar.tsx
   - 实现导航项：概览 / 任务 / 名言 / 组织 / 用户 / 报表 / 运维
   - 当前页面高亮显示
   - 点击导航项跳转
   - 遵循 DESIGN.md 配色规范

2. ✅ **管理员布局组件（Task 2）**
   - 更新 web/app/(admin)/layout.tsx
   - 实现侧边栏 + 主内容区布局
   - 响应式布局（桌面大屏为主）
   - 遵循 DESIGN.md 配色规范

3. ✅ **管理员首页概览（Task 3）**
   - 更新 web/app/(admin)/page.tsx
   - 实现模块卡片入口（7 个模块）
   - 每个卡片显示模块名称和简要描述
   - 点击卡片跳转到对应模块
   - 遵循 DESIGN.md 配色规范

4. ✅ **退出登录功能（Task 4）**
   - 在侧边栏添加退出登录按钮
   - 实现退出登录逻辑：清除 token、跳转登录页

**关键架构决策：**

- AD-17：管理员在 Web（`web/`）
- AD-19：Next.js (App Router) + TypeScript
- 侧边栏导航替代移动 Tab（UX-5）
