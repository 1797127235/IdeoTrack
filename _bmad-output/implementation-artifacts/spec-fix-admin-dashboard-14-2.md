---
title: 'Fix admin dashboard to match Story 14.2 module-card homepage'
type: 'bugfix'
created: '2026-06-24T16:15:46+08:00'
status: 'done'
baseline_commit: '61d63381e6b105a9c0ee436d500e9185079f8e8d'
context:
  - '_bmad-output/implementation-artifacts/14-2-web-hou-tai-bu-ju-yu-dao-hang.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `web/app/(admin)/page.tsx` currently shows an unauthorized data-overview dashboard (KPI cards, trend chart, college ranking, absent-student table) that is not in the approved BMAD plan.

**Approach:** Revert the admin homepage to the module-card landing page specified by Story 14.2 AC-3 and its UX Requirements, using the installed `impeccable` skill to enforce craft quality.

## Boundaries & Constraints

**Always:**
- Match Story 14.2 AC-3 verbatim: 7 module-card entries (概览 / 任务 / 名言 / 组织 / 用户 / 报表 / 运维).
- Follow Story 14.2 UX spec: 3-column grid, 200×150px cards, `#FFFFFF` cards, `#ECFEFF` page background, `#0891B2` primary, 16px radius, subtle shadow, hover lift.
- Keep the existing `Sidebar.tsx` and `layout.tsx` unchanged; only `page.tsx` is in scope.
- Apply `impeccable` design principles: no AI slop, consistent hover/focus states, adequate contrast, clear hierarchy.

**Ask First:**
- If adding data visualization or absent-student management to the admin homepage is desired, a new story or sprint-change proposal is required first.

**Never:**
- Add KPIs, charts, rankings, or an absent-student list to this page.
- Invent modules or routes not listed in Story 14.2.
- Modify other admin pages, the API, or the miniprogram.
- Change global design tokens, fonts, or colors beyond the minimum required to keep Tailwind v4 functioning.
- Build a full task-list feature; only a minimal placeholder is allowed to satisfy AC-3 navigation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Admin visits `/` | Sees 7 module cards in 3-column grid; each card clickable | N/A |
| HOVER | Mouse over card | Card lifts slightly with transition | N/A |
| CLICK | Click card | Navigates to the module route | N/A |
| RESPONSIVE | Narrow viewport | Cards reflow to 2 or 1 column without overflow | N/A |

</frozen-after-approval>

## Code Map

- `web/app/(admin)/page.tsx` -- the only file to rewrite; admin homepage content
- `web/components/Sidebar.tsx` -- existing sidebar, keep unchanged
- `web/app/(admin)/layout.tsx` -- existing layout shell, keep unchanged
- `.claude/skills/impeccable/reference/product.md` -- product register guidance for dashboard craft

## Tasks & Acceptance

**Execution:**
- [ ] `web/app/(admin)/page.tsx` -- rewrite to 7 module-card grid per Story 14.2 UX spec -- restores approved design and removes unauthorized content
- [ ] `web/app/(admin)/page.tsx` -- add hover/focus transition states -- meets `impeccable` interaction-state requirements
- [ ] `web/app/(admin)/page.tsx` -- ensure all cards link to existing routes -- preserves navigation behavior
- [ ] `web/app/(admin)/tasks/page.tsx` -- create a minimal task-list placeholder so the 任务 card navigates successfully -- closes AC-3 navigation gap discovered during review
- [ ] `web/app/globals.css` -- ensure `@import "tailwindcss"` is present so Tailwind v4 styles continue to render -- required by current project toolchain, not a design change

**Acceptance Criteria:**
- Given an admin logs in, when they land on `/`, then they see 7 white module cards arranged in a 3-column grid.
- Given the screen is desktop width, when the page renders, then each card is 200×150px with 16px radius and subtle shadow.
- Given a card is hovered or focused, then it lifts slightly and shows a visible transition.
- Given the page background, then it is `#ECFEFF` and primary links/accent use `#0891B2`.
- Given a card is clicked, then it navigates to the corresponding module route.

## Spec Change Log

## Design Notes

The 7 cards map to the sidebar navigation order:
1. 数据概览 → `/` (self-link)
2. 任务管理 → `/tasks`
3. 名言管理 → `/quotes`
4. 组织结构 → `/organizations`
5. 用户管理 → `/users`
6. 报表统计 → `/reports`
7. 运维管理 → `/operations`

Each card shows the module name and a one-line description, matching Story 14.2 AC-3.

## Verification

**Commands:**
- `cd web && npx tsc --noEmit` -- expected: no TypeScript errors
- `cd web && node ../.claude/skills/impeccable/scripts/detect.mjs --json "app/(admin)/page.tsx"` -- expected: `[]`
- `curl -I http://localhost:3001/` (dev server already running) -- expected: HTTP 200

**Manual checks:**
- Open `http://localhost:3001/` and confirm the 7-card grid matches Story 14.2 layout.
- Verify no KPIs, charts, rankings, or absent-student tables remain on the page.
## Suggested Review Order

- Entry point: server-rendered admin homepage now hosts the module-card grid
  [`page.tsx:1`](../../web/app/(admin)/page.tsx#L1)

- Module labels and routes restored to Story 14.2 AC-3 wording
  [`page.tsx:4`](../../web/app/(admin)/page.tsx#L4)

- Responsive 3-column grid with fixed 200×150px cards and hover/focus states
  [`page.tsx:21`](../../web/app/(admin)/page.tsx#L21)

- Minimal task-list placeholder closes the 404 gap for the 任务 card
  [`tasks/page.tsx:1`](../../web/app/(admin)/tasks/page.tsx#L1)

- Tailwind v4 import preserved in global styles
  [`globals.css:1`](../../web/app/globals.css#L1)
