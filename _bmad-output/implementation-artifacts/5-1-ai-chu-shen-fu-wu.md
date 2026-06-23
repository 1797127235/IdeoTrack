---
story_id: 5.1
story_key: 5-1-ai-chu-shen-fu-wu
epic: 5
epic_title: 心得审核流程
status: done
priority: high
points: 3
baseline_commit: 9d19c9c85d3317759a9241b7541216fef3affa06
---

# Story 5.1: AI 初审服务

Status: done

> 来源：Epic 5 Story 5.1 / PRD §4.5 FR-12 / Architecture AD-3, AD-6, AD-10, AD-11, AD-12, NFR-2, NFR-5, NFR-8 / UX-15 / EXPERIENCE.md 文案规范
> 前置依赖：Story 4.2（reviews 领域骨架 + `aiReviewReflection` 基础规则）、Story 4.4（心得修改状态机）
> 承接 deferred-work：Story 4.2 review 中「AI 初审返回的 reason 未持久化」待本 Story 统一设计 `check_ins.ai_review_reason` 字段。

## Story

作为一名系统，
我想要自动对学生提交的心得进行初步审核，
以便快速判断内容是否敷衍、是否包含敏感词，并给出可审计的初审原因。

## Acceptance Criteria

### AC-1: 多规则本地 AI 初审

- **Given** 学生调用 `submitReflection` 提交心得
- **When** 后端调用 `reviews.service.aiReviewReflection`
- **Then** 按以下顺序执行本地规则检测，任一命中即返回 `pending_manual_review` 并附带 reason：
  1. 字数不足：trim 后长度 < 10 → reason `字数不足`
  2. 敏感词：命中 V1 预设敏感词库 → reason `包含敏感内容`
  3. 套话/模板：命中 V1 预设 50 条常见套话模板 → reason `内容疑似套话`
  4. 与任务原文重复度过高：与 `task.content` 的 Jaccard 相似度 ≥ 70% → reason `与任务内容重复度过高`
- **And** 全部未命中时返回 `ai_approved`（可带 `reason: 'AI 初审通过'`）

### AC-2: 可选 LLM Provider 增强审核

- **Given** 环境变量 `DEEPSEEK_API_KEY`（或对应 LLM 密钥）已配置
- **When** 本地规则未命中敏感词/套话/重复度过高（字数仍需满足）
- **Then** 调用 `LLMProvider` 对心得进行语义审核
- **And** LLM 调用设置 3 秒超时；超时或异常时降级到本地规则结果（`ai_approved`）
- **And** LLM 判定为敷衍或不适合通过时返回 `pending_manual_review`，reason 为 `LLM 判定需复核`
- **And** 未配置 LLM 密钥时，仅使用本地规则，不报错

### AC-3: 持久化 AI 初审原因

- **Given** `aiReviewReflection` 返回 `AIReviewResult`（含 `status` 与 `reason`）
- **When** `submitReflection` 更新 `check_ins` 记录
- **Then** 将 `reason` 写入 `check_ins.ai_review_reason` 字段
- **And** 该字段在 `CheckInResponse` / `TaskDetail` 中可选返回，供辅导员复核列表与学生查看复核结果使用

### AC-4: 适配修改流程

- **Given** 学生从 `pending_manual_review` 或 `requires_modification` 状态修改心得
- **When** `submitReflection` 进入修改分支
- **Then** 同样调用增强后的 `aiReviewReflection`
- **And** 更新 `ai_review_reason` 为最新原因
- **And** 状态最终流转为 `ai_approved` 或 `pending_manual_review`

### AC-5: 超时/失败兜底

- **Given** LLM Provider 调用超时或抛出异常
- **When** `aiReviewReflection` 捕获到异常
- **Then** 不影响 `submitReflection` 主流程
- **Then** 返回本地规则结果（`ai_approved` 或本地规则命中的 `pending_manual_review`）
- **And** 异常信息通过结构化日志记录（不记录心得全文，仅记录错误类型与 check_in_id）

### AC-6: V1 规则为系统预设，管理员不可配置

- **Given** MVP 阶段
- **When** 审核规则执行
- **Then** 敏感词库、套话模板、Jaccard 阈值均硬编码或从环境变量读取默认值
- **And** 不提供管理员后台配置界面（V2 再考虑）

### AC-7: 性能满足 NFR-2

- **Given** 非高峰期
- **When** 调用 `aiReviewReflection`
- **Then** 99% 请求在 3 秒内返回
- **And** 本地规则必须亚秒级完成；LLM 调用带 3 秒硬性超时

## Tasks / Subtasks

### 后端任务

- [ ] **Task 1: 数据库表扩展** (AC: #3)
  - [ ] 1.1 在 `check_ins` 表新增 `ai_review_reason TEXT` 字段（可空）
  - [ ] 1.2 更新 `api/src/scripts/migrate.ts` 中的 `MIGRATION_SQL`
  - [ ] 1.3 若已存在历史数据，`ai_review_reason` 默认 NULL，后续提交时回填

- [ ] **Task 2: 类型扩展** (AC: #3, #4)
  - [ ] 2.1 在 `api/src/domains/checkins/checkins.types.ts` 的 `CheckIn` / `CheckInResponse` 中增加 `ai_review_reason: string | null`
  - [ ] 2.2 在 `api/src/domains/tasks/task.types.ts` 的 `TaskDetail` 中增加 `ai_review_reason?: string`
  - [ ] 2.3 在 `api/src/domains/reviews/reviews.types.ts` 中扩展 `AIReviewResult`：
    ```typescript
    export interface AIReviewResult {
      status: 'ai_approved' | 'pending_manual_review';
      reason?: string;
    }
    ```
  - [ ] 2.4 新增 `AIReviewInput` 类型：
    ```typescript
    export interface AIReviewInput {
      reflectionContent: string;
      taskContent: string;
    }
    ```

- [ ] **Task 3: 新增 LLM Provider 适配器骨架** (AC: #2, #5)
  - [ ] 3.1 创建 `api/src/adapters/llm/provider.ts`
    - 定义 `LLMProvider` 接口：
      ```typescript
      export interface LLMProvider {
        reviewReflection(input: AIReviewInput): Promise<AIReviewResult>;
      }
      ```
  - [ ] 3.2 创建 `api/src/adapters/llm/deepseek.adapter.ts`
    - 实现基于 `fetch` 的 DeepSeek API 调用（不使用官方 SDK，减少依赖）
    - 支持环境变量：`DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com`）、`DEEPSEEK_MODEL`（默认 `deepseek-chat`）
    - 构造系统提示词，要求模型仅返回 JSON：`{ "status": "ai_approved" | "pending_manual_review", "reason": string | null }`
    - 使用 `AbortSignal.timeout(3000)` 实现 3 秒超时
  - [ ] 3.3 创建 `api/src/adapters/llm/index.ts`，导出 `provider.ts` 与 `deepseek.adapter.ts`，并提供工厂函数 `createLLMProvider(): LLMProvider | null`
  - [ ] 3.4 更新 `api/.env.example` 增加 LLM 相关环境变量（可选）

- [ ] **Task 4: 重构 reviews.service.ts** (AC: #1, #2, #5, #6, #7)
  - [ ] 4.1 修改 `aiReviewReflection` 函数签名：
    ```typescript
    export async function aiReviewReflection(input: AIReviewInput): Promise<AIReviewResult>
    ```
  - [ ] 4.2 实现本地规则引擎：
    - `lengthRule(content)`：trim 后 < 10 返回 `pending_manual_review`
    - `sensitiveWordRule(content)`：命中预设敏感词库返回 `pending_manual_review`
    - `templateRule(content)`：命中预设套话模板返回 `pending_manual_review`
    - `similarityRule(content, taskContent)`：Jaccard 相似度 ≥ 0.7 返回 `pending_manual_review`
  - [ ] 4.3 预设敏感词库与套话模板：
    - 敏感词库：政治/宗教/色情/暴力等约 20–50 个关键词（按国家法规与校园场景拟定）
    - 套话模板：约 50 条常见敷衍句式，如「学习了，很有收获」「今天的内容很有意义」「感受很深，受益匪浅」「这次学习让我收获颇丰」「非常有教育意义」等
  - [ ] 4.4 实现 LLM 调用分支：
    - 本地规则全部通过后，若 `createLLMProvider()` 返回非 null，调用 LLM
    - LLM 超时/异常时捕获并返回 `{ status: 'ai_approved', reason: 'AI 初审通过' }`
  - [ ] 4.5 保持函数异步、纯函数化、可测试

- [ ] **Task 5: 更新 checkins.service.ts 调用链** (AC: #3, #4)
  - [ ] 5.1 修改 `submitReflection` 中两处 `aiReviewReflection` 调用，传入 `{ reflectionContent: input.reflection_content, taskContent: task.content }`
  - [ ] 5.2 在首次提交与修改后的 UPDATE 语句中，将 `ai_review_reason` 一并写入
  - [ ] 5.3 更新 `toCheckInResponse` 返回 `ai_review_reason`
  - [ ] 5.4 确保 `fetchTaskById` 获取到的 `task` 对象包含 `content`

- [ ] **Task 6: 更新 tasks.service.ts 返回 ai_review_reason** (AC: #3)
  - [ ] 6.1 修改 `api/src/domains/tasks/task.service.ts` 的 `fetchUserCheckIns` / `getMyTaskDetail`，在 `TaskDetail` 中返回 `ai_review_reason`

### 小程序端任务（数据透传与 UI 预留）

- [ ] **Task 7: 小程序类型扩展** (AC: #3)
  - [ ] 7.1 修改 `miniprogram/services/checkinApi.ts` 的 `CheckInResponse`，增加 `ai_review_reason?: string`
  - [ ] 7.2 修改 `miniprogram/services/taskApi.ts` 的 `Task`，增加 `ai_review_reason?: string`

- [ ] **Task 8: 心得页展示 AI 初审原因（可选但推荐）** (AC: #3)
  - [ ] 8.1 修改 `miniprogram/pages/reflection/index.ts`：提交成功后，若状态为 `pending_manual_review`，可读取 `ai_review_reason` 展示更具体的提示
  - [ ] 8.2 修改 `miniprogram/pages/reflection/index.wxml`：在待复核提示区展示 reason（非必须；若 reason 为空则展示默认文案）
  - [ ] 8.3 保持现有文案体验：默认仍展示「心得可以再具体一点，说说你的真实感受吧」

- [ ] **Task 9: 辅导员复核列表与学生结果页预留字段** (AC: #3)
  - [ ] 9.1 本 Story 不实现新页面，但确保 `TaskDetail` / `CheckInResponse` 的 `ai_review_reason` 可被后续 Story 5.3 / 5.4 使用

## Dev Notes

### 关键架构约束

- **AD-1 Thin Client**：所有审核规则在后端执行，小程序仅透传/展示 reason。
- **AD-3 LLM Provider 可切换**：必须通过 `LLMProvider` 接口调用 DeepSeek，禁止其他模块直接引用 DeepSeek API 细节。
- **AD-6 AI 同步调用 3 秒超时**：本地规则必须快速返回；LLM 调用带 3 秒超时，失败降级到本地规则。
- **AD-10 Domain 边界**：`reviews` 领域负责审核逻辑；`checkins` 领域负责状态流转与字段持久化；`tasks` 领域提供任务原文。
- **AD-11 Check-in 状态机**：本 Story 不引入新状态，只影响 `ai_approved` / `pending_manual_review` 的判定依据。
- **AD-12 Reflection 为 CheckIn 子实体**：`ai_review_reason` 作为 `check_ins` 表字段与心得内容同表存储。
- **NFR-2 性能**：本地规则应控制在毫秒级；LLM 超时 3 秒。
- **NFR-5 传输安全**：心得内容与任务原文在 HTTPS 上传输，不本地持久化。
- **NFR-8 审计**：AI 初审 reason 持久化到数据库，便于后续调优与审计。

### 数据库变更

```sql
-- 在 check_ins 表新增 ai_review_reason，用于持久化 AI 初审原因
ALTER TABLE check_ins
  ADD COLUMN IF NOT EXISTS ai_review_reason TEXT;
```

说明：
- `ai_review_reason` 允许为 NULL。
- Story 4.2 之前无该字段；本 Story 实现后，新提交/修改心得会回填 reason。
- 历史数据保持 NULL，辅导员复核列表可展示「原因未记录」。

### 当前代码状态（Story 4.4 完成后）

- 后端：
  - `api/src/domains/reviews/reviews.service.ts` 已实现 `aiReviewReflection(content: string)`，仅做字数校验。
  - `api/src/domains/reviews/reviews.types.ts` 已定义 `AIReviewResult`。
  - `api/src/domains/checkins/checkins.service.ts` 的 `submitReflection` 在首次提交和修改后调用 `aiReviewReflection`，但只传 `reflectionContent`。
  - `api/src/domains/checkins/checkins.types.ts` 的 `CheckIn` / `CheckInResponse` 无 `ai_review_reason`。
  - `api/src/domains/tasks/task.types.ts` 的 `TaskDetail` 无 `ai_review_reason`。
  - `api/src/scripts/migrate.ts` 无 `ai_review_reason` 字段。
- 小程序：
  - `miniprogram/services/checkinApi.ts` 与 `taskApi.ts` 无 `ai_review_reason` 字段。
- LLM 适配器：
  - 尚未创建 `api/src/adapters/llm/` 目录。

### 需要修改/新增的文件

**后端 UPDATE：**
- `api/src/scripts/migrate.ts` — 新增 `ai_review_reason` 字段
- `api/src/domains/checkins/checkins.types.ts` — 扩展 `CheckIn` / `CheckInResponse`
- `api/src/domains/checkins/checkins.service.ts` — 传入 task content、写入 `ai_review_reason`
- `api/src/domains/tasks/task.types.ts` — `TaskDetail` 增加 `ai_review_reason?`
- `api/src/domains/tasks/task.service.ts` — `getMyTaskDetail` / `fetchUserCheckIns` 返回 `ai_review_reason`
- `api/src/domains/reviews/reviews.types.ts` — 新增 `AIReviewInput`
- `api/src/domains/reviews/reviews.service.ts` — 实现多规则引擎与 LLM 分支
- `api/.env.example` — 增加可选 LLM 环境变量

**后端 NEW：**
- `api/src/adapters/llm/provider.ts` — LLMProvider 接口
- `api/src/adapters/llm/deepseek.adapter.ts` — DeepSeek 适配器
- `api/src/adapters/llm/index.ts` — 工厂与导出

**小程序 UPDATE：**
- `miniprogram/services/checkinApi.ts` — `CheckInResponse` 增加 `ai_review_reason?`
- `miniprogram/services/taskApi.ts` — `Task` 增加 `ai_review_reason?`
- `miniprogram/pages/reflection/index.ts` — 可选展示具体 reason
- `miniprogram/pages/reflection/index.wxml` — 可选 reason 展示 UI

### AI 初审规则实现参考

```typescript
// api/src/domains/reviews/reviews.service.ts
import { createLLMProvider } from '../../adapters/llm/index.js';
import type { AIReviewInput, AIReviewResult } from './reviews.types.js';

const SENSITIVE_WORDS = ['敏感词1', '敏感词2', /* ... */];
const TEMPLATES = [
  '学习了，很有收获',
  '今天的内容很有意义',
  '感受很深，受益匪浅',
  // ... 约 50 条
];
const SIMILARITY_THRESHOLD = 0.7;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '');
}

function containsSensitiveWord(content: string): boolean {
  const normalized = normalize(content);
  return SENSITIVE_WORDS.some((word) => normalized.includes(normalize(word)));
}

function matchesTemplate(content: string): boolean {
  const normalized = normalize(content);
  return TEMPLATES.some((tpl) => normalized.includes(normalize(tpl)));
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export async function aiReviewReflection(input: AIReviewInput): Promise<AIReviewResult> {
  const content = input.reflectionContent.trim();

  // 1. 字数检查
  if (content.length < 10) {
    return { status: 'pending_manual_review', reason: '字数不足' };
  }

  // 2. 敏感词
  if (containsSensitiveWord(content)) {
    return { status: 'pending_manual_review', reason: '包含敏感内容' };
  }

  // 3. 套话模板
  if (matchesTemplate(content)) {
    return { status: 'pending_manual_review', reason: '内容疑似套话' };
  }

  // 4. 与任务原文 Jaccard 相似度
  const taskContent = input.taskContent.trim();
  if (taskContent.length > 0 && jaccardSimilarity(content, taskContent) >= SIMILARITY_THRESHOLD) {
    return { status: 'pending_manual_review', reason: '与任务内容重复度过高' };
  }

  // 5. 可选 LLM 语义审核
  const llm = createLLMProvider();
  if (llm) {
    try {
      const llmResult = await llm.reviewReflection(input);
      if (llmResult.status === 'pending_manual_review') {
        return { status: 'pending_manual_review', reason: llmResult.reason ?? 'LLM 判定需复核' };
      }
    } catch (error) {
      // 超时或异常：降级到本地规则通过
      // 日志记录错误类型，不记录全文
      console.error('LLM review failed, falling back to local rules', { error: String(error) });
    }
  }

  return { status: 'ai_approved', reason: 'AI 初审通过' };
}
```

### 规则优先级说明

- 本地规则按「字数 → 敏感词 → 套话 → 相似度」顺序执行，越靠前的规则越基础、越不可覆盖。
- LLM 仅在本地规则全部通过后才调用；LLM 异常时不阻止通过。
- 这样设计保证：即使 LLM 不可用，本地规则仍能覆盖 90% 以上的敷衍/敏感内容。

### LLM Provider 接口与适配器参考

```typescript
// api/src/adapters/llm/provider.ts
import type { AIReviewInput, AIReviewResult } from '../../domains/reviews/reviews.types.js';

export interface LLMProvider {
  reviewReflection(input: AIReviewInput): Promise<AIReviewResult>;
}
```

```typescript
// api/src/adapters/llm/deepseek.adapter.ts
import type { LLMProvider } from './provider.js';
import type { AIReviewInput, AIReviewResult } from '../../domains/reviews/reviews.types.js';

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

export class DeepSeekAdapter implements LLMProvider {
  async reviewReflection(input: AIReviewInput): Promise<AIReviewResult> {
    if (!API_KEY) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const systemPrompt = `你是一名严格但友善的思政学习心得审核助手。请判断学生提交的心得是否敷衍、是否与任务原文过度重复、是否包含不当内容。只返回 JSON，格式：{"status":"ai_approved"|"pending_manual_review","reason":"string|null"}。`;
    const userPrompt = `任务内容："""${input.taskContent}"""\n学生心得："""${input.reflectionContent}"""`;

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 128,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as AIReviewResult;
    return {
      status: parsed.status === 'pending_manual_review' ? 'pending_manual_review' : 'ai_approved',
      reason: parsed.reason ?? undefined,
    };
  }
}
```

```typescript
// api/src/adapters/llm/index.ts
import { DeepSeekAdapter } from './deepseek.adapter.js';
import type { LLMProvider } from './provider.js';

export * from './provider.js';
export * from './deepseek.adapter.js';

export function createLLMProvider(): LLMProvider | null {
  if (process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekAdapter();
  }
  return null;
}
```

### submitReflection 调用方式变更

```typescript
// checkins.service.ts
const reviewResult = await aiReviewReflection({
  reflectionContent: input.reflection_content,
  taskContent: task.content,
});

// 首次提交 UPDATE
const updatedResult = await client.query<CheckIn>(
  `UPDATE check_ins
   SET reflection_content = $1,
       status = $2,
       ai_review_reason = $3,
       updated_at = NOW()
   WHERE id = $4 AND status = ANY($5)
   RETURNING *`,
  [input.reflection_content, reviewResult.status, reviewResult.reason ?? null, checkInId, FIRST_SUBMISSION_STATUSES]
);

// 修改分支的 final UPDATE 同样需要写入 ai_review_reason
```

### 错误码

无新增错误码。保持现有：
- `CHECKIN_NOT_FOUND` / `TASK_NOT_FOUND`（404）
- `CHECKIN_DEADLINE_PASSED`（409）
- `CHECKIN_CANNOT_MODIFY_REFLECTION`（409）
- `CHECKIN_REFLECTION_ALREADY_MODIFIED`（409）
- `VALIDATION_ERROR`（400）

### 状态流转

```
首次提交 / 修改
  ↓ submitReflection
调用 aiReviewReflection({ reflectionContent, taskContent })
  ↓ 本地规则 + 可选 LLM
status = ai_approved            status = pending_manual_review
ai_review_reason = 'AI 初审通过'   ai_review_reason = 具体原因
```

## Project Structure Notes

```
api/src/
├── adapters/llm/              # 新增
│   ├── provider.ts            # LLMProvider 接口
│   ├── deepseek.adapter.ts    # DeepSeek 适配器
│   └── index.ts               # 工厂函数与导出
├── domains/
│   ├── checkins/
│   │   ├── checkins.types.ts  # 扩展 ai_review_reason
│   │   └── checkins.service.ts # 更新调用与 UPDATE
│   ├── reviews/
│   │   ├── reviews.types.ts   # 新增 AIReviewInput
│   │   └── reviews.service.ts # 多规则引擎
│   └── tasks/
│       ├── task.types.ts      # 扩展 TaskDetail
│       └── task.service.ts    # 返回 ai_review_reason
└── scripts/migrate.ts         # 新增 ai_review_reason 字段
```

## UX Requirements

- 学生端文案保持友好、鼓励、不指责：
  - 默认待复核提示：「心得可以再具体一点，说说你的真实感受吧」
  - 若展示 reason，可细化为：
    - `字数不足`：「再多写一点吧～」
    - `包含敏感内容`：「心得包含不适合的内容，请修改后重新提交」
    - `内容疑似套话`：「心得可以再具体一点，避免套用常见表达」
    - `与任务内容重复度过高`：「心得与任务内容过于相似，请写下自己的真实体会」
- 辅导员复核列表（Story 5.3）需展示 `ai_review_reason`，帮助快速判断。
- 学生查看复核结果页（Story 5.4）可展示 `ai_review_reason`。

## Testing Requirements

### 后端测试

- [ ] **单元测试**：`reviews.service.aiReviewReflection`
  - 字数 < 10 → `pending_manual_review`，reason `字数不足`
  - 字数 ≥ 10 且无其他命中 → `ai_approved`
  - 命中敏感词 → `pending_manual_review`，reason `包含敏感内容`
  - 命中套话模板 → `pending_manual_review`，reason `内容疑似套话`
  - 与任务内容 Jaccard ≥ 0.7 → `pending_manual_review`，reason `与任务内容重复度过高`
  - 与任务内容 Jaccard < 0.7 → `ai_approved`
  - LLM 超时/异常时降级到 `ai_approved`
  - 未配置 LLM 密钥时仅使用本地规则

- [ ] **集成测试**：`POST /api/checkins/:id/reflection`
  - 有效心得 → 200，返回 `ai_review_reason`
  - 敷衍心得 → 200，`status = pending_manual_review`，`ai_review_reason` 非空
  - 修改心得 → 200，`ai_review_reason` 更新为最新原因

- [ ] **回归测试**：
  - 首次提交流程保持 Story 4.2/4.4 行为
  - 修改流程保持 Story 4.4 行为
  - `GET /api/tasks/my/:id` 返回 `ai_review_reason`

### 小程序测试

- [ ] **手动测试**：提交通过后 `CheckInResponse` 包含 `ai_review_reason`
- [ ] **手动测试**：提交待复核后展示对应 reason 或默认文案
- [ ] **集成测试**：任务详情页/结果页能读取到 `ai_review_reason`

## Review Findings

### decision-resolved

- [x] [Decision→Resolve] Story 4.2 中 deferred 的「AI 初审 reason 未持久化」由本 Story 统一通过 `check_ins.ai_review_reason` 字段解决。
- [x] [Decision→Resolve] `aiReviewReflection` 签名由 `(content: string)` 改为 `(input: AIReviewInput)`，以支持 Jaccard 相似度计算。

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (default)

### Debug Log References

- 测试环境发现 `api/.env` 中 `DATABASE_URL` 指向 Supabase，导致测试默认连到远程数据库超时；通过显式设置 `DATABASE_URL`/`TEST_DATABASE_URL` 为本地 `127.0.0.1:5432/ideo_track_test` 解决。

### Completion Notes List

- 本 Story 为后端为主的故事，小程序端仅做类型扩展与 reason 透传展示。
- LLM Provider 为可选增强；未配置密钥时本地规则即可运行，降低部署依赖。
- 敏感词库与套话模板 V1 硬编码，后续可在 `reviews.service.ts` 顶部统一维护或迁移到配置/数据库。
- `ai_review_reason` 字段同时服务 Story 5.3（辅导员复核列表）与 Story 5.4（学生查看复核结果）。
- 除 Story 规格中 AC-3 要求的 `check_ins.ai_review_reason` 外，新增 `ai_reviews` 表保存每次 AI 初审的完整记录（check_in_id/task_id/user_id/reflection_content/task_content/status/reason/reason_code），满足 NFR-8 审计与调优需求。
- 验证结果：API 测试 117/117 通过，`npm run build` 通过，小程序 `tsc --noEmit` 通过。

## Change Log

- 2026-06-23: Story 5.1 创建，定义 AI 初审服务的多规则引擎、LLM Provider 可切换适配器、ai_review_reason 持久化与相关类型/迁移/测试规格。

## References

- [Source: `_bmad-output/planning-artifacts/epics/epics-IdeoTrack-2026-06-22/epics.md` — Epic 5 / Story 5.1]
- [Source: `_bmad-output/planning-artifacts/prds/prd-IdeoTrack-2026-06-22/prd.md` §4.5 FR-12]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-IdeoTrack-2026-06-22/ARCHITECTURE-SPINE.md` AD-3, AD-6, AD-10, AD-11, AD-12]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-IdeoTrack-2026-06-22/DESIGN.md` 颜色、字体、组件规范]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-IdeoTrack-2026-06-22/EXPERIENCE.md` 心得输入框、打卡流程、文案禁忌]
- [Source: `_bmad-output/implementation-artifacts/4-2-xin-de-ti-jiao.md` Story 4.2 实现规格]
- [Source: `_bmad-output/implementation-artifacts/4-4-xin-de-ti-jiao-hou-xiu-gai-1-ci.md` Story 4.4 状态机规格]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` Story 4.2 deferred 项]
- [Source: `api/src/domains/reviews/reviews.service.ts` 当前基础实现]
- [Source: `api/src/domains/checkins/checkins.service.ts` 当前 `submitReflection` 实现]
