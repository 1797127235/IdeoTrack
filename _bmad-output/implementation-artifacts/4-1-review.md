# Code Review — Story 4.1 定位签到

**Review Date:** 2026-06-23
**Review Mode:** full (with spec/story)
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor
**Scope:** `ce3b57f..ef3ceee` — 定位签到后端 API + 小程序页面
**Status:** ✅ **Approved after fixes**（以下问题已在后续提交中修复）

---

## Executive Summary

Story 4.1 的核心闭环已实现并通过测试：学生可在小程序获取定位、创建/更新打卡记录，后端正确校验任务可见性、截止时间和坐标范围。代码结构符合项目现有分层约定（domains/service/controller/routes）。

审查中发现的 P1/P2 问题已在本审查提交后的修复中解决。

---

## 已修复的问题

### P1 — 小程序定位零值误判
- **位置**：`miniprogram/pages/checkin/index.ts`
- **修复**：引入 `locationReady` 标志位替代 `!latitude || !longitude` 判断，避免赤道/本初子午线用户被误拦截。

### P1 — 后端缺少请求体验证
- **位置**：`api/src/domains/checkins/`
- **修复**：新增 `checkins.schema.ts`，使用 zod 校验 `task_id`（uuid）、`latitude`/`longitude`（number 范围）、`address`（可选，max 500）。
- **Controller**：`checkins.controller.ts` 已接入 schema 校验，返回标准 `VALIDATION_ERROR`。

### P2 — 任务可见性逻辑复用
- **位置**：`api/src/domains/tasks/task.service.ts` + `api/src/domains/checkins/checkins.service.ts`
- **修复**：在 `task.service.ts` 中导出 `fetchTaskById` 并新增 `assertTaskVisibleToStudent(task, userId)` 公共方法；`checkins.service.ts` 移除重复逻辑，直接复用。

### P2 — URL 传 title 不稳
- **位置**：`miniprogram/pages/task/detail/index.ts` + `miniprogram/pages/checkin/index.ts`
- **修复**：任务详情页跳转时不再传 `title`；签到页自行调用 `getMyTaskDetail` 获取任务信息并设置导航标题。

### P2 — navigateBack 重复触发
- **位置**：`miniprogram/pages/checkin/index.ts`
- **修复**：使用模块级变量保存 `successNavigateTimer`，在 `onUnload` 中清理，避免重复导航。

### P2 — address 长度限制
- **位置**：`api/src/domains/checkins/checkins.schema.ts` + 小程序 `onSubmitCheckIn`
- **修复**：后端 zod schema 限制 500 字符；小程序端保留现有逻辑，后端做最终校验。

---

## 测试覆盖

- `api/tests/checkins.test.ts` 共 10 个测试全部通过：
  - 正常签到、重新签到
  - 非存在任务、不可见任务、逾期任务
  - 非学生角色、未认证请求
  - 非法坐标、零坐标边界、超长 address
- `api/tests/tasks.test.ts` 29 个测试全部通过，确认 `assertTaskVisibleToStudent` 抽取未破坏原有逻辑。

---

## 验收标准覆盖

| AC | 验收点 | 状态 |
|---|---|---|
| AC-1 | 点击打卡 → 获取定位 → 保存经纬度/地址/时间 | ✅ |
| AC-1 | 位置 HTTPS 传输 | ✅ |
| AC-1 | 成功后跳转心得提交页 | ⚠️ 当前 `navigateBack`，待 Story 4.2 替换 |
| AC-2 | 拒绝定位权限提示 + 去设置 | ✅ |
| AC-3 | 同一任务重新签到以最后一次为准 | ✅ |
| AC-4 | 仅学生可签可见任务 | ✅ |
| AC-5 | 已逾期任务不可签到 | ✅ |

---

## Verdict

**Approved** — Story 4.1 定位签到可进入下一阶段（代码审查已完成），建议继续创建/开发 Story 4.2 心得提交。
