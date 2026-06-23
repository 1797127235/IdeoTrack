# Epic 4 学生打卡流程 — Retrospective

**Date:** 2026-06-23
**Epic:** 4 学生打卡流程
**Stories:** 4.1 定位签到、4.2 心得提交、4.3 打卡结果反馈、4.4 心得提交后修改（1 次）
**Status:** 完成

---

## What Went Well

1. **状态机清晰** — 从 `submitted` → `ai_approved` / `pending_manual_review` / `requires_modification` 的流转在 `checkins.service.ts` 中统一维护，后续 Epic 5/6 可直接复用。
2. **并发安全** — Story 4.2 代码审查后引入了 `SELECT ... FOR UPDATE` + 事务 + `status = ANY(...)` 的 UPDATE 条件，为 4.4 的修改流程打下了基础。
3. **测试覆盖提升** — `checkins.test.ts` 从 Story 4.1 的 10 个用例扩展到 28 个用例，覆盖首次提交、修改、并发、权限、逾期等场景。
4. **前端状态驱动 UI** — 任务详情页、结果页根据 `check_in_status` / `reflection_modified` 等后端状态显示不同按钮，避免前端自行判断业务状态。
5. **Epic 内连续交付** — 4 个 Story 在同一次会话内完成创建、实现、审查、修复，节奏紧凑。

---

## What Could Be Improved

1. **数据库迁移历史** — 当前 `migrate.ts` 是一次性执行全部 SQL，缺乏版本化。Epic 4 新增字段时直接追加在脚本末尾，后续回滚/迁移成本高。
2. **AI 初审 reason 未持久化** — Story 4.2 的 `aiReviewReflection` 返回 `reason`，但只写了 `status`。已 deferred 到 Story 5.1，但若 5.1 间隔较久，可能会遗忘。
3. **小程序运行调试体验** — 开发者工具导入、AppID、后端启动等环境问题多次阻塞验证。建议补充一份 `miniprogram/README.md` 快速开始文档。
4. **UX 摘要长度** — 任务详情页和结果页的心得体摘要长度不一致（100 vs 120），后续应统一为设计系统常量。
5. **错误码文档同步** — `CHECKIN_REFLECTION_ALREADY_MODIFIED` 等新增错误码已写入代码，但未同步到公共 API 文档或测试用例标题中。

---

## Action Items

| # | Action | Owner | Status | Target |
|---|---|---|---|---|
| 1 | 调研并引入 `node-pg-migrate` 或类似迁移工具替代一次性脚本 | Tech Lead | Open | Epic 5 开始前 |
| 2 | 在 Story 5.1 中实现 `check_ins.ai_review_reason` 字段并持久化 AI reason | Dev | Open | Story 5.1 |
| 3 | 补充 `miniprogram/README.md`：导入开发者工具、启动后端、配置 AppID/合法域名 | Dev | Open | 下个 Sprint |
| 4 | 统一小程序心得摘要长度为常量（建议 100 字符） | Dev | Open | Story 5.4 或技术债清理 |
| 5 | 整理 Epic 4 新增错误码到 API 文档 | Tech Writer / Dev | Open | Epic 5 开始前 |

---

## Metrics

- **Stories completed:** 4 / 4
- **Backend tests:** 108 passed
- **Frontend TypeScript:** no errors
- **Code review findings fixed:** 13 patch items from Story 4.2 review
- **Deferred items:** 1（AI reason persistence）
