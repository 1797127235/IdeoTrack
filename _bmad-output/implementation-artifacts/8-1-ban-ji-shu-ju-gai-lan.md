---
story_id: 8.1
story_key: 8-1-ban-ji-shu-ju-gai-lan
epic: 8
epic_title: 辅导员数据看板
status: ready-for-dev
priority: high
points: 3
baseline_commit: 39211fea4ac83dee9db622d9718eb7679c14d4e7
---

# Story 8.1: 班级数据概览

Status: ready-for-dev

> 来源：Epic 8 Story 8.1 / PRD §4.8 FR-21 / AD-5、AD-14、AD-17 / UX-4、UX-8、UX-10、UX-15、UX-16

## Story

作为一名辅导员，
我想要登录后看到所带班级的整体打卡数据，
以便快速掌握班级情况。

## Acceptance Criteria

### AC-1: 辅导员看板首页展示班级概览

- **Given** 辅导员登录后进入看板首页 `miniprogram/pages/counselor/dashboard/index`
- **When** 页面加载
- **Then** 展示当前辅导员所带的所有班级卡片列表
- **And** 每个班级卡片展示：班级名称、所属学院、今日应打卡人数、已打卡人数、打卡率
- **And** 若辅导员带多个班级，页面顶部展示汇总数据：总学生数、总已打卡人数、总打卡率
- **And** 数据允许最多 5 分钟延迟（FR-21）

### AC-2: 班级卡片下钻查看详细名单

- **Given** 辅导员在看板首页点击某个班级卡片
- **When** 进入班级详情页 `miniprogram/pages/counselor/class-detail/index`
- **Then** 展示该班级所有学生的当日打卡名单
- **And** 名单支持按「全部 / 已打卡 / 未打卡」筛选
- **And** 已打卡学生展示打卡时间、状态、心得内容（可选折叠）
- **And** 未打卡学生展示姓名、学号、连续未打卡天数（为 Story 8.2 预留字段，V1 可先用 0 占位）
- **And** 辅导员只能看到自己带班的数据（NFR-6 / AD-5）

### AC-3: 数据范围与权限控制

- **Given** 辅导员已登录并携带 JWT
- **When** 调用看板或班级详情接口
- **Then** 后端仅返回 `counselor_classes` 表中与该辅导员关联的班级数据
- **And** 对 `class_id` 参数必须先校验归属，非管辖班级返回 404 而非 403（避免 ID 遍历泄露）
- **And** 非 `counselor` 角色调用返回 `ACCESS_DENIED`

### AC-4: 下拉刷新

- **Given** 辅导员在看板首页
- **When** 执行下拉刷新
- **Then** 重新请求最新数据
- **And** 刷新期间展示加载状态
- **And** 服务端可保留 5 分钟缓存，下拉刷新不强求跳过缓存（FR-21 允许延迟）

## Tasks / Subtasks

### 后端

- [ ] T1: 新增 `counselor` 领域骨架（AC-3）
  - [ ] T1.1 创建 `api/src/domains/counselor/counselor.types.ts`
  - [ ] T1.2 创建 `api/src/domains/counselor/counselor.service.ts`
  - [ ] T1.3 创建 `api/src/domains/counselor/counselor.controller.ts`
  - [ ] T1.4 创建 `api/src/domains/counselor/counselor.routes.ts`
  - [ ] T1.5 在 `api/src/index.ts` 注册 `/api/counselor` 路由
- [ ] T2: 实现 `GET /api/counselor/dashboard`（AC-1）
  - [ ] T2.1 默认查询今日（北京时间）数据；支持 `?date=YYYY-MM-DD`
  - [ ] T2.2 通过 `counselor_classes` 过滤班级，按 `users.class_id` 统计应打卡人数
  - [ ] T2.3 通过 `check_ins` 统计状态为 `approved` 的已打卡人数
  - [ ] T2.4 计算打卡率（已打卡 / 应打卡，保留整数）
  - [ ] T2.5 （可选）加 5 分钟内存缓存，key 为 `counselor_id:date`
- [ ] T3: 实现 `GET /api/counselor/classes/:id/students?date=`（AC-2）
  - [ ] T3.1 校验班级属于当前辅导员
  - [ ] T3.2 返回班级学生列表及当日打卡状态
  - [ ] T3.3 已打卡展示 `checked_in_at`、`status`、`reflection_content`
  - [ ] T3.4 未打卡展示 `consecutive_absent_days`（V1 可暂为 0）
- [ ] T4: 测试（AC-1、AC-2、AC-3）
  - [ ] T4.1 为两个接口编写集成测试，覆盖跨班级越权返回 404
  - [ ] T4.2 覆盖多班级统计、无班级空状态、日期参数

### 小程序

- [ ] T5: 新增辅导员看板页面（AC-1、AC-4）
  - [ ] T5.1 创建 `miniprogram/pages/counselor/dashboard/index.ts|wxml|wxss|json`
  - [ ] T5.2 创建 `miniprogram/services/counselorApi.ts` 封装看板接口
  - [ ] T5.3 页面 `onShow` 加载班级概览，支持下拉刷新
  - [ ] T5.4 空状态按 UX-16 提供友好引导文案
- [ ] T6: 新增班级详情页面（AC-2）
  - [ ] T6.1 创建 `miniprogram/pages/counselor/class-detail/index.ts|wxml|wxss|json`
  - [ ] T6.2 接收 `class_id` 参数，调用班级学生名单接口
  - [ ] T6.3 实现「全部 / 已打卡 / 未打卡」筛选 Tab
  - [ ] T6.4 未打卡连续天数 ≥ 3 标红并提示「重点关注」（为 Story 8.2 做准备，V1 可先按字段展示）
- [ ] T7: 辅导员入口与导航
  - [ ] T7.1 在 `miniprogram/app.json` 注册新页面路径
  - [ ] T7.2 决策并实施辅导员 tabBar：当前 `app.json` 为学生 4 Tab，辅导员需 3 Tab（看板 / 复核 / 我的）
  - [ ] T7.3 在 `miniprogram/app.ts` 中根据登录角色选择首页：学生 → `pages/home/index`，辅导员 → `pages/counselor/dashboard/index`
  - [ ] T7.4 登录页按角色跳转（若尚未实现）

## Dev Notes

### 数据口径

- **应打卡人数** = 该班级 `role = 'student'` 的学生总数（与 mockup 一致）。
- **已打卡人数** = 当日（北京时间）有 `check_ins.status = 'approved'` 的学生数。
- **打卡率** = `Math.round((checked_in / total) * 100)`。
- 当日按北京时间 `DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai')` 聚合，参考 `checkins.service.ts#getStudentCalendar` 的时区处理。

### RBAC 与数据范围

- 参考 `api/src/domains/reviews/reviews.service.ts` 中 `JOIN counselor_classes cc ON cc.class_id = c.id AND cc.counselor_id = $1` 的模式。
- Route 层：`authenticate + requireRoles('counselor')`。
- Service 层：所有查询以 `counselorId` 作为过滤条件，不依赖前端传入的 `class_id` 做权限判断。
- 对单班级接口，先执行 `SELECT 1 FROM counselor_classes WHERE counselor_id = $1 AND class_id = $2`，不存在则抛 `NOT_FOUND`。

### 现有代码复用

- **后端**：`checkins.service.ts` 已有按日期、用户、状态查询逻辑，可复用 SQL 模式；`reviews.service.ts` 提供辅导员数据范围参考；`middleware/rbac.ts` 提供角色校验。
- **小程序**：`services/api.ts` 提供统一请求封装；`pages/review/index` 是辅导员已有页面，可作为视觉风格和列表渲染参考；`pages/calendar/index` 展示下拉刷新和日期处理参考。

### 关键文件清单

**后端新增/修改：**
- `api/src/domains/counselor/counselor.types.ts`
- `api/src/domains/counselor/counselor.service.ts`
- `api/src/domains/counselor/counselor.controller.ts`
- `api/src/domains/counselor/counselor.routes.ts`
- `api/src/index.ts`（注册路由）
- `api/tests/counselor.test.ts`（新建测试）

**小程序新增/修改：**
- `miniprogram/pages/counselor/dashboard/index.*`
- `miniprogram/pages/counselor/class-detail/index.*`
- `miniprogram/services/counselorApi.ts`
- `miniprogram/app.json`（页面 + tabBar）
- `miniprogram/app.ts`（角色路由）
- `miniprogram/pages/auth/login/index.*`（登录后按角色跳转）

### 待决策 / 风险

- **辅导员 tabBar 方案**：微信小程序 `tabBar.list` 不支持运行时动态切换。可选方案：
  1. 使用 [custom-tab-bar](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/custom-tabbar.html) 组件，按角色渲染不同 Tab。
  2. 登录后按角色 `reLaunch` 到不同首页，但 tabBar 只能统一配置；可在 V1 先统一按辅导员 3 Tab 配置，学生额外页面通过 `navigateTo` 进入。
  3. 学生与辅导员拆分为两个小程序工程（当前架构未采用）。
  **建议**：方案 1（custom-tab-bar）最符合 UX-4，但工作量较大；若赶 MVP，可先方案 2 兜底，Story 8.1 中只保证辅导员能进入看板页面。
- **下钻页面与 Story 8.2 边界**：班级详情页的「未打卡名单 + 一键提醒」在 Story 8.2/8.3 中细化。Story 8.1 先实现名单展示和筛选，提醒按钮可占位但不着色实现。
- **缓存策略**：5 分钟延迟是允许范围，不是必须缓存。Story 8.1 可先不加缓存，后续性能测试再决定是否引入。

## Dev Agent Record

### Agent Model Used

N/A — context engine output

### Debug Log References

- 生产部署踩坑记录见本次会话：服务器本地修改阻塞 `git pull`、Windows 生成 lock 文件导致 Linux Docker `npm ci` 失败，已改为 `npm install` + `set -euo pipefail`。

### Completion Notes List

- Story context created from Epic 8 / PRD §4.8 / Architecture Spine / UX mockups.
- Sprint status updated: epic-8 → in-progress, 8-1 → ready-for-dev.

### File List

- `_bmad-output/implementation-artifacts/8-1-ban-ji-shu-ju-gai-lan.md`（本文件）
- `_bmad-output/implementation-artifacts/sprint-status.yaml`（已更新）
