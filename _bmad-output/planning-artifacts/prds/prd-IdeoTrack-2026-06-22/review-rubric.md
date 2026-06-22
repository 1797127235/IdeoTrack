# PRD Quality Review — 思政打卡 App

## Overall verdict
This PRD is a well-structured, substantively coherent specification for an internship-scope mobile app. The three-role model, user journeys, and MVP scope hang together, and the glossary + ID scheme make it usable by downstream UX/architecture/story workflows. However, several open questions directly affect core implementation mechanics, and one feature (make-up check-ins) is simultaneously shown as in-scope and unresolved. Before development starts, the team needs to resolve the top open items and tighten a few ambiguous FRs—especially the AI pre-review rules and PDF report contents.

## Decision-readiness — adequate
The PRD surfaces real trade-offs in §5 Non-Goals and §6.2 Out of Scope for MVP, and §8 Open Questions contains 10 genuinely unresolved items. A decision-maker can read this and know what is and isn't being built. What holds it back from *strong* is the absence of explicit `[NOTE FOR PM]` callouts at real tensions, and the fact that several high-impact decisions are still buried as open questions rather than resolved.

### Findings
- **[high]** Make-up check-ins are unresolved but already implied. (§4.6 FR-18, §8 Open Question 1) — FR-18 says the calendar shows "已打卡/未打卡/补卡" states, which presumes make-up check-ins exist, but Open Question 1 still asks whether students can make up missed check-ins and what the rules are. *Fix:* Either remove the "补卡" state from FR-18 and defer make-ups to V2, or answer Open Question 1 with explicit rules (e.g., "V1 does not support make-up check-ins; calendar shows only 已打卡/未打卡").
- **[medium]** AI pre-review is described as preset but never marked as a product decision. (§4.5 FR-12, §9 ASSUMPTION-8) — The PRD assumes AI rules are preset without admin configuration, which is a legitimate V1 choice, but it is not called out as a decision or tension. *Fix:* Add a `[NOTE FOR PM]` in §4.5 stating the rationale (e.g., "preset rules keep V1 scope fixed; configurable thresholds deferred to V2").
- **[medium]** Location-data collection is flagged as an assumption, not a risk. (§9 ASSUMPTION-4, §10.2 Security & Privacy) — Collecting and storing student geolocation and written reflections is sensitive in a Chinese university context. The PRD assumes it is allowed but does not surface the compliance/privacy review as a decision gate. *Fix:* Add a `[NOTE FOR PM]` in §9 or §10.2 requiring legal/counsel review before implementation, and document the retention/deletion policy.

## Substance over theater — strong
The content is earned. Personas are minimal (three named protagonists in UJs) and each drives real feature decisions. The Vision is specific to the ideological-education check-in domain rather than generic. NFRs include concrete thresholds (2s, 3s, 5s, bcrypt, HTTPS). There are no forced differentiation or innovation sections.

### Findings
- **[low]** "营造打卡仪式感" is somewhat fluffy. (§4.2 Description) — The phrase does not translate into a measurable requirement. The actual FRs (FR-3 daily quote, FR-11 completion feedback) are concrete enough that the rhetorical flourish is harmless. *Fix:* Either delete the phrase or tie it explicitly to FR-3/FR-11.

## Strategic coherence — strong
The PRD has a clear thesis: reduce friction for students completing mandatory ideological-education check-ins while giving counselors and admins visibility and exportable reports. Feature prioritization follows from that thesis, and the success metrics validate the core loops (completion rate, counselor path efficiency, report export success). Counter-metrics are present and well chosen.

### Findings
- **[medium]** SM-3 "报告导出成功率 100%" is unrealistic even for a demo. (§7 Success Metrics) — A 100% success target ignores network failures, large dataset timeouts, or PDF generation errors. *Fix:* Change target to "≥ 95% under normal conditions" or define "成功" as "server accepts and completes the export job without unhandled errors."
- **[low]** Secondary metrics are more operational than strategic. (§7 Secondary) — SM-4/5/6 are useful but mostly validate implementation quality rather than product value. This is acceptable for an internship project but could be tightened by linking one to user satisfaction or counselor workload reduction.

## Done-ness clarity — adequate
Most FRs include testable consequences, and the requirement structure (description + FRs + consequences + out-of-scope notes) helps. However, several critical features lack the bounds needed for an engineer to know exactly what "done" looks like, particularly around the AI pre-review algorithm, report contents, and some UI feedback behaviors.

### Findings
- **[critical]** Make-up check-in status contradicts scope resolution. (§4.6 FR-18) — The calendar requires a "补卡" state, but the feature itself is listed as an open question. This will block UI and data model design. *Fix:* Resolve as noted under Decision-readiness.
- **[high]** AI "重复内容" detection lacks algorithm or threshold. (§4.5 FR-12) — "与任务原文或常见套话高度重复判定为敷衍" is not testable. What similarity metric? What threshold? What constitutes "常见套话"? *Fix:* Define the implementation rule explicitly, e.g., "Jaccard similarity ≥ 70% with task text or a configurable cliché list; V1 cliché list hardcoded with 50 entries."
- **[medium]** PDF report contents are underspecified. (§4.10 FR-30) — "标题、统计摘要、图表和详细数据表" is too vague. *Fix:* List required sections and chart types (e.g., cover page, summary KPIs, line chart of daily check-in rate, bar chart of college rankings, data table of class-level completion).
- **[medium]** UI feedback behaviors are adjective-driven. (§4.4 FR-11, §4.6 FR-17, §4.5 FR-14) — Phrases like "展示获得的积分、当前连续打卡天数和等级进度," "弹出提示," and "显示原因说明" do not specify screen location, copy, or timing. *Fix:* Add one sentence per FR describing where and how the feedback appears, or attach wireframe references.
- **[medium]** "异常数据点" definition missing. (§4.10 FR-29) — The system must flag abnormal data points but no rule is given. *Fix:* Define anomaly criteria, e.g., "daily check-in rate drops by ≥ 20 percentage points compared to the prior 7-day average."
- **[low]** Badge acquisition timing unclear. (§4.6 FR-17) — It is unclear whether a badge is awarded at the moment the 7th/30th consecutive check-in is approved or at end-of-day. *Fix:* Specify "awarded immediately upon approval of the qualifying check-in."

## Scope honesty — adequate
The PRD is generally honest about what is out of scope. §5 Non-Goals lists 12 deferred items with clear rationale, and §6.2 Out of Scope for MVP adds a table with reasons and future plans. §9 Assumptions Index captures 8 key assumptions. The main issue is that some unresolved questions silently leak into FRs, and the density of open items is high for a document that may be used to green-light an internship build.

### Findings
- **[high]** Open Question density is high for implementation readiness. (§8) — 10 open questions include several that affect data models and workflows: make-up rules (Q1), level persistence after streak break (Q2), whether students can edit reflections before counselor review (Q6), whether iOS and Android are both supported (Q10). *Fix:* Schedule a 30-minute product Q&A to resolve Q1, Q2, Q6, and Q10 before architecture; the remainder can be punted if they are truly cosmetic.
- **[medium]** Rich-text tasks are unresolved but affect implementation. (§8 Open Question 5) — Whether tasks support rich text (images, videos) changes the content schema and rendering layer significantly. *Fix:* Make an explicit V1 decision: "V1 tasks are plain text only; rich text deferred to V2."
- **[medium]** Leaderboard inclusion rule is unresolved. (§8 Open Question 7) — Whether "审核中" and "未通过" check-ins count toward class ranking affects the ranking query. *Fix:* Specify the rule, e.g., "class ranking counts only 已通过 check-ins as completed."
- **[low]** Report watermark/approval workflow is unresolved. (§8 Open Question 8) — Lower priority for an internship demo, but should be decided. *Fix:* State "V1 reports do not require approval or watermarks; plain PDF/Excel export."

## Downstream usability — strong
The PRD is built for downstream extraction. §3 Glossary defines domain nouns consistently. FR-1 through FR-33, UJ-1 through UJ-3, and SM-1 through SM-6 + SM-C1/C2 are contiguous and unique. FR sections cross-reference the UJs they realize. Each UJ has a named protagonist and carries context inline.

### Findings
- **[low]** "补卡" appears as a state in FR-18 but is not in the glossary. (§3 Glossary, §4.6 FR-18) — Minor drift; once the make-up question is resolved, add or remove the term from the glossary accordingly.
- **[low]** "常见套话" in FR-12 is undefined. (§4.5 FR-12) — Either define it in the glossary or replace with the concrete mechanism once decided.

## Shape fit — strong
The PRD shape matches the product: a multi-stakeholder education mobile app. UJs with named protagonists are load-bearing and appropriately dense. The capability-list sections for counselors and admins are justified by their distinct roles. The rigor level fits an internship project aiming for "complete features + good UI/UX."

### Findings
- None.

## Mechanical notes
- **Glossary drift:** "补卡" and "常见套话" are used but not defined; otherwise terminology is consistent.
- **ID continuity:** FRs 1–33, UJs 1–3, SMs 1–6 + C1–C2 are contiguous and unique. Cross-references from FRs to UJs resolve correctly.
- **Assumptions Index roundtrip:** 8 assumptions are listed in §9, and all map to inline content. However, the inline text does not use `[ASSUMPTION: …]` tags, so future edits may desync the index.
- **UJ protagonist naming:** All three UJs have named protagonists (小林，王老师，李主任) and carry context inline.
- **Required sections:** Vision, target users, glossary, features, non-goals, MVP scope, success metrics, open questions, assumptions, and NFRs are all present for the agreed stakes.
