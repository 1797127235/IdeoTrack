---
story_id: 5.3
story_key: 5-3-fu-dao-yuan-ren-gong-fu-he
epic: 5
epic_title: 心得审核流程
status: in-progress
priority: high
points: 5
---

# Story 5.3：辅导员人工复核

Status: in-progress

> 来源：Epic 5 Story 5.3 / PRD §4.5 FR-13 / AD-5, AD-11, AD-13

## Story

作为一名辅导员，
我想要对 AI 初审未通过的心得进行人工审核，
以便判断学生打卡是否有效。

## Acceptance Criteria

### AC-1: 待复核列表

- **Given** 辅导员已登录
- **When** 进入「待复核」列表
- **Then** 只展示其所带班级中状态为 `pending_manual_review` 的打卡
- **And** 列表项展示学生姓名、任务标题、心得内容、AI 初审原因

### AC-2: 复核操作

- **Given** 辅导员查看某条待复核记录
- **When** 选择「通过」「不通过」或「要求修改」
- **Then**：
  - 通过：状态变为 `approved`，发放 +10 积分
  - 不通过：状态变为 `rejected`，不发放积分
  - 要求修改：状态变为 `requires_modification`，记录辅导员反馈

### AC-3: 数据范围隔离

- **Given** 辅导员只带 A 班
- **When** 查看待复核列表或操作某条记录
- **Then** 只能访问 A 班学生的数据（AD-5）

## Tasks

- 数据库迁移：新增 `check_ins.review_feedback` 字段；新增 `point_records` 表
- 后端：创建 `reviews` 领域人工复核 service / controller / routes
- 后端：创建 `points` 领域 `awardPoints` 基础实现
- 后端：集成测试覆盖列表、通过、不通过、要求修改、跨班越权
- 小程序：新增 `pages/counselor/review/list` 页面

## Dev Notes

- 复核操作幂等：终态（approved/rejected）不可再次复核。
- 积分发放采用触发域原子创建：由 `checkins` 在状态流转为 `approved` 时调用 `points.awardPoints()`。
- 辅导员反馈在 `requires_modification` 时必填，其他操作可选。
