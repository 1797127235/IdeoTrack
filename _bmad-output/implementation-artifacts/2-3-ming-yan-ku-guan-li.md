---
story_id: 2.3
story_key: 2-3-ming-yan-ku-guan-li
epic: 2
epic_title: 每日名言与首页体验
status: done
priority: medium
points: 3
baseline_commit: e9d44d2
---

# Story 2.3: 名言库管理

Status: done

> 来源：Epic 2 Story 2.3 / PRD §4.2 FR-4 / UX-5

## Story

作为一名管理员，
我想要在后台管理每日名言库，
以便控制首页展示内容。

## Acceptance Criteria

### AC-1: 名言列表查看

- **Given** 管理员进入名言库管理页
- **When** 页面加载
- **Then** 展示所有名言（含内容、出处、启用状态、排序）
- **And** 支持按启用状态筛选

### AC-2: 添加名言

- **Given** 管理员点击添加按钮
- **When** 填写内容、作者、出处并提交
- **Then** 系统保存新名言
- **And** 内容不超过 200 字
- **And** 添加成功后列表自动刷新

### AC-3: 编辑名言

- **Given** 管理员点击某条名言的编辑
- **When** 修改内容、作者、出处或启用状态并提交
- **Then** 系统更新该名言
- **And** 内容不超过 200 字

### AC-4: 删除名言

- **Given** 管理员点击某条名言的删除
- **When** 确认删除
- **Then** 系统从数据库移除该名言
- **And** 已用于 daily_quotes 的历史记录保留

### AC-5: 启用/禁用切换

- **Given** 管理员切换某条名言的启用状态
- **When** 切换后保存
- **Then** 系统即时生效
- **And** 禁用后不再参与轮询，但已生成当日记录不受影响

## Tasks / Subtasks

- [ ] **Task 1: 后端名言 CRUD API** (AC: #1–#5)
  - [ ] 1.1 扩展 `api/src/domains/quotes/quote.service.ts`
  - [ ] 1.2 实现 `listQuotes(filters)`、`createQuote(data)`、`updateQuote(id, data)`、`deleteQuote(id)`
  - [ ] 1.3 添加 `quote.schema.ts` 校验输入
  - [ ] 1.4 扩展 `quote.controller.ts` 暴露 CRUD 端点
  - [ ] 1.5 扩展 `quote.routes.ts`，仅管理员可访问（`requireRoles('admin')`）

- [ ] **Task 2: 移动端管理员名言库页面** (AC: #1–#5)
  - [ ] 2.1 创建 `mobile/services/quotesAdminApi.ts`
  - [ ] 2.2 创建 `mobile/app/(admin)/quotes.tsx` 管理页面
  - [ ] 2.3 实现列表展示、添加/编辑表单、删除确认
  - [ ] 2.4 实现启用/禁用开关
  - [ ] 2.5 在 `mobile/app/(admin)/index.tsx` 添加「名言库」快捷入口

- [ ] **Task 3: 验证与构建** (AC: #1–#5)
  - [ ] 3.1 后端 `npm run build` 通过
  - [ ] 3.2 移动端 `npm run typecheck` 通过
  - [ ] 3.3 管理员账号测试增删改查

## Dev Notes

### API 端点

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/quotes | admin | 列出名言 |
| POST | /api/quotes | admin | 添加名言 |
| PUT | /api/quotes/:id | admin | 编辑名言 |
| DELETE | /api/quotes/:id | admin | 删除名言 |

### 数据校验

- content: 必填，1–200 字
- author: 可选，最多 50 字
- source: 可选，最多 100 字
- is_enabled: boolean
- display_order: integer

### 轮询逻辑不变

`getDailyQuote` 继续按 `is_enabled=true` 过滤，display_order 升序轮询。

## UX Requirements

- 列表项使用 surface 卡片，显示名言前 40 字 + 省略号
- 启用状态用开关（Switch）直观展示
- 添加/编辑使用 Modal 或独立页面
- 删除前弹出确认对话框
- 表单错误提示使用文字 + 边框变红

## Testing Requirements

### 后端测试

- [ ] 非管理员访问 /api/quotes → 403
- [ ] 管理员 CRUD 正常
- [ ] 内容超过 200 字 → 400

### 移动端测试

- [ ] 管理员登录后看到名言库入口
- [ ] 添加名言后列表刷新
- [ ] 编辑名言内容即时更新
- [ ] 删除名言后列表移除
- [ ] 禁用名言不影响当日已生成记录

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- 待实现

## Change Log

- 2026-06-23: Story 2.3 创建，准备实现名言库管理。

## File List

### 后端
- `api/src/domains/quotes/quote.types.ts`
- `api/src/domains/quotes/quote.service.ts`
- `api/src/domains/quotes/quote.controller.ts`
- `api/src/domains/quotes/quote.routes.ts`
- `api/src/domains/quotes/quote.schema.ts`

### 移动端
- `mobile/services/quotesAdminApi.ts`
- `mobile/app/(admin)/quotes.tsx`
- `mobile/app/(admin)/index.tsx`

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 2 / Story 2.3]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.2 FR-4]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md`]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md` UX-5]
