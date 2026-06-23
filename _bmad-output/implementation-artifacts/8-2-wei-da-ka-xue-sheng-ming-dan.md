---
story_id: 8.2
story_key: 8-2-wei-da-ka-xue-sheng-ming-dan
epic: 8
epic_title: 辅导员数据看板
status: in-progress
priority: high
points: 3
baseline_commit: 7003eb58acb15d8e7d0c8abe7ecc424c29457f04
---

# Story 8.2: 未打卡学生名单

Status: in-progress

> Source: Epic 8 Story 8.2 / PRD §4.8 FR-22 / AD-5, AD-14, AD-17 / UX-4, UX-8, UX-10, UX-15, UX-16

## Story

As a counselor,
I want to view the list of students who have not checked in for a given class on a given date,
so that I can follow up and remind them to complete their check-in.

## Acceptance Criteria

### AC-1: Backend returns real student name, school ID, and consecutive absent days

- **Given** the counselor calls `GET /api/counselor/classes/:id/students` with a valid managed class and a `date` parameter
- **When** the service builds the student list
- **Then** each student record contains `student_name` (real name when available, otherwise falling back to `school_id`), `student_school_id`, and an accurate `consecutive_absent_days` value
- **And** `consecutive_absent_days` is calculated as the number of consecutive days ending on the selected Beijing date without an `approved` check-in
- **And** if the student checked in on the selected date, `consecutive_absent_days` is `0`
- **And** if the student has no prior `approved` check-in, `consecutive_absent_days` is `0`

### AC-2: Consecutive-absent-day highlight rule

- **Given** the counselor views the "未打卡" (absent) tab on the class detail page
- **When** a student has `consecutive_absent_days >= 3`
- **Then** that row is visually highlighted (red text / red border) and shows a "重点关注" badge
- **And** students with `consecutive_absent_days < 3` use the normal absent styling

### AC-3: Date filtering on the class detail page

- **Given** the counselor is on the class detail page `miniprogram/pages/counselor/class-detail/index`
- **When** the page loads, it defaults to the date passed from the dashboard (or today if none)
- **And** the counselor can open a date picker to choose a different date
- **Then** the student list reloads for the selected date and the displayed date text updates

### AC-4: Data scope and permission remain unchanged

- **Given** a counselor is authenticated
- **When** calling the class student list endpoint
- **Then** the existing `counselor_classes` ownership check still applies
- **And** an unmanaged class still returns `404` (not `403`) to avoid ID enumeration
- **And** non-counselor roles are rejected with `403`

### AC-5: Pull-to-refresh still works

- **Given** the counselor is on the class detail page
- **When** they pull down to refresh
- **Then** the current selected date is re-requested and the list is updated

## Tasks / Subtasks

### Backend

- [ ] T1: Prepare `users.name` storage
  - [ ] T1.1 Verify whether the `users` table already has a `name` column
  - [ ] T1.2 If missing, add `api/migrations/0001_add_users_name.sql` containing `ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;`
  - [ ] T1.3 Run the migration against local dev, test, and production databases
  - [ ] T1.4 Update `api/src/scripts/seed.ts` to populate `name` (use a display name derived from `school_id` or leave `NULL` if real names are not yet imported)
  - [ ] T1.5 Update `api/tests/counselor.test.ts` `seedUser` helper to optionally accept `name`
- [ ] T2: Compute `consecutive_absent_days` in `api/src/domains/counselor/counselor.service.ts`
  - [ ] T2.1 In `getClassStudentList`, select each student's last approved check-in date `<= $2::date` using a scalar subquery
  - [ ] T2.2 Calculate `consecutive_absent_days` as `GREATEST($2::date - last_approved_date, 0)`, coalescing `NULL` to `0`
  - [ ] T2.3 Update the `student_name` select to `COALESCE(NULLIF(s.name, ''), s.school_id) AS student_name`
  - [ ] T2.4 Keep the existing `status='approved'` filter and Beijing time-zone date comparison used in Story 8.1
- [ ] T3: Update tests in `api/tests/counselor.test.ts`
  - [ ] T3.1 Add an assertion that a student who checked in today has `consecutive_absent_days: 0`
  - [ ] T3.2 Add an assertion that a student with a last approved check-in 4 days before the selected date has `consecutive_absent_days: 4`
  - [ ] T3.3 Add an assertion that `student_name` falls back to `school_id` when `name` is not set
  - [ ] T3.4 Keep existing RBAC and filter tests green

### Mini Program

- [ ] T4: Add a shared Beijing date utility (optional but recommended)
  - [ ] T4.1 Create or update `miniprogram/utils/date.ts` with `toBeijingDateString(d?: Date): string`
  - [ ] T4.2 Replace the inline `toBeijingDateString` in `miniprogram/pages/counselor/dashboard/index.ts` with the shared helper
  - [ ] T4.3 Use the same helper in `miniprogram/pages/counselor/class-detail/index.ts`
- [ ] T5: Enhance `miniprogram/pages/counselor/class-detail/index.ts`
  - [ ] T5.1 Add `selectedDate` and `dateText` to page data
  - [ ] T5.2 Initialise `selectedDate` from the `date` query parameter or fall back to `toBeijingDateString()`
  - [ ] T5.3 Add `onDateChange` handler that updates `selectedDate`, re-formats `dateText`, and calls `loadStudents()`
  - [ ] T5.4 Pass `this.data.selectedDate` to `getClassStudentList`
  - [ ] T5.5 Keep pull-to-refresh behaviour
- [ ] T6: Update `miniprogram/pages/counselor/class-detail/index.wxml`
  - [ ] T6.1 Add a date-picker row showing `dateText` and a `<picker mode="date">` bound to `onDateChange`
  - [ ] T6.2 Display `student_name` and `student_school_id` on each student card
  - [ ] T6.3 For absent students, show "连续未打卡 {{consecutive_absent_days}} 天"
  - [ ] T6.4 Add "重点关注" badge and red accent when `consecutive_absent_days >= 3`
- [ ] T7: Update `miniprogram/pages/counselor/class-detail/index.wxss`
  - [ ] T7.1 Add `.high-risk` / `.warning-text` styles for the highlight state
  - [ ] T7.2 Keep existing `.checked-in` and `.absent` card styles
- [ ] T8: Verify end-to-end
  - [ ] T8.1 Use the counselor test account `teacher001 / 123456`
  - [ ] T8.2 Check that a student with no approved check-ins shows `0` absent days
  - [ ] T8.3 Create approved check-ins on past dates and confirm the absent-day count and highlight render correctly

## Dev Notes

### Definition of "consecutive absent days"

- Count consecutive days **ending on the selected Beijing date** on which the student has no `approved` check-in.
- If the selected date itself has an approved check-in → `0`.
- If the student has at least one prior approved check-in → `selected_date - last_approved_date` (in days), but not less than `0`.
- If the student has never checked in → `0` (unknown history; avoids misleading huge numbers).
- Use the same Beijing time-zone logic as the dashboard: `DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai')`.

### Student name handling

- The current `users` table does not reliably contain a `name` column in all environments.
- Use `COALESCE(NULLIF(s.name, ''), s.school_id) AS student_name` so the UI always has a non-empty display value.
- Add the column via a small migration if it is missing; this is a one-time schema change that also benefits future user-management stories.

### RBAC and data scope

- Reuse the exact same ownership pattern as Story 8.1:
  - Route: `authenticate + requireRoles('counselor')`
  - Service: `isClassManagedByCounselor(counselorId, classId)` → `404` if not found
  - Query scoped to `s.class_id = $1 AND s.role = 'student'`
- Do **not** allow the front end to influence which class is queried beyond the URL path parameter.

### Existing code to extend (not replace)

- Backend: `api/src/domains/counselor/counselor.service.ts#getClassStudentList`
- Backend types: `api/src/domains/counselor/counselor.types.ts` (already contains `consecutive_absent_days` and `student_name`)
- Backend tests: `api/tests/counselor.test.ts`
- Mini program page: `miniprogram/pages/counselor/class-detail/index.*`
- Mini program service: `miniprogram/services/counselorApi.ts` (already supports `date` and `status` query params)

### Previous story learnings

- **TabBar navigation:** tabBar pages must use `wx.switchTab`, not `wx.reLaunch`, or the real device shows a blank screen / unresponsive UI.
- **Role-aware custom tabBar:** `miniprogram/custom-tab-bar/index.ts` switches tab lists based on stored role; no changes are needed for this story.
- **Beijing date formatting:** do not rely on `Date.toLocaleDateString` across iOS/Android; compute the offset manually or use the server-provided `date` field.
- **TypeScript imports:** `vitest` passing does not guarantee `tsc --noEmit` passes; always import types such as `DashboardSummary` explicitly.
- **WeChat compiler quirks:** avoid top-level `type` aliases in pages that may fail on the real-device compiler; inline types or use interfaces.

### Architecture compliance

- **AD-1 (thin client):** all absent-day calculation and data scoping happens in the API service.
- **AD-5 (RBAC at API layer):** the counselor sees only assigned classes; unchanged from Story 8.1.
- **AD-14 (users domain owns role/scope):** continue to derive class scope from `counselor_classes` and `users.class_id`.
- **AD-17 (role-based clients):** this is a counselor-only mini-program feature; no admin or student flows are touched.
- **NFR-3:** keep queries within the default time range fast (< 5 s). The per-student scalar subquery is acceptable for class sizes up to a few hundred; revisit indexing if production data is larger.

### Testing standards

- Add/update integration tests in `api/tests/counselor.test.ts`.
- Run `npm run test` in `api/` (requires `TEST_DATABASE_URL`).
- Run `npm run build` (or `npx tsc --noEmit`) in `api/` before pushing to catch type errors that `vitest` may miss.
- Verify the mini-program page in WeChat DevTools and on a real Android device (primary target per NFR-16).

### References

- Epic 8 source: `_bmad-output/planning-artifacts/epics/epics-IdeoTrack-2026-06-22/epics.md` §Epic 8
- PRD FR-22: `_bmad-output/planning-artifacts/prds/prd-IdeoTrack-2026-06-22/prd.md` §4.8
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md`
- Previous story file: `_bmad-output/implementation-artifacts/8-1-ban-ji-shu-ju-gai-lan.md`

## Dev Agent Record

### Agent Model Used

N/A — context engine output

### Debug Log References

- Story 8.1 deployment notes: server-side uncommitted changes blocking `git pull`, cross-platform `package-lock.json` issues resolved by using `npm install` in Docker.

### Completion Notes List

- Story context created from Epic 8 / PRD §4.8 / Architecture Spine / UX experience design / current counselor domain code.
- Sprint status updated: `8-2-wei-da-ka-xue-sheng-ming-dan` → `ready-for-dev`.

### File List

- `_bmad-output/implementation-artifacts/8-2-wei-da-ka-xue-sheng-ming-dan.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated)
