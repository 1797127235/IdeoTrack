---
story_id: 6.4
story_key: 6-4-ge-ren-da-ka-ri-li
epic: 6
epic_title: 激励机制
status: done
priority: high
points: 2
baseline_commit: f36eb6203956e15114dd6a1a96bcb7c971e7baac
---

# Story 6.4: 个人打卡日历

Status: ready-for-dev

> 来源：Epic 6 Story 6.4 / PRD §4.6 FR-18 / UX-10, UX-15, UX-16

## Story

作为一名学生，
我想要在个人中心查看自己的打卡日历，
以便直观了解历史打卡情况。

## Acceptance Criteria

### AC-1: 学生查看打卡日历月视图

- **Given** 学生进入「日历」Tab 页面 `miniprogram/pages/calendar/index`
- **When** 页面加载
- **Then** 默认展示当前月份的月视图
- **And** 每天以格子形式展示打卡状态：已打卡 / 未打卡
- **And** 已打卡日期显示为绿色（`--color-success`）
- **And** 未打卡日期显示为灰色（`--color-text-disabled` 或 `--color-divider`）
- **And** 视觉风格参考 GitHub Contribution Graph

### AC-2: 切换月份

- **Given** 学生在日历页面
- **When** 点击「上个月」/「下个月」按钮
- **Then** 日历切换到对应月份并重新加载数据
- **And** 支持左右滑动切换月份（可选，V1 可用按钮兜底）

### AC-3: 点击已打卡日期查看心得

- **Given** 学生点击某个已打卡日期
- **When** 弹出详情浮层或跳转详情页
- **Then** 展示该日期提交的心得内容 `reflection_content`
- **And** 展示任务标题和打卡状态（approved / pending / rejected 等）
- **And** 未打卡日期不可点击或点击后提示「当日未打卡」

### AC-4: 数据来源与权限

- **Given** 学生已登录
- **When** 调用日历数据接口
- **Then** 仅返回当前学生自己的打卡记录
- **And** 非学生角色调用返回 `ACCESS_DENIED`
- **And** V1 不支持补卡，未打卡日期保持灰色，不展示任何操作入口

## Tasks / Subtasks

### 后端任务

- [ ] **Task 1: 新增学生日历查询接口** (AC: #1, #4)
  - [ ] 1.1 在 `api/src/domains/checkins/checkins.types.ts` 新增类型：
    - `CalendarDay { day: string; status: 'approved' | 'pending' | 'rejected' | 'requires_modification'; reflection_content?: string; task_title?: string }`
    - `CalendarMonth { year: number; month: number; days: CalendarDay[] }`
  - [ ] 1.2 在 `api/src/domains/checkins/checkins.service.ts` 实现 `getStudentCalendar(userId, year, month)`：
    - 查询 `check_ins` 表中 `user_id = $1` 且 `checked_in_at` 落在指定年月内的记录
    - 按天聚合，同一天多次打卡以最终状态为准（approved > pending > rejected > requires_modification）
    - 返回每一天的日期、状态、心得内容、任务标题
    - SQL 可参考：
      ```sql
      SELECT DISTINCT ON (DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai'))
             DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai')::text AS day,
             ci.status,
             ci.reflection_content,
             t.title AS task_title
      FROM check_ins ci
      JOIN tasks t ON ci.task_id = t.id
      WHERE ci.user_id = $1
        AND DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai') >= $2
        AND DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai') <= $3
      ORDER BY DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai'), ci.updated_at DESC;
      ```
  - [ ] 1.3 在 `api/src/domains/checkins/checkins.controller.ts` 新增 `getStudentCalendarController`：
    - 处理 `GET /api/checkins/calendar?year=2026&month=6`
    - 校验 `year`、`month` 为有效整数
  - [ ] 1.4 在 `api/src/domains/checkins/checkins.routes.ts` 注册：
    - `router.get('/calendar', authenticate, requireRoles('student'), getStudentCalendarController);`

- [ ] **Task 2: 测试** (AC: #1, #4)
  - [ ] 2.1 在 `api/tests/checkins.test.ts` 新增集成测试：
    - 正常查询某月日历 → 返回正确天数据和状态
    - 跨时区边界（月初/月末）处理正确
    - 非学生角色调用 → 403
    - 无记录月份 → 返回空数组

### 小程序端任务

- [ ] **Task 3: 日历页面** (AC: #1, #2, #3)
  - [ ] 3.1 重写 `miniprogram/pages/calendar/index.ts`：
    - 加载当前月份日历数据
    - 支持切换月份
    - 点击已打卡日期弹出详情
  - [ ] 3.2 重写 `miniprogram/pages/calendar/index.wxml`：
    - 顶部显示「2026年6月」及切换按钮
    - 星期标题行（日一二三四五六）
    - 月视图网格
    - 底部/弹窗展示选中日期的心得详情
  - [ ] 3.3 重写 `miniprogram/pages/calendar/index.wxss`：
    - 已打卡绿色，未打卡灰色
    - 选中态高亮
    - 参考现有主题色和卡片风格

- [ ] **Task 4: 封装日历 API** (AC: #1)
  - [ ] 4.1 在 `miniprogram/services/checkinApi.ts` 新增：
    - `getStudentCalendar(year: number, month: number)` 调用 `GET /api/checkins/calendar?year=&month=`
    - 类型 `CalendarDay`、`CalendarMonth`

## Dev Notes

### 关键架构约束

- **AD-4 JWT 认证**：接口需 `authenticate` + `requireRoles('student')`。
- **AD-5 API RBAC**：学生只能查看自己的打卡日历。
- **AD-13 Data Consistency**：打卡状态以 `check_ins.status` 为准；V1 不涉及积分/等级/勋章，日历只展示真实打卡记录。
- **UX-10 / UX-15 / UX-16**：沿用现有清新教育风，绿色表示完成，灰色表示未完成。

### 现有代码清单（不要重复实现）

- ✅ `api/src/domains/checkins/checkins.service.ts` — 已有 `getCheckInResult` 可按用户查询 approved 天数，可参考时区处理
- ✅ `api/src/domains/checkins/checkins.types.ts` — 已有 `CheckIn` 类型
- ✅ `miniprogram/pages/calendar/index` — 当前为占位页，可直接重写
- ✅ `miniprogram/services/checkinApi.ts` — 已有 `getCheckInResult`，可追加日历接口

### 数据库查询说明

V1 不新建表，直接查询 `check_ins` 和 `tasks`。按 `checked_in_at` 的北京时间（`Asia/Shanghai`）日期聚合，避免 UTC 跨天问题。

### 状态映射

后端返回的 `status` 直接映射前端展示：

| 后端状态 | 前端颜色 | 是否可点击查看心得 |
|---|---|---|
| `approved` | 绿色 | 是 |
| `ai_approved` | 绿色（合并为 approved） | 是 |
| `pending_manual_review` | 橙色/黄色 | 是 |
| `requires_modification` | 橙色 | 是 |
| `rejected` | 红色 | 是 |
| `submitted` / `ai_reviewing` | 浅绿/蓝色（审核中） | 可选 |
| 无记录 | 灰色 | 否 |

V1 可简化：只要当天有打卡记录即视为「已打卡」绿色；无记录为灰色。详情弹窗再展示真实状态文案。

### 小程序跳转流程

```
底部 Tab 「日历」
  ↓ 进入
/pages/calendar/index
  ↓ 点击绿色日期
弹窗/浮层展示当日心得与任务标题
```

## UX Requirements

- 日历页面标题：「打卡日历」
- 月份切换按钮：「<」「>」
- 星期标题：日、一、二、三、四、五、六
- 已打卡格子：绿色填充（`#22C55E`）
- 未打卡格子：灰色填充（`#E2E8F0`）
- 选中格子：加青色边框（`#0891B2`）
- 详情弹窗：圆角卡片，显示日期、任务标题、心得内容、状态标签

## Testing Requirements

### 后端测试

- [ ] 正常查询返回指定月份每天状态
- [ ] 同一日期多条记录以最新状态为准
- [ ] 跨月边界按北京时间正确归属
- [ ] 非学生角色返回 403
- [ ] 未登录返回 401

### 小程序测试

- [ ] 进入日历页默认显示当前月
- [ ] 切换月份刷新数据
- [ ] 已打卡日期显示绿色
- [ ] 点击已打卡日期展示心得详情
- [ ] 未打卡日期为灰色且不可点击

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Completion Notes List

- 后端新增 `GET /api/checkins/calendar?year=&month=`，支持按北京时间聚合学生当月打卡记录
- 小程序重写 `pages/calendar/index`，支持月份切换、已打卡绿色高亮、点击日期查看心得详情
- API 测试 136 passed / 136，小程序 `tsc` 通过

## Change Log

- 2026-06-24: Story 6.4 创建，定义个人打卡日历后端接口与小程序页面。
- 2026-06-24: Story 6.4 实现完成，后端接口、小程序页面、测试全部通过。

## References

- [Source: `epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 6 / Story 6.4]
- [Source: `prds/prd-IdeoTrack-2026-06-22/prd.md` §4.6 FR-18]
- [Source: `ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md` 颜色与组件规范]
