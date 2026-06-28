import { query, queryOne, queryCount } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  TaskTemplate,
  TaskTemplateResponse,
  CreateTaskTemplateInput,
  UpdateTaskTemplateInput,
  TaskTemplateFilters,
} from './task-templates.types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function toResponse(template: TaskTemplate): TaskTemplateResponse {
  return { ...template };
}

function stringifyJson<T>(value: T | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

export async function listTaskTemplates(
  filters: TaskTemplateFilters = {},
  page = 1,
  limit = 20
): Promise<{ items: TaskTemplateResponse[]; total: number; page: number; limit: number }> {
  const safeLimit = Math.min(50, Math.max(1, limit));
  const safePage = Math.max(1, page);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const count = await queryCount(`SELECT COUNT(*) FROM task_templates ${whereClause}`, params);

  const offset = (safePage - 1) * safeLimit;
  const templates = await query<TaskTemplate>(
    `SELECT * FROM task_templates
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, safeLimit, offset]
  );

  return {
    items: templates.map(toResponse),
    total: count,
    page: safePage,
    limit: safeLimit,
  };
}

export async function getTaskTemplateById(id: string): Promise<TaskTemplateResponse> {
  if (!isUuid(id)) {
    throw new AppError('VALIDATION_ERROR', '模板 ID 格式无效', 400);
  }

  const template = await queryOne<TaskTemplate>(
    'SELECT * FROM task_templates WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!template) {
    throw new AppError('TASK_TEMPLATE_NOT_FOUND', '任务模板不存在', 404);
  }

  return toResponse(template);
}

export async function fetchTaskTemplateById(id: string): Promise<TaskTemplate> {
  if (!isUuid(id)) {
    throw new AppError('VALIDATION_ERROR', '模板 ID 格式无效', 400);
  }

  const template = await queryOne<TaskTemplate>(
    'SELECT * FROM task_templates WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!template) {
    throw new AppError('TASK_TEMPLATE_NOT_FOUND', '任务模板不存在', 404);
  }

  return template;
}

export async function createTaskTemplate(
  userId: string,
  input: CreateTaskTemplateInput
): Promise<TaskTemplateResponse> {
  const rows = await query<TaskTemplate>(
    `INSERT INTO task_templates (
      title, description, content, cover_image, category, tags,
      guiding_questions, source_url, video_url,
      checkin_type, require_text, require_image, require_video,
      min_text_length, max_images, require_location,
      geo_lat, geo_lng, geo_radius_meters, geo_address, require_face,
      created_by, status, start_time, end_time
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    RETURNING *`,
    [
      input.title,
      input.description ?? null,
      input.content,
      input.cover_image ?? null,
      input.category ?? null,
      stringifyJson(input.tags),
      stringifyJson(input.guiding_questions),
      input.source_url ?? null,
      input.video_url ?? null,
      input.checkin_type ?? 'text',
      input.require_text ?? false,
      input.require_image ?? false,
      input.require_video ?? false,
      input.min_text_length ?? null,
      input.max_images ?? null,
      input.require_location ?? false,
      input.geo_lat ?? null,
      input.geo_lng ?? null,
      input.geo_radius_meters ?? null,
      input.geo_address ?? null,
      input.require_face ?? false,
      userId,
      input.status ?? 'draft',
      input.start_time ?? null,
      input.end_time ?? null,
    ]
  );

  if (rows.length === 0) {
    throw new AppError('TASK_TEMPLATE_SERVICE_ERROR', '创建任务模板失败', 500);
  }

  return toResponse(rows[0]);
}

export async function updateTaskTemplate(
  id: string,
  input: UpdateTaskTemplateInput
): Promise<TaskTemplateResponse> {
  if (!isUuid(id)) {
    throw new AppError('VALIDATION_ERROR', '模板 ID 格式无效', 400);
  }

  const existing = await queryOne<TaskTemplate>(
    'SELECT * FROM task_templates WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!existing) {
    throw new AppError('TASK_TEMPLATE_NOT_FOUND', '任务模板不存在', 404);
  }

  // 已派发的模板不建议修改核心内容；此处仅允许编辑文案类字段和状态
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  function addSet(column: string, value: unknown) {
    updates.push(`${column} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  if (input.title !== undefined) addSet('title', input.title);
  if (input.description !== undefined) addSet('description', input.description ?? null);
  if (input.content !== undefined) addSet('content', input.content);
  if (input.cover_image !== undefined) addSet('cover_image', input.cover_image ?? null);
  if (input.category !== undefined) addSet('category', input.category ?? null);
  if (input.tags !== undefined) addSet('tags', stringifyJson(input.tags));
  if (input.guiding_questions !== undefined) {
    addSet('guiding_questions', stringifyJson(input.guiding_questions));
  }
  if (input.source_url !== undefined) addSet('source_url', input.source_url ?? null);
  if (input.video_url !== undefined) addSet('video_url', input.video_url ?? null);
  if (input.checkin_type !== undefined) addSet('checkin_type', input.checkin_type);
  if (input.require_text !== undefined) addSet('require_text', input.require_text);
  if (input.require_image !== undefined) addSet('require_image', input.require_image);
  if (input.require_video !== undefined) addSet('require_video', input.require_video);
  if (input.min_text_length !== undefined) addSet('min_text_length', input.min_text_length ?? null);
  if (input.max_images !== undefined) addSet('max_images', input.max_images ?? null);
  if (input.require_location !== undefined) addSet('require_location', input.require_location);
  if (input.geo_lat !== undefined) addSet('geo_lat', input.geo_lat ?? null);
  if (input.geo_lng !== undefined) addSet('geo_lng', input.geo_lng ?? null);
  if (input.geo_radius_meters !== undefined) addSet('geo_radius_meters', input.geo_radius_meters ?? null);
  if (input.geo_address !== undefined) addSet('geo_address', input.geo_address ?? null);
  if (input.require_face !== undefined) addSet('require_face', input.require_face);
  if (input.status !== undefined) addSet('status', input.status);
  if (input.start_time !== undefined) addSet('start_time', input.start_time ?? null);
  if (input.end_time !== undefined) addSet('end_time', input.end_time ?? null);

  if (updates.length === 0) {
    return toResponse(existing);
  }

  params.push(id);
  const rows = await query<TaskTemplate>(
    `UPDATE task_templates
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (rows.length === 0) {
    throw new AppError('TASK_TEMPLATE_SERVICE_ERROR', '更新任务模板失败', 500);
  }

  return toResponse(rows[0]);
}

export async function delistTaskTemplate(id: string): Promise<TaskTemplateResponse> {
  if (!isUuid(id)) {
    throw new AppError('VALIDATION_ERROR', '模板 ID 格式无效', 400);
  }

  const rows = await query<TaskTemplate>(
    `UPDATE task_templates SET status = 'delisted' WHERE id = $1 RETURNING *`,
    [id]
  );

  if (rows.length === 0) {
    throw new AppError('TASK_TEMPLATE_NOT_FOUND', '任务模板不存在', 404);
  }

  return toResponse(rows[0]);
}

export async function deleteTaskTemplate(id: string): Promise<void> {
  if (!isUuid(id)) {
    throw new AppError('VALIDATION_ERROR', '模板 ID 格式无效', 400);
  }

  const existing = await queryOne<TaskTemplate>(
    'SELECT * FROM task_templates WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!existing) {
    throw new AppError('TASK_TEMPLATE_NOT_FOUND', '任务模板不存在', 404);
  }

  // 若已有派发实例，禁止删除模板，避免破坏数据溯源
  const dispatchedCount = await queryCount(
    'SELECT COUNT(*) FROM tasks WHERE template_id = $1',
    [id]
  );

  if (dispatchedCount > 0) {
    throw new AppError('TASK_TEMPLATE_IN_USE', '该模板已存在派发实例，无法删除', 409);
  }

  await query('DELETE FROM task_templates WHERE id = $1', [id]);
}
