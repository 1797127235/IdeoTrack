# Edge Case Hunter Findings

- **Location:** `api/src/domains/checkins/checkins.service.ts` lines 119–148
  - **Trigger condition:** Concurrent reflection submissions for same check-in
  - **Guard snippet:** Wrap the SELECT status check and UPDATE in a transaction with `SELECT ... FOR UPDATE` (or atomic UPDATE with status/row-version predicate)
  - **Potential consequence:** Both requests pass the `reflection_modified` guard, allowing more than one modification

- **Location:** `api/src/domains/checkins/checkins.service.ts` lines 138–180
  - **Trigger condition:** Server crash or DB failure after first UPDATE before final UPDATE
  - **Guard snippet:** Perform AI review first, then a single atomic UPDATE; or wrap both updates in a transaction and rollback on failure
  - **Potential consequence:** Check-in remains stuck in `ai_reviewing` with stale/null reason

- **Location:** `api/src/domains/checkins/checkins.service.ts` lines 136–148
  - **Trigger condition:** `checkInId` and `taskId` refer to different tasks in same request
  - **Guard snippet:** Add `if (checkIn.task_id !== task.id) throw new AppError('CHECKIN_TASK_MISMATCH', ...)`
  - **Potential consequence:** Reflection persisted to the wrong check-in record

- **Location:** `api/src/domains/reviews/reviews.service.ts` lines 165–175 and `api/src/domains/checkins/checkins.service.ts` lines 155–164
  - **Trigger condition:** LLM provider hangs without throwing
  - **Guard snippet:** Wrap `llm.reviewReflection(input)` in `Promise.race` with an `AbortSignal` or explicit timeout
  - **Potential consequence:** HTTP request hangs indefinitely; user UI stalls on loading

- **Location:** `miniprogram/pages/reflection/index.ts` lines 71–83 and `miniprogram/pages/checkin/result/index.ts` lines 20–23
  - **Trigger condition:** Check-in status is `requires_modification`
  - **Guard snippet:** Add `'requires_modification'` to both `editableStatuses` arrays
  - **Potential consequence:** Backend permits counselor-requested resubmission, but frontend blocks edit access

- **Location:** `api/src/domains/checkins/checkins.schema.ts` line 13
  - **Trigger condition:** Direct API call bypassing schema validation
  - **Guard snippet:** Add a DB-level `CHECK (LENGTH(reflection_content) <= 500)` or enforce length in service before UPDATE
  - **Potential consequence:** Arbitrarily large reflection content can be stored

## Summary

Wrote 6 edge-case findings. The top themes are (1) concurrency/state-machine gaps in the backend reflection update flow, (2) missing timeout guards around the LLM review call, and (3) a frontend/backend mismatch that blocks resubmission when the check-in status is `requires_modification`.
