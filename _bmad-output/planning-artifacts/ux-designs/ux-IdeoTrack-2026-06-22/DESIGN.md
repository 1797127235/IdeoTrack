---
title: 思政打卡 App 视觉设计规范
status: final
created: 2026-06-22
updated: 2026-06-22
colors:
  primary: '#0891B2'
  primary-light: '#22D3EE'
  primary-dark: '#164E63'
  cta: '#22C55E'
  cta-hover: '#16A34A'
  background: '#ECFEFF'
  surface: '#FFFFFF'
  surface-raised: '#F0FDFF'
  text-primary: '#164E63'
  text-secondary: '#64748B'
  text-disabled: '#94A3B8'
  success: '#22C55E'
  warning: '#F59E0B'
  error: '#EF4444'
  border: '#E2E8F0'
  divider: '#F1F5F9'
typography:
  heading:
    family: "'Noto Sans SC', system-ui, sans-serif"
    weights: '500, 700'
  body:
    family: "'Noto Sans SC', system-ui, sans-serif"
    weights: '400, 500'
  numeric:
    family: "'Inter', 'Noto Sans SC', system-ui, sans-serif"
    weights: '400, 600'
rounded:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 32px
  '8': 40px
---

# 思政打卡 App — DESIGN.md

> 视觉方向：**清新教育风**（青色 + 绿色）
> 技术栈：**React Native（Expo）**
> 状态：ready-for-review

## Brand & Style

思政打卡 App 面向大学生，核心场景是完成学校布置的每日思政学习任务。视觉风格选择「清新教育风」——用明快的青色和积极的绿色降低「任务感」，让打卡从「被迫完成」变成「轻松积累」。

整体气质：**年轻、清爽、有朝气、不严肃**。避免党政 App 常见的沉重红金配色，也避免过度游戏化的花哨元素。通过充足的留白、圆角卡片和微动效，营造干净、可信、有温度的学习体验。

## Colors

### 主色系统

| Token | Hex | 用途 |
|-------|-----|------|
| `primary` | `#0891B2` | 主按钮、导航选中、关键图标、标题强调 |
| `primary-light` | `#22D3EE` | 高亮、装饰元素、渐变终点、进度条 |
| `primary-dark` | `#164E63` | 主文字、深色背景上的文字、重要标题 |
| `cta` | `#22C55E` | 打卡按钮、成功状态、正向反馈 |
| `cta-hover` | `#16A34A` | CTA 按下/悬停状态 |

### 中性色与背景

| Token | Hex | 用途 |
|-------|-----|------|
| `background` | `#ECFEFF` | 页面全局背景，浅青色营造清新感 |
| `surface` | `#FFFFFF` | 卡片、底部导航、输入框背景 |
| `surface-raised` | '#F0FDFF' | 轻微浮起的卡片、选中态背景 |
| `text-primary` | `#164E63` | 主文字、标题 |
| `text-secondary` | `#64748B` | 次要文字、说明、元信息 |
| `text-disabled` | `#94A3B8` | 禁用态文字、占位符 |
| `border` | `#E2E8F0` | 输入框边框、分隔线 |
| `divider` | `#F1F5F9` | 列表项分隔、区块分隔 |

### 状态色

| Token | Hex | 用途 |
|-------|-----|------|
| `success` | `#22C55E` | 打卡成功、通过审核 |
| `warning` | `#F59E0B` | 待复核、提醒、警告 |
| `error` | `#EF4444` | 错误、未通过、缺卡 |

### 色彩使用规则

- **主色不超过两种**：`primary` 用于结构，`cta` 用于行动。
- **背景固定浅色**：本设计默认不支持深色模式，所有配色基于浅色背景优化。
- **CTA 高对比**：打卡按钮使用 `cta` 绿色，在 `background` 上形成强烈行动召唤。
- **文字对比度**：正文与背景对比度 ≥ 4.5:1，大标题 ≥ 3:1。

## Typography

### 字体选择

- **中文主字体**：`Noto Sans SC`（思源黑体简体）
  - 现代、清晰、中文显示优秀
  - 适合长文案阅读（任务内容、心得输入）
- **数字/英文辅助**：`Inter`
  - 用于积分、百分比、日期等数字展示
  - 等宽感强，数据可读性好

### 字号层级

| 层级 | 大小 | 字重 | 用途 |
|------|------|------|------|
| H1 | 24px / 28px line-height | 700 | 页面大标题（如「今日打卡」） |
| H2 | 20px / 26px | 700 | 卡片标题、模块标题 |
| H3 | 16px / 22px | 500 | 小标题、列表标题 |
| Body | 14px / 22px | 400 | 正文、任务描述、心得内容 |
| Meta | 12px / 18px | 400 | 时间、标签、辅助说明 |
| Button | 16px / 24px | 600 | 按钮文字 |

### 排版规则

- 标题使用 `text-primary`，正文使用 `text-secondary` 或 `text-primary`。
- 数字（积分、连续天数、打卡率）使用 `numeric` 字体，增强数据感。
- 心得输入框使用 `Body` 字号，行高 1.6，便于阅读自己写的内容。
- 不使用全大写、不使用斜体、不使用装饰性字体。

## Layout & Spacing

### 间距系统

基于 4px 栅格：`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px`

### 页面边距

- 移动端水平边距：`16px`（`spacing-4`）
- 卡片内边距：`16px` 或 `20px`
- 模块间距：`20px` 或 `24px`

### 布局原则

- 单列布局为主，信息流垂直排列。
- 关键操作（打卡按钮）放在拇指易触区域（屏幕下半部）。
- 卡片使用 `surface` 背景，与 `background` 形成浅层区分。
- 顶部 Header 可使用渐变背景，建立品牌识别。

## Elevation & Depth

- **不使用厚重阴影**。本设计追求扁平、清新的视觉感受。
- 卡片使用极浅的阴影或仅通过背景色区分：
  - 默认卡片：`background: surface`
  - 轻微浮起：`box-shadow: 0 2px 8px rgba(8, 145, 178, 0.08)`
- 底部导航使用顶部细线分隔（`divider`），不投射阴影。
- 按钮按下态使用 `scale(0.98)` 或颜色加深，不使用阴影加深。

## Shapes

| Token | 值 | 用途 |
|-------|-----|------|
| `rounded-sm` | 8px | 小按钮、标签、输入框 |
| `rounded-md` | 16px | 卡片、模块容器 |
| `rounded-lg` | 24px | 大卡片、底部 Sheet、Header 圆角 |
| `rounded-xl` | 32px | 顶部 Header 下圆角、特殊强调容器 |
| `rounded-full` | 9999px | 头像、徽章、胶囊标签、进度条 |

- 打卡日历的小格子使用 `rounded-sm`（8px）。
- 底部导航栏顶部使用 `rounded-t-xl`（上圆角）。

## Components

### Button / 按钮

- **Primary Button（主按钮）**
  - 背景：`primary` → `primary-dark` 渐变
  - 文字：白色，16px，字重 600
  - 圆角：`rounded-md`（16px）
  - 高度：48px
  - 按下态：`scale(0.98)` + 渐变变深

- **CTA Button（打卡按钮）**
  - 背景：`cta` → `cta-hover` 渐变
  - 文字：白色，16px，字重 700
  - 圆角：`rounded-md`（16px）
  - 高度：52px（比普通按钮更高，强调行动）
  - 可带微光/呼吸动画提示未打卡用户

- **Secondary Button（次要按钮）**
  - 背景：`surface`
  - 文字：`primary`，16px，字重 500
  - 边框：1px `primary`

### Card / 卡片

- 背景：`surface`
- 圆角：`rounded-md`（16px）
- 内边距：`16px` 或 `20px`
- 阴影：极浅阴影或完全无阴影（通过背景色区分层级）
- 用途：任务卡片、数据概览卡片、排行榜项

### Input / 输入框

- 背景：`surface`
- 边框：1px `border`，聚焦时 2px `primary`
- 圆角：`rounded-sm`（8px）
- 内边距：`12px 16px`
- 占位符：`text-disabled`
- 字数提示：右下角 `Meta` 字号，`text-secondary`

### Badge / 徽章

- 连续打卡徽章：胶囊形，`primary-light` 背景，`primary-dark` 文字
- 等级徽章：圆形或盾牌形，`cta` 背景，白色文字
- 状态徽章：
  - 已通过：`success` 背景，白色文字
  - 待复核：`warning` 背景，白色文字
  - 未通过：`error` 背景，白色文字

### Calendar Grid / 打卡日历

- 每个格子：`rounded-sm`（8px）
- 已打卡：`cta` 背景，白色对勾或文字
- 未打卡：`border` 背景，无文字或灰色数字
- 今天：`primary` 边框 2px

### Chart / 图表

- 折线图：`primary` 线条，`primary-light` 填充渐变
- 柱状图：已完成用 `cta`，未完成用 `border`
- 数据标签使用 `numeric` 字体
- 坐标轴和网格线使用 `divider`

## Do's and Don'ts

| Do | Don't |
|---|---|
| 使用 SVG 图标（Lucide/Heroicons 风格） | 使用 emoji 作为图标 |
| 保持大量留白与呼吸感 | 信息堆叠过密 |
| 用 `cta` 绿色强调打卡这一核心动作 | 用红色作为打卡按钮 |
| 数据用 `numeric` 字体展示 | 数字和中文混用同一字重 |
| 圆角统一在 8–24px 范围 | 混合直角、小圆角、大圆角 |
| 所有可点击元素 ≥ 44×44pt 热区 | 过小的点击目标 |
| 动画时长控制在 150–300ms | 过长或过于复杂的动画 |
| 错误/空状态给出明确引导和下一步 | 只显示「无数据」 |

