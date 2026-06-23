# Blind Hunter Review Findings

> Reviewed with zero project context, specs, or background. Treat every line as suspect.

## Findings

### 1. Race condition allows multiple reflection submissions/modifications
- **Evidence:** `checkins.service.ts` `submitReflection` reads `checkIn.reflection_modified`, branches on it, then performs a separate `UPDATE`. There is no `FOR UPDATE` lock, no transaction wrapping the read-to-write sequence, and no optimistic concurrency control (e.g., `WHERE reflection_modified = false`).
- **Why it matters:** Two concurrent requests can both observe `reflection_modified = false` for the same check-in and both update, silently violating the "only one modification" business rule.

### 2. Status transition is split across two non-atomic updates
- **Evidence:** The service first `UPDATE`s `status = 'ai_reviewing', ai_review_reason = NULL`, then awaits `aiReviewReflection`, then performs a second `UPDATE` to the final status.
- **Why it matters:** If the process crashes, the second `UPDATE` fails, or the request times out between the two updates, the check-in is left in `ai_reviewing` with no `ai_review_reason` and no visible retry/recovery mechanism.

### 3. AI review is run synchronously inside the HTTP request
- **Evidence:** `submitReflection` awaits `aiReviewReflection` and only returns the response after the LLM/local review completes.
- **Why it matters:** LLM latency or transient failures directly become user-facing latency and can cause gateway timeouts. The client is blocked on an unreliable external dependency with no queue or async job in sight.

### 4. LLM errors silently downgrade borderline content to `ai_approved`
- **Evidence:** `reviews.service.ts` catches LLM errors, logs them, then falls through to `return { status: 'ai_approved', reason: 'AI 初审通过' }`.
- **Why it matters:** If the LLM provider is down or rate-limited, content that only passed simplistic local rules gets approved without the stricter semantic check the architecture implies.

### 5. Frontend blocks edits for `requires_modification` while the backend allows unlimited resubmissions
- **Evidence:** `reflection/index.ts` restricts `editableStatuses` to `['submitted', 'ai_reviewing']` and navigates back for any other status. `checkin/result/index.ts` `canModifyReflection` uses the same restricted list.
- **Why it matters:** The backend comment explicitly says "辅导员要求修改后允许重新提交，次数不限" for `requires_modification`, but the UI refuses to open the edit page in that state, creating a functional deadlock for users.

### 6. Result page rejects `requires_modification` as an invalid status
- **Evidence:** `checkin/result/index.ts` defines `VALID_STATUSES = ['ai_approved', 'pending_manual_review']` and redirects away if the URL status is anything else.
- **Why it matters:** `requires_modification` is a legitimate server state, yet a user landing on the result page with it is told the page parameters are invalid and kicked out.

### 7. Review-reason mapping is tightly coupled to hardcoded server strings
- **Evidence:** `reflection/index.ts` `getReviewReasonText` switches on exact strings such as `'字数不足'`, `'包含敏感内容'`, `'内容疑似套话'`, `'与任务内容重复度过高'`, `'LLM 判定需复核'`.
- **Why it matters:** Any wording change in `reviews.service.ts` breaks the user-facing guidance silently. This is a maintenance trap and a localization hazard.

### 8. Sensitive-word and template detection uses naive substring matching
- **Evidence:** `reviews.service.ts` `sensitiveWordRule` and `templateRule` call `normalized.includes(normalize(word/tpl))` against raw hardcoded arrays.
- **Why it matters:** It will false-positive on legitimate phrases that happen to contain a flagged substring, and it can be trivially evaded with homoglyphs, punctuation, or spacing. There is no scoring, tokenization, or semantic analysis.

### 9. Similarity rule uses a poor metric with an unexplained threshold
- **Evidence:** `jaccardSimilarity` computes character-set overlap, and `similarityRule` rejects when `>= 0.7` against the task content.
- **Why it matters:** Character-level Jaccard is not meaningful for Chinese text similarity. The threshold appears arbitrary, and the rule is likely either useless or over-sensitive with no empirical justification shown.

### 10. Input validation occurs before authentication
- **Evidence:** `submitReflectionController` parses and validates `req.body` before checking `if (!req.user)`.
- **Why it matters:** Although cheap, this is non-standard ordering and leaks the endpoint's validation behavior to unauthenticated callers. A malformed body from an unauthenticated client still produces a `VALIDATION_ERROR` rather than `AUTH_UNAUTHORIZED`.

### 11. No visible rate limiting or abuse controls on the reflection endpoint
- **Evidence:** `checkins.routes.ts` wires the new `POST /:id/reflection` route with only `authenticate` and `requireRoles('student')`.
- **Why it matters:** A student can repeatedly submit or modify reflections, triggering LLM calls and database writes indefinitely, inflating cost and load.

### 12. Result page displays fabricated, hardcoded statistics
- **Evidence:** `checkin/result/index.wxml` shows static values: `+10` points, `1` consecutive day, and a `10%` progress bar, plus copy "积分待发放".
- **Why it matters:** These values are not sourced from any backend field visible in the diff. Users are shown misleading, fake progress data.

### 13. Deadline enforcement is delegated to an opaque helper
- **Evidence:** `submitReflection` calls `assertTaskVisibleToStudent(task, userId)` but the helper body is not in the diff; the test expects `CHECKIN_DEADLINE_PASSED`.
- **Why it matters:** If the helper does not enforce the deadline (or changes in the future), the feature silently loses a critical invariant. The contract is not visible or asserted in this change.

### 14. New database index has no supporting query
- **Evidence:** `migrate.ts` adds `idx_check_ins_reflection_status ON check_ins(status, reflection_modified)`.
- **Why it matters:** No query in the diff selects or filters on `(status, reflection_modified)`. It adds write overhead and storage cost without a demonstrated read benefit.

### 15. UUID validation logic is duplicated across pages
- **Evidence:** `reflection/index.ts` and `checkin/result/index.ts` each define their own `UUID_RE` and `isUuid`.
- **Why it matters:** Duplication invites drift. If the regex or validation logic changes, every page must be updated independently.

### 16. Tests do not cover the `requires_modification` unlimited-resubmission path
- **Evidence:** `checkins.test.ts` tests `submitted`/`ai_reviewing` modification limits and `pending_manual_review` rejection, but has no case for `requires_modification`.
- **Why it matters:** The backend explicitly special-cases `requires_modification` with unlimited resubmissions, yet this path is untested and the frontend already contradicts it (see Finding 5).

### 17. No audit trail for AI review decisions
- **Evidence:** `submitReflection` writes `ai_review_reason` to the check-in row, but there is no separate audit log, versioning, or record of the original submission versus the final AI result.
- **Why it matters:** Disputes over why content was flagged or approved cannot be reconstructed. Admins cannot tell whether a decision came from local rules, LLM, or fallback.

### 18. HTML/script injection risk for reflection content
- **Evidence:** `reflection_content` is accepted as plain text, stored in a `TEXT` column, and rendered via `{{reflectionSummary}}` in Mini Program WXML. No sanitization is visible.
- **Why it matters:** While WXML is not full HTML, storing unsanitized user input and rendering it elsewhere creates a latent XSS/data-injection risk, especially if the same data is later rendered in other clients (web admin, exports, notifications).
