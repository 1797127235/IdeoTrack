import { createLLMProvider } from '../../adapters/llm/index.js';
import { query, queryOne, withTransaction } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { AppError } from '../../middleware/error-handler.js';
import { awardPoints } from '../points/points.service.js';
import type {
  AIReviewInput,
  AIReviewRecordInput,
  AIReviewResult,
  PendingReviewFilters,
  PendingReviewItem,
  PendingReviewList,
  ReviewDecisionInput,
} from './reviews.types.js';
import type { CheckIn } from '../checkins/checkins.types.js';

// V1 敏感词库：政治 / 宗教 / 色情 / 暴力 / 校园不当内容。
const SENSITIVE_WORDS: string[] = [
  '反动',
  '颠覆',
  '暴乱',
  '游行',
  '色情',
  '淫秽',
  '赌博',
  '毒品',
  '台独',
  '港独',
  '疆独',
  '藏独',
  '法轮功',
  '邪教',
  '恐怖',
  '自杀',
  '自残',
  '杀人',
  '暴力',
  '枪支',
  '炸弹',
  '嫖娼',
  '卖淫',
  '强奸',
  '傻逼',
  '他妈的',
  '草泥马',
];

// V1 套话/模板库：常见敷衍表达。
const TEMPLATES: string[] = [
  '学习了，很有收获',
  '今天的内容很有意义',
  '感受很深，受益匪浅',
  '这次学习让我收获颇丰',
  '非常有教育意义',
  '让我深受启发',
  '收获很大',
  '感触很深',
  '学到了很多',
  '受益匪浅',
  '很有意义',
  '深受教育',
  '收获良多',
  '感触颇多',
  '意义深远',
  '发人深省',
  '催人奋进',
  '备受鼓舞',
  '耳目一新',
  '豁然开朗',
  '茅塞顿开',
  '增长见识',
  '开阔眼界',
  '拓宽视野',
  '提升认识',
  '增强意识',
  '提高觉悟',
  '坚定信念',
  '明确方向',
  '鼓舞人心',
  '振奋人心',
  '催人向上',
  '引人深思',
  '值得学习',
  '深受感动',
  '倍感振奋',
  '充满信心',
  '倍感自豪',
  '责任重大',
  '使命光荣',
  '不忘初心',
  '牢记使命',
  '砥砺前行',
  '努力奋斗',
  '继续加油',
  '争取进步',
  '不断提高',
  '不断完善',
  '做得更好',
];

const SIMILARITY_THRESHOLD = 0.7;

// 机器可读的原因码，供前端/日志/审计使用；中文文案仅作为人类可读补充
export const REVIEW_REASON_CODES = {
  AI_APPROVED: 'ai_approved',
  LENGTH_INSUFFICIENT: 'length_insufficient',
  SENSITIVE_CONTENT: 'sensitive_content',
  TEMPLATE_PHRASE: 'template_phrase',
  TOO_SIMILAR: 'too_similar',
  LLM_REVIEW_REQUIRED: 'llm_review_required',
  LLM_ERROR: 'llm_error',
  AI_REVIEW_ERROR: 'ai_review_error',
} as const;

export function getReviewReasonCode(reason?: string): string | undefined {
  switch (reason) {
    case 'AI 初审通过':
      return REVIEW_REASON_CODES.AI_APPROVED;
    case '字数不足':
      return REVIEW_REASON_CODES.LENGTH_INSUFFICIENT;
    case '包含敏感内容':
      return REVIEW_REASON_CODES.SENSITIVE_CONTENT;
    case '内容疑似套话':
      return REVIEW_REASON_CODES.TEMPLATE_PHRASE;
    case '与任务内容重复度过高':
      return REVIEW_REASON_CODES.TOO_SIMILAR;
    case 'LLM 判定需复核':
      return REVIEW_REASON_CODES.LLM_REVIEW_REQUIRED;
    case 'LLM 审核异常，转人工复核':
      return REVIEW_REASON_CODES.LLM_ERROR;
    case 'AI 审核异常，转人工复核':
      return REVIEW_REASON_CODES.AI_REVIEW_ERROR;
    default:
      return undefined;
  }
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '');
}

function lengthRule(content: string): AIReviewResult | null {
  if (content.trim().length < 10) {
    return {
      status: 'pending_manual_review',
      reason: '字数不足',
      reason_code: REVIEW_REASON_CODES.LENGTH_INSUFFICIENT,
    };
  }
  return null;
}

function sensitiveWordRule(content: string): AIReviewResult | null {
  const normalized = normalize(content);
  const hit = SENSITIVE_WORDS.some((word) => normalized.includes(normalize(word)));
  if (hit) {
    return {
      status: 'pending_manual_review',
      reason: '包含敏感内容',
      reason_code: REVIEW_REASON_CODES.SENSITIVE_CONTENT,
    };
  }
  return null;
}

function templateRule(content: string): AIReviewResult | null {
  const normalized = normalize(content);
  const hit = TEMPLATES.some((tpl) => normalized.includes(normalize(tpl)));
  if (hit) {
    return {
      status: 'pending_manual_review',
      reason: '内容疑似套话',
      reason_code: REVIEW_REASON_CODES.TEMPLATE_PHRASE,
    };
  }
  return null;
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function similarityRule(content: string, taskContent: string): AIReviewResult | null {
  const trimmedTask = taskContent.trim();
  if (trimmedTask.length === 0) {
    return null;
  }
  if (jaccardSimilarity(content, trimmedTask) >= SIMILARITY_THRESHOLD) {
    return {
      status: 'pending_manual_review',
      reason: '与任务内容重复度过高',
      reason_code: REVIEW_REASON_CODES.TOO_SIMILAR,
    };
  }
  return null;
}

/**
 * 保存 AI 初审记录，用于审计、调优和后续统计（NFR-8）。
 */
export async function saveAIReviewRecord(input: AIReviewRecordInput): Promise<void> {
  await query(
    `INSERT INTO ai_reviews
       (check_in_id, task_id, user_id, reflection_content, task_content, status, reason, reason_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.checkInId,
      input.taskId,
      input.userId,
      input.reflectionContent,
      input.taskContent,
      input.status,
      input.reason ?? null,
      input.reasonCode ?? null,
    ]
  );
}

/**
 * AI 初审心得内容。
 *
 * 本地规则引擎：
 * 1. 字数不足（trim 后 < 10）→ pending_manual_review
 * 2. 命中敏感词库 → pending_manual_review
 * 3. 命中套话模板 → pending_manual_review
 * 4. 与任务原文 Jaccard 相似度 ≥ 70% → pending_manual_review
 *
 * 本地规则全部通过后，若配置了 LLM Provider，则进行语义审核；
 * LLM 超时或异常时降级到 ai_approved，不影响主流程。
 */
export async function aiReviewReflection(input: AIReviewInput): Promise<AIReviewResult> {
  const content = input.reflectionContent.trim();

  const lengthResult = lengthRule(content);
  if (lengthResult) return lengthResult;

  const sensitiveResult = sensitiveWordRule(content);
  if (sensitiveResult) return sensitiveResult;

  const templateResult = templateRule(content);
  if (templateResult) return templateResult;

  const similarityResult = similarityRule(content, input.taskContent);
  if (similarityResult) return similarityResult;

  const llm = createLLMProvider();
  if (llm) {
    try {
      // LLM 语义审核超时兜底：适配器内部已设 8s，此处 race 给出统一的降级边界。
      // 超时/异常时降级到人工复核，不阻塞用户流程。
      const llmResult = await Promise.race([
        llm.reviewReflection(input),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM review timeout')), 8000)
        ),
      ]);
      if (llmResult.status === 'pending_manual_review') {
        return {
          status: 'pending_manual_review',
          reason: llmResult.reason ?? 'LLM 判定需复核',
          reason_code: REVIEW_REASON_CODES.LLM_REVIEW_REQUIRED,
        };
      }
    } catch (error) {
      // 超时或异常：按 AD-6 降级到 pending_manual_review，不阻塞用户流程
      logger.warn(
        { err: error instanceof Error ? { message: error.message } : { message: String(error) } },
        'LLM review failed, falling back to manual review'
      );
      return {
        status: 'pending_manual_review',
        reason: 'LLM 审核异常，转人工复核',
        reason_code: REVIEW_REASON_CODES.LLM_ERROR,
      };
    }
  }

  return {
    status: 'ai_approved',
    reason: 'AI 初审通过',
    reason_code: REVIEW_REASON_CODES.AI_APPROVED,
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * 获取辅导员所带班级的待复核打卡列表。
 * 仅返回状态为 `pending_manual_review` 且打卡学生所属班级在辅导员管辖范围内的记录。
 * 复核范围以「学生所属班级」为准（而非任务目标班级），这样全校/学院/任务池类型
 * 任务的打卡也能正确归属到对应辅导员。
 * 支持按班级筛选与分页。
 */
export async function listPendingReviewsForCounselor(
  counselorId: string,
  filters: PendingReviewFilters = {}
): Promise<PendingReviewList> {
  const page = Math.max(1, filters.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, filters.limit ?? DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  const params: (string | number)[] = [counselorId];
  const classFilter = filters.classId
    ? `AND c.id = $${params.length + 1} AND cc.class_id = $${params.length + 1}`
    : '';
  if (filters.classId) params.push(filters.classId);

  const taskFilter = filters.taskId
    ? `AND t.id = $${params.length + 1}`
    : '';
  if (filters.taskId) params.push(filters.taskId);

  // 注意：复核范围以「打卡学生所属班级」为准，而非任务目标班级。
  // 这样全校/学院/任务池类型任务的打卡也能正确归属到对应辅导员的待复核列表。
  const countRows = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM check_ins ci
     JOIN tasks t ON ci.task_id = t.id
     JOIN users u ON ci.user_id = u.id
     JOIN classes c ON u.class_id = c.id
     JOIN counselor_classes cc ON cc.class_id = c.id AND cc.counselor_id = $1
     WHERE ci.status = 'pending_manual_review'
     ${classFilter}
     ${taskFilter}`,
    params
  );

  const total = countRows[0]?.total ?? 0;

  const queryParams = [...params, limit, offset];
  const rows = await query<PendingReviewItem>(
    `SELECT
       ci.id AS check_in_id,
       u.id AS student_id,
       u.school_id AS student_school_id,
       u.name AS student_name,
       c.id AS class_id,
       c.name AS class_name,
       t.id AS task_id,
       t.title AS task_title,
       ci.reflection_content,
       ci.ai_review_reason,
       ci.checked_in_at AS submitted_at
     FROM check_ins ci
     JOIN tasks t ON ci.task_id = t.id
     JOIN users u ON ci.user_id = u.id
     JOIN classes c ON u.class_id = c.id
     JOIN counselor_classes cc ON cc.class_id = c.id AND cc.counselor_id = $1
     WHERE ci.status = 'pending_manual_review'
     ${classFilter}
     ${taskFilter}
     ORDER BY ci.checked_in_at DESC
     LIMIT $${params.length + 1}
     OFFSET $${params.length + 2}`,
    queryParams
  );

  const items = rows.map((row) => ({
    ...row,
    ai_review_reason_code: getReviewReasonCode(row.ai_review_reason ?? undefined),
  }));

  return { items, total, page, limit };
}

/**
 * 获取某条待复核记录的详情。
 * 仅当该记录所属班级在辅导员管辖范围内时才返回。
 */
export async function getPendingReviewDetail(
  counselorId: string,
  checkInId: string
): Promise<PendingReviewItem> {
  const rows = await query<PendingReviewItem>(
    `SELECT
       ci.id AS check_in_id,
       u.id AS student_id,
       u.school_id AS student_school_id,
       u.name AS student_name,
       c.id AS class_id,
       c.name AS class_name,
       t.id AS task_id,
       t.title AS task_title,
       t.content AS task_content,
       ci.reflection_content,
       ci.ai_review_reason,
       ci.checked_in_at AS submitted_at
     FROM check_ins ci
     JOIN tasks t ON ci.task_id = t.id
     JOIN users u ON ci.user_id = u.id
     JOIN classes c ON u.class_id = c.id
     JOIN counselor_classes cc ON cc.class_id = c.id AND cc.counselor_id = $1
     WHERE ci.id = $2
       AND ci.status = 'pending_manual_review'
     LIMIT 1`,
    [counselorId, checkInId]
  );

  if (rows.length === 0) {
    throw new AppError('CHECKIN_NOT_FOUND', '待复核记录不存在或无权访问', 404);
  }

  const row = rows[0];
  return {
    ...row,
    ai_review_reason_code: getReviewReasonCode(row.ai_review_reason ?? undefined),
  };
}

/**
 * 辅导员对某条打卡执行人工复核。
 *
 * 数据范围校验：仅当该打卡所属班级在辅导员管辖范围内时才允许操作。
 * 复核通过后发放 +10 积分（幂等）。
 */
export async function makeReviewDecision(input: ReviewDecisionInput): Promise<CheckIn> {
  const { checkInId, counselorId, decision, feedback } = input;

  if (!['approve', 'reject', 'require_modification'].includes(decision)) {
    throw new AppError('VALIDATION_ERROR', '复核决策无效', 400);
  }

  if (decision === 'require_modification' && (!feedback || feedback.trim().length === 0)) {
    throw new AppError('VALIDATION_ERROR', '要求修改时必须提供反馈说明', 400);
  }

  return withTransaction(async (client) => {
    const checkInResult = await client.query<CheckIn>(
      `SELECT ci.*
       FROM check_ins ci
       JOIN users u ON ci.user_id = u.id
       JOIN counselor_classes cc ON cc.class_id = u.class_id AND cc.counselor_id = $1
       WHERE ci.id = $2
         AND ci.status = 'pending_manual_review'
       LIMIT 1
       FOR UPDATE`,
      [counselorId, checkInId]
    );

    if (checkInResult.rows.length === 0) {
      throw new AppError('CHECKIN_NOT_FOUND', '待复核记录不存在或无权访问', 404);
    }

    const checkIn = checkInResult.rows[0];

    let newStatus: CheckIn['status'];
    if (decision === 'approve') {
      newStatus = 'approved';
    } else if (decision === 'reject') {
      newStatus = 'rejected';
    } else {
      newStatus = 'requires_modification';
    }

    const updateResult = await client.query<CheckIn>(
      `UPDATE check_ins
       SET status = $1,
           review_feedback = $2,
           updated_at = NOW()
       WHERE id = $3 AND status = 'pending_manual_review'
       RETURNING *`,
      [newStatus, feedback ?? null, checkIn.id]
    );

    if (updateResult.rows.length === 0) {
      throw new AppError('CHECKIN_CANNOT_REVIEW', '复核失败，记录状态可能已变更', 409);
    }

    const updatedCheckIn = updateResult.rows[0];

    if (newStatus === 'approved') {
      await awardPoints(
        {
          userId: updatedCheckIn.user_id,
          checkInId: updatedCheckIn.id,
          points: 10,
          reason: '打卡通过，获得积分',
        },
        client
      );
    }

    return updatedCheckIn;
  });
}
