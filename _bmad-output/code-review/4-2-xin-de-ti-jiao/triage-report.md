# Code Review Triage Report — Story 4.2 心得提交

## Review Summary

- **Story:** `4-2-xin-de-ti-jiao`（心得提交）
- **Review mode:** full（with spec）
- **Spec:** `_bmad-output/implementation-artifacts/4-2-xin-de-ti-jiao.md`
- **Diff baseline:** `45e746a8b9c0eba89e461365019ab8ec2e4a0123` + working tree + relevant untracked files
- **Layers run:** Blind Hunter, Edge Case Hunter, Acceptance Auditor（all completed）
- **Raw findings:** 18（Blind Hunter）+ 6（Edge Case Hunter）+ 7（Acceptance Auditor）= 31
- **After deduplication:** 25 distinct issues
- **Classification:** 14 patch, 1 decision_needed, 6 defer, 4 dismiss

---

## Must Fix — `patch` (14)

### P1. 前端/后端对 `requires_modification` 状态处理不一致
- **Source:** blind + edge + auditor
- **Location:** `miniprogram/pages/reflection/index.ts:71-83`, `miniprogram/pages/checkin/result/index.ts:20-23`
- **Detail:** 后端 `checkins.service.ts` 对 `requires_modification` 状态显式允许无限次重新提交（Story 5.5 辅导员要求修改场景），但小程序 `reflection/index.ts` 的 `editableStatuses` 只含 `['submitted', 'ai_reviewing']`，会直接 toast “当前状态不允许修改心得” 并返回；`result/index.ts` 的 `canModifyReflection` 同样排除了 `requires_modification`。这导致学生在辅导员要求修改后无法进入编辑页，形成功能死锁。同时 `result/index.ts` 的 `VALID_STATUSES` 也拒绝 `requires_modification`，会把合法状态当作无效参数。
- ** violates:** AC-5、Task 7.1
- **Suggested fix:** 将 `'requires_modification'` 同时加入 `reflection/index.ts` 的 `editableStatuses`、`result/index.ts` 的 `canModifyReflection` 可编辑状态列表以及 `VALID_STATUSES`。

### P2. 编辑页文案错误暗示 `pending_manual_review` 仍可修改
- **Source:** auditor
- **Location:** `miniprogram/pages/reflection/index.wxml:22`
- **Detail:** 当 `editStatus === 'pending_manual_review'` 时显示 “AI 初审未通过，你还有 1 次修改机会”，但 AC-5 明确“一旦进入辅导员复核流程（`pending_manual_review`），学生不可修改”。
- **Suggested fix:** 移除或修改该文案，明确告知学生“已进入辅导员复核，暂不可修改”。

### P3. 并发提交可突破“仅允许修改 1 次”限制
- **Source:** blind + edge
- **Location:** `api/src/domains/checkins/checkins.service.ts:119-148`
- **Detail:** `submitReflection` 先 `SELECT` 读取 `reflection_modified`，再据此分支判断，最后执行 `UPDATE`。整个过程无事务/`FOR UPDATE`/乐观锁。两个并发请求可能同时读到 `reflection_modified = false`，都通过校验并执行更新，导致实际修改次数超过 1 次。
- **Suggested fix:** 使用数据库事务包裹 SELECT + UPDATE，并 `SELECT ... FOR UPDATE`；或在 UPDATE 的 WHERE 子句中加入 `reflection_modified = false` 谓词，通过 affected rows 判断竞争结果。

### P4. 状态流转拆分为两次非原子更新
- **Source:** blind + edge
- **Location:** `api/src/domains/checkins/checkins.service.ts:138-180`
- **Detail:** 服务先把状态更新为 `ai_reviewing` 并清空原因，等待 AI 审核后再更新为最终状态。若进程崩溃、第二次 UPDATE 失败或请求超时，记录会长期停留在 `ai_reviewing` 且无原因、无自动恢复。
- **Suggested fix:** 将两次更新纳入同一事务；或先执行 AI 审核，再一次性 UPDATE 到最终状态、内容和原因。

### P5. `submitReflection` 层未保证 3 秒 AI 审核超时
- **Source:** blind + edge + auditor
- **Location:** `api/src/domains/checkins/checkins.service.ts:155-164`
- **Detail:** 当前直接 `await aiReviewReflection(...)` 并 try/catch。虽然 DeepSeek adapter 内部有 3000ms timeout，但 `aiReviewReflection` 整体（本地规则 + 任意 provider）没有统一超时；若本地规则或未来 provider 挂起，HTTP 请求会无限期阻塞。
- ** violates:** AD-6、NFR-2、AC-3
- **Suggested fix:** 在 `submitReflection` 或 `aiReviewReflection` 层用 `Promise.race` 包装，确保 3 秒内未返回即降级为 `pending_manual_review`。

### P6. LLM 异常时 `reviews.service.ts` 错误降级为 `ai_approved`
- **Source:** blind
- **Location:** `api/src/domains/reviews/reviews.service.ts:165-175`
- **Detail:** 当 LLM provider 抛异常时，`reviews.service.ts` 捕获后 fall through 到 `return { status: 'ai_approved', reason: 'AI 初审通过' }`。虽然 `checkins.service.ts` 能捕获 `aiReviewReflection` 抛出的异常，但如果 `aiReviewReflection` 内部吞掉 LLM 异常并正常返回 `ai_approved`，则会出现“AI 异常却初审通过”的错误状态。
- ** violates:** AD-6、AC-3（AI 异常应降级到人工复核）
- **Suggested fix:** LLM 异常时返回 `{ status: 'pending_manual_review', reason: 'AI 语义审核异常，转人工复核' }`，而不是 `ai_approved`。

### P7. `submitReflectionSchema` 未校验 `check_in_id`
- **Source:** auditor
- **Location:** `api/src/domains/checkins/checkins.schema.ts:11-15`
- **Detail:** 规范 Task 2.2 要求 schema 同时校验 `check_in_id`（uuid）和 `content`。当前 schema 只校验 `content`，UUID 校验被分散到 controller 的 `isUuid` 中。
- **Suggested fix:** 在 `submitReflectionSchema` 中加入 `check_in_id: z.string().uuid()`，并让 controller 复用 schema 解析结果。

### P8. 空输入（0 字）未触发“字数不足”红色边框与提示
- **Source:** auditor
- **Location:** `miniprogram/pages/reflection/index.ts:125-134`
- **Detail:** `validateContent` 仅在 `trimmed.length > 0 && trimmed.length < 10` 时返回错误，0 字时返回空字符串，导致边框不变红，且默认提示替代了“再多写一点吧～”。
- ** violates:** AC-2、UX-15/UX-16
- **Suggested fix:** 当 `trimmed.length === 0` 时也返回“再多写一点吧～”，或至少让边框变红。

### P9. `textarea maxlength="500"` 使“超过 500 字提示”逻辑不可达
- **Source:** auditor
- **Location:** `miniprogram/pages/reflection/index.wxml:34-42`, `miniprogram/pages/reflection/index.ts:125-134`
- **Detail:** `maxlength="500"` 会直接阻止输入超过 500 字，导致 `validateContent` 中 >500 分支和 `word-count.error` 样式永远不会触发。
- ** violates:** AC-2
- **Suggested fix:** 二选一：① 移除 `maxlength`，完全依赖 `validateContent` 给出“心得不能超过 500 字”；② 保留 `maxlength` 并删除 >500 分支，把字数提示改为“已达 500 字上限”。

### P10. 缺少 `requires_modification` 重提交的自动化测试
- **Source:** blind
- **Location:** `api/tests/checkins.test.ts`
- **Detail:** 后端显式允许 `requires_modification` 无限次重新提交，但测试用例未覆盖此路径，且前端当前与之矛盾。
- **Suggested fix:** 添加测试：构造 `requires_modification` 状态的打卡，调用 reflection 接口应成功并可多次更新。

### P11. 缺少 AI 审核超时/异常降级的自动化测试
- **Source:** auditor
- **Location:** `api/tests/checkins.test.ts`
- **Detail:** Testing Requirements 明确要求覆盖“AI 审核超时 → 状态降级为 `pending_manual_review`，接口仍 200”。当前 11 个 reflection 用例未模拟该场景。
- **Suggested fix:** 使用 `vi.mock`/`vi.spyOn` 让 `aiReviewReflection` 抛出异常或挂起，断言返回 200 且状态为 `pending_manual_review`。

### P12. 复核原因文案硬编码依赖服务端字符串
- **Source:** blind
- **Location:** `miniprogram/pages/reflection/index.ts:10-26`
- **Detail:** `getReviewReasonText` 直接 switch 服务端原因字符串（如“字数不足”“包含敏感内容”）。一旦服务端文案调整，前端提示会失效或显示默认文案。
- **Suggested fix:** 服务端返回结构化的原因码（如 `reason_code`），前端根据 code 映射文案；或在 reasons 上加常量约定。

### P13. UUID 正则校验在多个页面重复定义
- **Source:** blind
- **Location:** `miniprogram/pages/reflection/index.ts:4-8`, `miniprogram/pages/checkin/result/index.ts:3-8`
- **Detail:** 两个页面都各自定义了 `UUID_RE` 和 `isUuid`。
- **Suggested fix:** 抽到公共工具（如 `miniprogram/utils/validators.ts`）。

### P14. 输入校验顺序：controller 在认证检查前解析 body
- **Source:** blind
- **Location:** `api/src/domains/checkins/checkins.controller.ts:39-49`
- **Detail:** `submitReflectionController` 先调用 schema.safeParse，再检查 `req.user`。由于 `authenticate` 中间件已在路由层运行，实际未认证请求不会进入 controller；但 controller 内部顺序仍不够防御性。
- **Suggested fix:** 将 `if (!req.user)` 提前到 schema 解析之前，或依赖中间件保证并删除重复检查。

---

## Needs Human Decision — `decision_needed` (1)

### D1. 结果页显示固定/伪造的积分与等级数据
- **Source:** blind
- **Location:** `miniprogram/pages/checkin/result/index.wxml:35-51`
- **Detail:** 结果页硬编码显示 “+10 积分”“1 连续天数”“10% 等级进度”及“积分待发放”。这些数据未从后端获取，可能误导用户。AC-4 要求显示这些信息，但未明确是否可以是静态占位。Story 4.3 已预实现页面结构，但当前实现仍展示固定数值。
- **Question:** V1 是否接受这些静态占位数据？还是应隐藏/替换为“积分待发放”等占位文案，或从后端真实接口获取？

---

## Defer — `defer` (6)

### F1. 敏感词/套话检测使用朴素子串匹配
- **Source:** blind
- **Detail:** `reviews.service.ts` 使用 `includes` 匹配敏感词和套话，容易误伤（如“赌博危害”中的“赌博”）且易被绕开。属于 V1 规则引擎的已知局限，可在后续迭代中引入分词/评分/语义模型。

### F2. Jaccard 字符相似度指标不适用于中文
- **Source:** blind
- **Detail:** 使用字符集合 Jaccard 判断与任务内容相似度，阈值 0.7 缺乏经验依据。可在后续改为基于词/句向量的语义相似度。

### F3. 未对 reflection 接口做限流/滥用防护
- **Source:** blind
- **Detail:** 学生可重复调用提交/修改心得，触发 LLM 调用和 DB 写入。应后续在网关或路由层增加限流。

### F4. 缺少独立的 AI 审核审计日志
- **Source:** blind
- **Detail:** `ai_review_reason` 只保存在当前 check-in 行，无法追溯每次提交与最终结果的对应关系。后续可引入审计表。

### F5. 用户输入未做服务端清洗，存在跨客户端 XSS 隐患
- **Source:** blind
- **Detail:** `reflection_content` 原样存储并在 WXML 中渲染（WXML 的 `{{}}` 已自动转义，当前小程序安全）。若未来在 web 管理端、导出或通知中渲染同一份数据，需做 HTML/富文本清洗。

### F6. 新建索引暂无对应查询
- **Source:** blind
- **Location:** `api/src/scripts/migrate.ts`
- **Detail:** `idx_check_ins_reflection_status` 是为后续辅导员复核列表预留的，本次 diff 中无查询使用。属于规范中标注的“可选索引”，可保留。

---

## Dismissed — `dismiss` (4)

### X1. 输入校验发生在认证之前
- **Source:** blind
- **Reason:** `authenticate` 中间件已在路由层执行，未认证请求不会进入 controller；controller 内的 `req.user` 检查只是防御性补充。不算真实问题。

### X2. 截止校验委托给“不透明 helper”
- **Source:** blind
- **Reason:** `assertTaskVisibleToStudent` 是项目中已存在的明确函数，且测试已验证会抛出 `CHECKIN_DEADLINE_PASSED`。helper 行为可知。

### X3. `checkInId` 与 `taskId` 指向不同任务
- **Source:** edge
- **Reason:** 后端接口只接收 `checkInId`，`taskId` 来自该 check-in 记录本身（`fetchTaskById(checkIn.task_id)`），不存在用户传入 taskId 导致错配。

### X4. 直接 API 调用绕过 schema 校验导致可存储超长内容
- **Source:** edge
- **Reason:** 路由最终调用 `submitReflectionController`，该 controller 使用 `submitReflectionSchema.safeParse` 校验 content；schema 限制 10-500 字。不存在绕过。

---

## Next Steps

1. 处理 14 个 `patch` 项（建议按 P1/P2/P3/P4/P5/P6/P7/P8/P9/P10/P11 顺序修复功能与测试，再处理 P12/P13/P14 代码质量项）。
2. 对 D1 做出产品决策。
3. 修复后重新运行 `npm test` 与 `npm run build`。
4. 如需，可进入 checkpoint preview 或人工复核。
