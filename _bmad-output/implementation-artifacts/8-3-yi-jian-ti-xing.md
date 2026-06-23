---
story_id: 8.3
story_key: 8-3-yi-jian-ti-xing
epic: 8
epic_title: 辅导员数据看板
status: ready-for-dev
priority: high
points: 3
baseline_commit: 3135155f7e590e95e36f12fada10ec871aba0c82
---

# Story 8.3: 一键提醒

Status: ready-for-dev

> Source: Epic 8 Story 8.3 / PRD §4.8 FR-23 / AD-5, AD-14, AD-17 / UX-4, UX-8, UX-10, UX-15, UX-16

## Story

As a counselor,
I want to send a one-click reminder to students who have not checked in,
so that they are prompted to complete their daily check-in.

## Acceptance Criteria

### AC-1: Backend reminder endpoint

- **Given** the counselor selects one or more absent students on the class detail page
- **When** the front end calls `POST /api/counselor/classes/:id/reminders`
  with body `{ student_ids: string[], date?: string }`
- **Then** the backend validates that the counselor manages the class
- **And** validates that sending is within the allowed time window (08:00–22:00 Beijing time)
- **And** validates that each selected student belongs to the class and is absent on the selected date
- **And** enforces a maximum of one successful reminder per student per day
- **And** sends a WeChat subscribe message to each student who has a `wechat_openid`
- **And** skips students without `wechat_openid` and records the reason
- **And** persists a record for every recipient attempt
- **And** returns a summary: `{ total, sent, skipped_no_openid, already_reminded, failed }`

### AC-2: WeChat configuration and graceful fallback

- **Given** the backend needs to send a subscribe message
- **When** `WECHAT_REMINDER_TEMPLATE_ID` or WeChat credentials are missing
- **Then** the API returns a clear error before attempting to send
- **And** in test environments the actual WeChat call is mocked so tests remain deterministic

### AC-3: Mini-program selection and send UI

- **Given** the counselor is on the class detail page in the "未打卡" tab
- **When** the list loads
- **Then** each student row shows a checkbox
- **And** there is a "全选" option for the current list
- **And** a sticky bottom bar shows the selected count and a "一键提醒" button
- **And** tapping the button shows a confirmation dialog
- **And** after sending, a toast shows the result summary
- **And** reminded students display an "已提醒" tag

### AC-4: Time and frequency guardrails

- **Given** the counselor tries to send a reminder
- **When** the current Beijing time is outside 08:00–22:00
- **Then** the API rejects the request with a clear message
- **And** if a student has already been reminded on the selected date, that student is skipped

### AC-5: Reminder records visible on the dashboard

- **Given** the counselor is on the counselor dashboard
- **When** the dashboard loads
- **Then** each class card shows the number of students reminded for the selected date
- **And** the backend exposes `GET /api/counselor/classes/:id/reminders?date=` for future detail views

## Tasks / Subtasks

### Backend

- [ ] T1: Add `reminders` table via migration
  - [ ] T1.1 Add to `api/src/scripts/migrate.ts`:
    - `CREATE TABLE IF NOT EXISTS reminders` with columns `id`, `counselor_id`, `class_id`, `student_id`, `reminder_date`, `channel`, `status`, `error_message`, `created_at`
    - Unique partial/composite constraint to enforce one reminder per student per day: `UNIQUE (student_id, reminder_date)`
    - Index on `(class_id, reminder_date)`
  - [ ] T1.2 Add `WECHAT_REMINDER_TEMPLATE_ID` to `api/.env.example`
- [ ] T2: Create `api/src/lib/wechat.ts`
  - [ ] T2.1 `getWechatAccessToken()`: caches token in memory until expiry, falls back to fetching from `https://api.weixin.qq.com/cgi-bin/token`
  - [ ] T2.2 `sendSubscribeMessage(openid, templateId, page?, data?)`: wraps `subscribeMessage.send`
  - [ ] T2.3 Return clear errors when WeChat env vars are missing
- [ ] T3: Implement `POST /api/counselor/classes/:id/reminders`
  - [ ] T3.1 Add route in `api/src/domains/counselor/counselor.routes.ts`
  - [ ] T3.2 Add controller in `api/src/domains/counselor/counselor.controller.ts`
  - [ ] T3.3 Add `sendReminders(counselorId, classId, studentIds, dateInput)` in `api/src/domains/counselor/counselor.service.ts`
  - [ ] T3.4 Validate class ownership
  - [ ] T3.5 Validate Beijing time window (08:00–22:00)
  - [ ] T3.6 Verify each student is in the class and absent on the selected date
  - [ ] T3.7 Skip already-reminded students (query `reminders` table)
  - [ ] T3.8 Send subscribe message only when `wechat_openid` is present; otherwise `skipped_no_openid`
  - [ ] T3.9 Insert a `reminders` row for each attempt with final status
  - [ ] T3.10 Return summary object
- [ ] T4: Implement `GET /api/counselor/classes/:id/reminders`
  - [ ] T4.1 Validate class ownership
  - [ ] T4.2 Return reminder records for the class + date
- [ ] T5: Update `api/src/domains/counselor/counselor.types.ts` with request/response types
- [ ] T6: Tests
  - [ ] T6.1 Add integration tests in `api/tests/counselor.test.ts`
  - [ ] T6.2 Mock `lib/wechat.ts` in tests
  - [ ] T6.3 Assert daily limit, time-window rejection, absent-only validation, ownership, no-openid skip

### Mini Program

- [ ] T7: Update `miniprogram/services/counselorApi.ts`
  - [ ] T7.1 Add `sendReminders(classId, studentIds, date?)`
  - [ ] T7.2 Add `getClassReminders(classId, date?)`
- [ ] T8: Update `miniprogram/pages/counselor/class-detail/index.ts`
  - [ ] T8.1 Add `selectedStudentIds` array to data
  - [ ] T8.2 Toggle selection on row tap / checkbox
  - [ ] T8.3 Add `selectAll` and `clearSelection` handlers
  - [ ] T8.4 Add `sendReminder` handler: confirm dialog → call API → show toast → refresh list
  - [ ] T8.5 Mark reminded students after refresh
- [ ] T9: Update `miniprogram/pages/counselor/class-detail/index.wxml`
  - [ ] T9.1 Add checkbox to each absent student row
  - [ ] T9.2 Add "全选" / "清空" buttons above the list
  - [ ] T9.3 Add sticky bottom action bar with selected count and "一键提醒" button
  - [ ] T9.4 Show "已提醒" tag on reminded students
- [ ] T10: Update `miniprogram/pages/counselor/class-detail/index.wxss`
  - [ ] T10.1 Checkbox and action-bar styles
  - [ ] T10.2 "已提醒" tag style
- [ ] T11: Update dashboard to show reminder count
  - [ ] T11.1 Extend `ClassDashboardItem` response or fetch reminders separately
  - [ ] T11.2 Display "已提醒 X 人" on each class card
- [ ] T12: Run `cd miniprogram && npm run tsc`

## Dev Notes

### Counselor login vs. WeChat reminders

- **辅导员用账号密码登录不影响一键提醒功能。** 提醒的发送方是辅导员，但接收方是学生。
- 学生的 `wechat_openid` 是学生通过微信登录或首次绑定时写入 `users` 表的；辅导员不需要自己的 `openid` 来触发发送。
- 如果某个学生没有 `wechat_openid`（例如学生也用了账号密码登录且未绑定微信），后端应跳过该学生并返回 `skipped_no_openid`，前端可显示「未绑定微信，无法提醒」。
- V1 只支持微信小程序订阅消息；短信、App 推送等推迟到 V2。

### WeChat subscribe message flow

1. Mini-program calls `wx.requestSubscribeMessage({ tmplIds: [templateId] })` to request user consent.
2. If the user accepts, the backend can later call `subscribeMessage.send` using the stored `openid`.
3. If the user declines or has not subscribed, the WeChat API returns an error; the backend records `failed` with the error code.
4. For V1, the template content can be simple static data (student name, date, task prompt).

### Daily limit enforcement

- Use the `reminders` table unique constraint on `(student_id, reminder_date)`.
- Before sending, query existing records and skip those students as `already_reminded`.
- The limit is per natural Beijing day, not 24-hour rolling window.

### Time window

- Compute current Beijing time on the server; reject if hour is `< 8` or `>= 22`.
- This protects against late-night reminders and aligns with PRD §4.8 FR-23.

### Existing code to extend

- Backend: `api/src/domains/counselor/*`
- Backend auth/wechat: `api/src/domains/auth/auth.service.ts` (code2session pattern)
- Mini program: `miniprogram/pages/counselor/class-detail/index.*`, `miniprogram/services/counselorApi.ts`

### Previous story learnings

- Reuse `toBeijingDateString` / `formatDateText` from `miniprogram/utils/date.ts`.
- Keep tabBar navigation using `wx.switchTab`.
- Backend date arithmetic must use Beijing time zone (`Asia/Shanghai`) consistent with Story 8.1/8.2.
- Run `npm run build` in `api/` and `npm run tsc` in `miniprogram/` before pushing.

### Architecture compliance

- **AD-1 (thin client):** reminder eligibility, time window, daily limit, and WeChat API calls live in the backend.
- **AD-5 (RBAC):** counselor can only remind students in managed classes.
- **AD-14 (users domain owns scope):** derive class scope from `counselor_classes` and `users.class_id`.
- **AD-17 (role-based clients):** this is a counselor-only mini-program feature.

### Testing standards

- Add integration tests in `api/tests/counselor.test.ts`.
- Mock external WeChat HTTP calls so tests do not require real WeChat credentials.
- Run full backend test suite and mini-program type check before pushing.
- Verify on a real Android device if possible; ensure checkbox tap targets are ≥ 48 dp.

### References

- Epic 8 source: `_bmad-output/planning-artifacts/epics/epics-IdeoTrack-2026-06-22/epics.md` §Epic 8
- PRD FR-23: `_bmad-output/planning-artifacts/prds/prd-IdeoTrack-2026-06-22/prd.md` §4.8
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md`
- Previous story file: `_bmad-output/implementation-artifacts/8-2-wei-da-ka-xue-sheng-ming-dan.md`

## Dev Agent Record

### Agent Model Used

N/A — context engine output

### Debug Log References

- Story 8.2 CI fix: avoid `new Date()` in tests; use fixed UTC dates to prevent Beijing/UTC day mismatch.

### Completion Notes List

- Story context created from Epic 8 / PRD §4.8 / Architecture Spine / current counselor domain code.
- Sprint status updated: `8-3-yi-jian-ti-xing` → `ready-for-dev`.

### File List

- `_bmad-output/implementation-artifacts/8-3-yi-jian-ti-xing.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated)
