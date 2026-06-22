---
story_id: 2.2
story_key: 2-2-jin-7-ri-ming-yan-hua-dong-cha-kan
epic: 2
epic_title: 每日名言与首页体验
status: done
priority: medium
points: 3
baseline_commit: 54f508f
---

# Story 2.2: 近 7 日名言滑动查看

Status: done

> 来源：Epic 2 Story 2.2 / PRD §4.2 FR-3 / UX-7

## Story

作为一名学生，
我想要在首页左右滑动查看近 7 日的历史名言，
以便回顾之前的激励内容。

## Acceptance Criteria

### AC-1: 横向滑动切换日期

- **Given** 学生在首页名言区域
- **When** 用户左右滑动
- **Then** 展示不同日期的名言
- **And** 每次滑动切换一天

### AC-2: 仅展示近 7 日

- **Given** 当前日期为今天
- **When** 系统计算可查看范围
- **Then** 只展示从今天往前 6 天，共 7 天的名言
- **And** 不允许查看未来日期的名言

### AC-3: 当前日期定位

- **Given** 学生进入首页
- **When** 名言区域首次渲染
- **Then** 默认显示今天的名言
- **And** 向左滑动可查看前 6 天的名言

### AC-4: 视觉反馈

- **Given** 用户在滑动名言卡片
- **When** 滑动过程中/滑动结束后
- **Then** 有分页指示器或日期标签提示当前位置
- **And** 滑动动画流畅，过渡自然

## Tasks / Subtasks

- [ ] **Task 1: 后端 API 支持按日期查询** (AC: #1–#3)
  - [ ] 1.1 确认 `GET /api/quotes/daily?date=YYYY-MM-DD` 已可用
  - [ ] 1.2 如需，补充分页/批量查询接口（优先复用单日期接口）

- [ ] **Task 2: 移动端名言轮播组件** (AC: #1–#4)
  - [ ] 2.1 重构 `DailyQuote.tsx` 为横向分页 ScrollView
  - [ ] 2.2 生成近 7 天日期数组（今天 → 前 6 天）
  - [ ] 2.3 默认滚动到今天（最右侧或中间位置）
  - [ ] 2.4 每个页面加载对应日期的名言
  - [ ] 2.5 添加日期标签和分页指示器

- [ ] **Task 3: 性能与体验优化** (AC: #4)
  - [ ] 3.1 预加载相邻日期名言
  - [ ] 3.2 滑动时使用原生驱动动画
  - [ ] 3.3 无数据时展示兜底名言

- [ ] **Task 4: 验证与构建** (AC: #1–#4)
  - [ ] 4.1 移动端 `npm run typecheck` 通过
  - [ ] 4.2 真机/模拟器验证滑动切换名言

## Dev Notes

### 交互设计

- 使用 `ScrollView horizontal pagingEnabled` 实现横向分页滑动
- 每页宽度 = 屏幕宽度 - 水平边距
- 默认显示第 6 页（今天），向左滑动查看更早日期
- 页面底部显示小圆点指示器

### 日期处理

```ts
const today = new Date();
const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() - (6 - i));
  return d.toISOString().split('T')[0];
});
// days = [前6天, 前5天, ..., 昨天, 今天]
```

### API 调用

- 进入首页时并发请求 7 天数据
- 或使用 lazy load：先加载今天，滑动时加载相邻日期
- V1 采用并发预加载，逻辑更简单

## UX Requirements

- 卡片保持现有 DESIGN.md 风格：surface 背景、rounded-lg、阴影
- 日期标签使用 Meta 字号，text-secondary
- 分页指示器使用 primary 颜色表示当前页
- 滑动阻尼感自然，不卡顿

## Testing Requirements

### 移动端测试

- [ ] 首页默认显示今天名言
- [ ] 左滑查看前一天名言
- [ ] 继续左滑直到 7 天前
- [ ] 右滑回到今天
- [ ] 滑到最左/最右有边界限制
- [ ] 无网络时展示兜底名言

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

无

### Completion Notes List

- 待实现

## Change Log

- 2026-06-23: Story 2.2 创建，准备实现近 7 日名言滑动查看。

## File List

### 后端
- `api/src/domains/quotes/quote.service.ts`（确认按日期查询）
- `api/src/domains/quotes/quote.controller.ts`
- `api/src/domains/quotes/quote.routes.ts`

### 移动端
- `mobile/components/DailyQuote.tsx`
- `mobile/app/(student)/index.tsx`

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 2 / Story 2.2]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.2 FR-3]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md`]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md` UX-7]
