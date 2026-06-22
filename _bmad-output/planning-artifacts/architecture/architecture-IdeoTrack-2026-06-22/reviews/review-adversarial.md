---
name: 思政打卡 App
review-type: adversarial-architecture-review
scope: ARCHITECTURE-SPINE.md
status: needs-fix
reviewer: adversarial-architecture-reviewer
created: 2026-06-22
---

# Adversarial Architecture Review — 思政打卡 App

## Verdict

**needs-fix**

The spine establishes sound high-level decisions but leaves several lower-level invariants undefined. Two independent teams can implement units that obey every AD verbatim and still produce incompatible APIs, data schemas, and state machines. The most dangerous gaps are around the check-in/review/points lifecycle, reflection ownership, and leaderboard materialization.

## Methodology

For each finding below I constructed two plausible one-level-down implementations (e.g., two backend domain services, two DB schemas, two API contracts). Each implementation:

1. Respects every AD in the spine as written.
2. Follows the stated conventions (naming, IDs, dates, response envelope, auth header).
3. Is internally consistent and defensible.

Then I show that the two implementations cannot interoperate or be merged without a breaking change.

---

## Finding 1 — Check-in / Reflection / Review lifecycle is undefined

### The gap

AD-6 says: "Reflections are submitted to the LLM adapter synchronously with a 3-second timeout. If the adapter fails or times out, the system marks the reflection for manual counselor review and still records the check-in as 'pending review' rather than failing the request."

The spine does not define:

- The set of valid states for a check-in.
- The set of valid states for a reflection.
- Whether a reflection is part of a check-in or a separate entity.
- Who transitions which state and in what order.
- Whether points are awarded on submission, AI approval, or manual approval.

### Team A implementation

- `check_ins` table has `status: enum('submitted', 'ai_reviewing', 'ai_approved', 'pending_manual', 'approved', 'rejected')`.
- `reflections` is a separate table with a one-to-one relationship to `check_ins`.
- AI review creates/updates a row in `ai_reviews` and then transitions the check-in status.
- Points are awarded only when status becomes `approved`.

### Team B implementation

- `check_ins` table has `status: enum('pending', 'completed')`. A check-in becomes `completed` as soon as the student submits it.
- `reflections` table has its own status: `enum('pending_review', 'ai_approved', 'manual_reviewed', 'approved', 'rejected')`.
- AI review and manual review update only the reflection status.
- Points are awarded when `check_ins.status` becomes `completed`, before any review.

### Why both obey every AD

- Both satisfy AD-1: state mutations run through the backend API.
- Both satisfy AD-6: LLM call is synchronous with 3-second timeout; failure marks reflection for manual review and records check-in as pending review.
- Both satisfy AD-10: logic lives in `checkins` and `reviews` domains and uses explicit public methods.

### Impact

- Mobile clients receive different status values and progress indicators.
- Points are awarded at different moments, producing different leaderboards.
- Counselor review screens must know which state machine the backend implements.
- Merge requires a breaking API/schema redesign.

### Recommended fix

Add an invariant section defining:

1. Canonical state machine for `check_ins` and `reflections` with allowed transitions.
2. Which domain owns each transition.
3. Exactly when point records are created relative to review state.

---

## Finding 2 — Reflection ownership is ambiguous

### The gap

The ER diagram shows `CHECK_IN ||--o{ REFLECTION : has`. The Capability Map puts "定位签到与心得提交" in `checkins` and "AI 初审" / "辅导员人工复核" in `reviews`. AD-10 says domains may call each other only through explicit public methods.

It is unclear whether:

- `reflections` is an internal aggregate of the `checkins` domain.
- `reflections` is a top-level entity owned by the `reviews` domain.
- The `reviews` domain owns the review lifecycle while `checkins` owns the reflection content.

### Team A implementation

- Reflection is stored as columns inside `check_ins` (`reflection_text`, `reflection_submitted_at`).
- The `checkins` domain owns reflection creation and reading.
- The `reviews` domain exposes `submitForReview(checkInId, reflectionText)` and later `approve(checkInId)` / `reject(checkInId)`.
- No separate `reflections` table exists.

### Team B implementation

- `reflections` is its own table with `id`, `check_in_id`, `content`, `status`.
- The `reviews` domain owns `reflections` and exposes `createReflection(checkInId, content)`.
- The `checkins` domain references reflections by ID.
- AI and manual review act on `reflections.id`.

### Why both obey every AD

- Both keep mobile as a thin client (AD-1).
- Both store data in Supabase PostgreSQL (AD-2).
- Both organize code by PRD feature groups (AD-10): Team A folds reflection into check-ins because the student flow is "check in + write reflection"; Team B splits it because review is a separate feature group.
- Both use explicit public methods across domains (AD-10).

### Impact

- API endpoints differ: `POST /checkins/:id/reflection` vs `POST /reflections`.
- Permission checks differ: Team A scopes by check-in owner; Team B scopes by reflection owner.
- The mobile app built against one contract will not work with the other.
- Reporting queries assume different joins.

### Recommended fix

Declare the aggregate boundary explicitly:

> A `CheckIn` is the aggregate root. A `Reflection` is a value object or child entity owned by `checkins`. The `reviews` domain may update review-related status fields only through the `CheckIn` aggregate's public methods.

Or, if reflection is its own aggregate, state so and define the cross-aggregate invariant.

---

## Finding 3 — Point-record creation has two owners

### The gap

The Capability Map places "积分与等级" in `api/src/domains/points`. The ER diagram shows `USER ||--o{ POINT_RECORD : earns` and `CHECK_IN ||--o{ REFLECTION : has`, but the spine never states who creates a `POINT_RECORD` or when.

### Team A implementation

- `checkins` domain (after a check-in is approved) calls `pointsService.awardPoints({ userId, reason: 'CHECKIN_APPROVED', referenceId: checkInId })`.
- Points records are created synchronously in the same transaction as the approval.
- Leaderboard entries are updated immediately.

### Team B implementation

- `points` domain owns point calculation. It polls or listens to `check_ins`/`reflections` status changes.
- Points records are created asynchronously inside the `points` domain.
- Leaderboard is a materialized view recomputed periodically.

### Why both obey every AD

- Both run mutations through the backend API (AD-1).
- Both enforce RBAC at the API layer (AD-5).
- Both organize by domain (AD-10) and use explicit public methods: Team A calls `pointsService.awardPoints`; Team B calls `checkinsService.getApprovedCheckIns()`.

### Impact

- Transaction boundaries differ: Team A guarantees points exist immediately after approval; Team B has a window of inconsistency.
- Race conditions in leaderboard reads differ between implementations.
- Error handling diverges: if points creation fails, Team A can roll back approval; Team B may leave approval committed and retry later.

### Recommended fix

Add an AD or invariant:

> Point records are created atomically with the event that triggers them. The `points` domain exposes an idempotent `awardPoints` operation; the domain that triggers the event is responsible for invoking it within the same unit of work.

Also define whether points can be revoked and who owns revocation.

---

## Finding 4 — Leaderboard data shape and freshness are unspecified

### The gap

The Capability Map says "班级排行榜" lives in `api/src/domains/points` (read-aggregate). The ER diagram shows `CLASS ||--o{ LEADERBOARD_ENTRY : ranks`. The spine does not say whether `leaderboard_entries` is a persistent table or a computed view, who writes it, or how often it refreshes.

### Team A implementation

- `leaderboard_entries` is a real table with `class_id`, `user_id`, `total_points`, `rank`, `updated_at`.
- `points` domain updates this table every time a point record is created.
- API returns `GET /classes/:id/leaderboard` from the table directly.

### Team B implementation

- There is no `leaderboard_entries` table.
- Leaderboard is computed on demand by aggregating `point_records` joined to `users` filtered by class.
- API returns `GET /classes/:id/leaderboard` from a query.

### Why both obey every AD

- Both respect AD-5: query is scoped by class and role.
- Both respect AD-10: logic lives in `points` domain.
- Both use Supabase PostgreSQL (AD-2).

### Impact

- API consumers see different response shapes: Team A returns pre-materialized `rank`; Team B may return tied ranks differently.
- Performance and freshness differ: Team A is fast but may be stale on failure; Team B is always consistent but slower.
- Migration path between the two is non-trivial.

### Recommended fix

Define the leaderboard as a read model:

> The class leaderboard is a read model derived from `point_records`. V1 computes it on demand via an aggregate query in the `points` domain. The derived nature is explicit; no domain writes directly to a `leaderboard_entries` table.

If persistence is desired, specify the refresh trigger and source of truth.

---

## Finding 5 — Role and profile data are split without ownership rules

### The gap

AD-4 says the JWT carries `userId`, `role`, and `exp`. AD-5 says access is scoped by role and data ownership. The ER diagram shows `USER` with conditional profile tables (`STUDENT_PROFILE`, `COUNSELOR_PROFILE`, `ADMIN_PROFILE`). The spine does not say:

- Which domain owns the `users` table vs profile tables.
- Whether `role` lives on `users` or is derived from the existence of a profile row.
- Which fields determine counselor class scope (`counselor_classes` junction table? array on profile?).
- Whether a user can have multiple profiles.

### Team A implementation

- `users` domain owns `users`, `student_profiles`, `counselor_profiles`, `admin_profiles`.
- `role` is a column on `users`.
- Counselor class scope is in `counselor_classes` junction table.
- `auth` domain reads the user row during login and issues the JWT.

### Team B implementation

- `auth` domain owns `users` (id, email, password_hash, role).
- `users` domain owns profile tables only.
- Counselor class scope is a JSON array on `counselor_profiles.assigned_class_ids`.
- Role is determined by `users.role` only.

### Why both obey every AD

- Both issue JWTs with `userId`, `role`, `exp` (AD-4).
- Both enforce RBAC at the API layer using role and scoped ownership (AD-5).
- Both organize by domain (AD-10) and use explicit public methods.

### Impact

- RBAC scoping queries are incompatible: junction table vs JSON array.
- Admin flows that change a user's role or assigned classes touch different domains.
- A user with a role/profile mismatch (e.g., `role='student'` but no `student_profiles` row) is handled differently.
- Data migrations and reports join different tables.

### Recommended fix

Add an invariant:

> `users.role` is the single source of truth for role. Profile tables are child records owned by the `users` domain and must exist for the corresponding role. Counselor class scope is stored in a normalized `counselor_classes` junction table. The `auth` domain reads `users.role` but does not own profile data.

---

## Finding 6 — ID strategy contains an explicit OR

### The gap

The Consistency Conventions state:

> IDs: UUID v7 (or Supabase default UUID) for all primary keys; sequential `bigserial` only for audit logs if needed.

"UUID v7" and "Supabase default UUID" are different. Supabase defaults to UUID v4 (random). UUID v7 is time-sortable and has different indexing and sorting behavior.

### Team A implementation

- Uses UUID v7 for all primary keys, generated in the API layer.
- Relies on time-sortable IDs for cursor pagination and recent-first ordering.

### Team B implementation

- Uses Supabase default `uuid` extension (v4), generated by the database default.
- Treats IDs as opaque identifiers and uses `created_at` for ordering.

### Why both obey every AD

This is literally permitted by the convention: "UUID v7 (or Supabase default UUID)".

### Impact

- Database schemas differ (default expressions, column types are the same but semantics differ).
- Query patterns that assume monotonic IDs on Team A will return wrong results on Team B.
- Cursor pagination implementations diverge.

### Recommended fix

Choose one and remove the OR:

> All primary keys are UUID v7 generated by the API layer. `created_at` is used for time-based ordering. UUID v4 is not used.

Or, if Supabase default is required, specify that IDs must not be used for ordering or cursor pagination.

---

## Finding 7 — Report file lifecycle lacks concrete invariants

### The gap

AD-7 says reports are generated server-side, uploaded to a private Supabase Storage bucket, and a time-limited signed URL is returned. Files expire after 24 hours. The spine does not specify:

- Bucket name(s).
- File path convention.
- Whether metadata rows are stored in PostgreSQL.
- Who deletes expired files.

### Team A implementation

- Bucket: `reports`.
- Path: `reports/{userId}/{reportId}.pdf`.
- PostgreSQL table `report_exports` stores `id`, `file_path`, `bucket`, `expires_at`, `created_by`.
- A scheduled job deletes both the storage object and the row after 24 hours.

### Team B implementation

- Bucket: `exports`.
- Path: `exports/{reportId}.pdf`.
- No PostgreSQL metadata table; signed URL expiry is the only lifecycle mechanism.
- Expired objects are cleaned by a Supabase lifecycle policy.

### Why both obey every AD

- Both generate server-side (AD-7).
- Both use Supabase Storage private bucket (AD-2, AD-7).
- Both return time-limited signed URLs (AD-7).

### Impact

- Admin/reporting screens cannot reliably list previously generated reports across implementations.
- Cleanup logic, access logs, and debugging differ.
- Migration from one scheme to the other requires file relocation.

### Recommended fix

Define the report file invariant:

> Every exported report has a corresponding row in `report_exports` with `storage_path`, `bucket`, `expires_at`, and `created_by`. The path format is `{bucket}/{yyyy-mm-dd}/{reportId}.{ext}`. Expiry is enforced by both the signed URL TTL and a daily cleanup job that removes rows and storage objects together.

---

## Summary Table

| # | Category | Finding | Severity |
|---|----------|---------|----------|
| 1 | Conflicting state-mutation paths / Missing invariants | Check-in / reflection / review lifecycle undefined | High |
| 2 | Two owners of one entity / Ambiguous boundaries | Reflection ownership unclear | High |
| 3 | Conflicting state-mutation paths | Point-record creation has two owners | High |
| 4 | Clashing shared-data shapes | Leaderboard materialization unspecified | Medium |
| 5 | Two owners of one entity / Ambiguous boundaries | Role/profile ownership and counselor scope undefined | High |
| 6 | Clashing shared-data shapes | ID strategy permits UUID v7 or v4 | Medium |
| 7 | Missing invariants | Report file lifecycle not concrete | Low-Medium |

## Required Follow-up

Before implementation begins, the architecture spine should be amended with explicit lower-level invariants for:

1. The check-in / reflection / review state machine and transition ownership.
2. Aggregate boundaries (is reflection part of check-in?).
3. Point-record creation trigger, owner, and transaction boundary.
4. Leaderboard read model contract (derived vs materialized).
5. User/profile ownership and counselor scope representation.
6. A single ID generation strategy.
7. Report file path, metadata, and cleanup contract.

Until these are added, the spine is **not** a sufficient build substrate for parallel team implementation.
