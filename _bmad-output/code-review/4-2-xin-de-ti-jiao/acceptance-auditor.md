# Acceptance Auditor Findings — Story 4.2 心得提交

- **1. 前端编辑页拒绝 `requires_modification` 状态，与 AC-5 矛盾**
  - 违反：AC-5（“状态为「要求修改」时，学生可查看辅导员反馈并重新提交”）、Task 7.1
  - 证据：`miniprogram/pages/reflection/index.ts` 中 `editableStatuses = ['submitted', 'ai_reviewing']`，非此二者时直接 toast “当前状态不允许修改心得” 并返回；`.wxml` 里为 `requires_modification` 准备的辅导员提示文案因此无法到达。

- **2. 编辑页文案错误暗示 `pending_manual_review` 仍可修改**
  - 违反：AC-5（“一旦进入辅导员复核流程...不可修改”）、Task 7.1
  - 证据：`miniprogram/pages/reflection/index.wxml` 中 `<text wx:if="{{editStatus === 'pending_manual_review'}}">AI 初审未通过，你还有 1 次修改机会</text>`，向学生传达了仍可修改的错误信息。

- **3. `submitReflectionSchema` 未包含 `check_in_id` 校验，偏离 Task 2.2**
  - 违反：Task 2.2（“新增 submitReflectionSchema：校验 check_in_id（uuid）、content”）
  - 证据：`api/src/domains/checkins/checkins.schema.ts` 中 `submitReflectionSchema` 仅校验 `content`；`check_in_id` 的 UUID 校验由 controller 中的 `isUuid` 分散处理，未在 schema 中统一声明。

- **4. AI 初审未在 `submitReflection`/`aiReviewReflection` 层封装 3 秒超时，超时保障依赖具体 LLM Provider**
  - 违反：AD-6、NFR-2、AC-3（“AI 初审在 3 秒内返回或超时降级”）
  - 证据：`api/src/domains/checkins/checkins.service.ts` 直接 `await aiReviewReflection(...)` 仅用 try/catch；`api/src/domains/reviews/reviews.service.ts` 也未对整体调用设置超时；仅在 `api/src/adapters/llm/deepseek.adapter.ts` 中设置了 `AbortSignal.timeout(3000)`。若未来接入其他 provider 或本地规则执行异常，3 秒上限无法保证。

- **5. 空输入（0 字）未触发“字数不足 10 字”的红色边框与提示**
  - 违反：AC-2（“字数不足 10 字时边框变红，提示「再多写一点吧～」”）、UX-15/UX-16
  - 证据：`miniprogram/pages/reflection/index.ts` 的 `validateContent` 仅在 `trimmed.length > 0 && trimmed.length < 10` 时返回错误；`reflection-input` 的 error class 依赖 `contentError`，因此 0 字时边框不变红，默认提示替代了“再多写一点吧～”。

- **6. `textarea maxlength="500"` 使“超过 500 字提示”逻辑不可达**
  - 违反：AC-2（“字数超过 500 字时提示「心得不能超过 500 字」”）
  - 证据：`miniprogram/pages/reflection/index.wxml` 中 `<textarea ... maxlength="500" ... />` 会直接阻止输入超过 500 字；`validateContent` 与 `word-count.error` 中 >500 分支均无法触发。

- **7. 缺少 AI 审核超时/异常降级的自动化测试用例**
  - 违反：Testing Requirements（“AI 审核超时 → 状态降级为 pending_manual_review，接口仍 200”）、NFR-2
  - 证据：`api/tests/checkins.test.ts` 新增的 11 个 reflection 用例覆盖了正常提交、敏感词、修改次数、权限、截止等，但未模拟 `aiReviewReflection` 超时或异常并断言返回 `pending_manual_review`。
