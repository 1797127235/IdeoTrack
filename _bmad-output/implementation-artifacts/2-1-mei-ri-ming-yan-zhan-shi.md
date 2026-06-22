---
story_id: 2.1
story_key: 2-1-mei-ri-ming-yan-zhan-shi
epic: 2
epic_title: 每日名言与首页体验
status: done
priority: high
points: 3
baseline_commit: 7e1b30e
---

# Story 2.1: 每日名言展示

Status: done

> 来源：Epic 2 Story 2.1 / PRD §4.2 FR-3 / Architecture AD-10 / UX-7

## Story

作为一名学生，
我想要打开 App 首页时看到一句每日名言，
以便获得正向鼓励并开始打卡。

## Acceptance Criteria

### AC-1: 首页展示当日名言

- **Given** 学生进入首页
- **When** 页面加载完成
- **Then** 展示当日的名言内容、出处（如有）
- **And** 名言内容来自管理员配置的名言库中已启用条目

### AC-2: 同一自然日内名言保持一致

- **Given** 同一学生在同一天多次进入首页
- **When** 每次加载名言数据
- **Then** 看到的名言内容与出处保持一致
- **And** 不因为下拉刷新或切换 Tab 而随机变化

### AC-3: 名言每日更新

- **Given** 系统已配置多条启用名言
- **When** 新的一天开始（00:00 后首次打开）
- **Then** 展示下一条启用名言
- **And** 已展示过的名言按轮询顺序循环复用

### AC-4: 无可用名言时的兜底

- **Given** 名言库中无启用条目
- **When** 学生进入首页
- **Then** 展示一条默认兜底名言
- **And** 不显示空白或错误状态

## Tasks / Subtasks

- [ ] **Task 1: 数据库表设计** (AC: #1)
  - [ ] 1.1 创建 `quotes` 表：id, content, author, source, is_enabled, display_order, created_at, updated_at
  - [ ] 1.2 创建 `daily_quotes` 表：id, quote_id, date, created_at（记录每日实际展示的名言）
  - [ ] 1.3 添加合适的索引（date, is_enabled）

- [ ] **Task 2: 后端 API — 获取每日名言** (AC: #1–#4)
  - [ ] 2.1 创建 `api/src/domains/quotes/quote.service.ts`
  - [ ] 2.2 实现 `getDailyQuote(date)`：按日期返回名言，无记录时按轮询算法生成并写入 daily_quotes
  - [ ] 2.3 实现 `getQuoteById(id)`、`listEnabledQuotes()` 等基础方法
  - [ ] 2.4 创建 `api/src/domains/quotes/quote.controller.ts` 暴露 `GET /api/quotes/daily`
  - [ ] 2.5 创建 `api/src/domains/quotes/quote.routes.ts` 注册路由（学生角色可访问）
  - [ ] 2.6 兜底名言常量：`"路虽远，行则将至；事虽难，做则必成。" — 《荀子·修身》`

- [ ] **Task 3: 移动端首页 — 名言组件** (AC: #1–#4)
  - [ ] 3.1 创建 `mobile/services/quotesApi.ts` 调用 `GET /api/quotes/daily`
  - [ ] 3.2 创建 `mobile/components/DailyQuote.tsx` 展示名言卡片
  - [ ] 3.3 在 `mobile/app/(student)/index.tsx` 顶部引入 DailyQuote
  - [ ] 3.4 加载状态使用主题色骨架屏或 spinner
  - [ ] 3.5 错误时展示兜底名言，不阻断首页其他内容

- [ ] **Task 4: 初始数据** (AC: #3–#4)
  - [ ] 4.1 在 seed 脚本中插入 7 条以上启用名言
  - [ ] 4.2 设置 display_order 保证轮询顺序

- [ ] **Task 5: 验证与构建** (AC: #1–#4)
  - [ ] 5.1 后端 `npm run build` 通过
  - [ ] 5.2 移动端 `npm run typecheck` 通过
  - [ ] 5.3 真机/模拟器验证首页加载名言

## Dev Notes

### 轮询算法

V1 采用简单轮询：
1. 查询 `daily_quotes` 中 `date = 当天` 的记录
2. 若存在，直接返回对应 `quote`
3. 若不存在，按 `display_order` 查找下一条应展示的名言：
   - 取 `MAX(daily_quotes.display_order)` 或统计历史记录数，对启用名言总数取模
   - 选中名言后写入 `daily_quotes(date, quote_id)`
4. 无启用名言时返回兜底名言

### 数据范围

- 每日名言对学生只读，不涉及复杂 RBAC
- 后续 Story 2.3 管理员可管理名言库

### 现有基础

- 移动端主题配置：`mobile/theme.ts`
- API 客户端：`mobile/services/api.ts`
- 后端 domain 结构已建立：`api/src/domains/auth`

## UX Requirements

- 名言卡片使用 `surface` 背景、`rounded-md` 圆角
- 文字左对齐，content 使用 `text-primary`，author/source 使用 `text-secondary`
- 卡片顶部可有小图标或引号装饰
- 与其他首页模块保持 `spacing-5`（20px）间距
- 参考 DESIGN.md 清新教育风配色

## Testing Requirements

### 后端测试

- [ ] 有启用名言时，`GET /api/quotes/daily` 返回当日名言
- [ ] 同一天多次调用返回同一名言
- [ ] 无启用名言时返回兜底名言
- [ ] 跨天后返回不同名言（通过传入 date 参数测试）

### 移动端测试

- [ ] 首页加载显示名言卡片
- [ ] 下拉刷新后名言内容不变
- [ ] 无网络时展示兜底名言

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- 待实现

## Change Log

- 2026-06-23: Story 2.1 创建，准备实现每日名言展示。

## File List

### 后端
- `api/src/domains/quotes/quote.types.ts`
- `api/src/domains/quotes/quote.service.ts`
- `api/src/domains/quotes/quote.controller.ts`
- `api/src/domains/quotes/quote.routes.ts`
- `api/src/scripts/seed.ts`

### 移动端
- `mobile/services/quotesApi.ts`
- `mobile/components/DailyQuote.tsx`
- `mobile/app/(student)/index.tsx`

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 2 / Story 2.1]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.2 FR-3]
- [Source: `architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-10]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md`]
