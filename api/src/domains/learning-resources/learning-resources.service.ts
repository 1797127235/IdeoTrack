import { query, queryOne, queryCount } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import { deleteCoverImage } from '../../lib/resource-storage.js';
import type {
  LearningResource,
  LearningResourceResponse,
  CreateLearningResourceInput,
  UpdateLearningResourceInput,
  LearningResourceFilters,
  LearningResourceType,
} from './learning-resources.types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function toResponse(resource: LearningResource): LearningResourceResponse {
  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    type: resource.type,
    content: resource.content,
    url: resource.url,
    cover_url: resource.cover_url,
    category: resource.category,
    tags: resource.tags,
    status: resource.status,
    view_count: resource.view_count,
    created_at: resource.created_at,
    updated_at: resource.updated_at,
  };
}

function validateResourceUrl(type: LearningResourceType, url: string | null | undefined): void {
  if ((type === 'link' || type === 'video') && !url) {
    throw new AppError('VALIDATION_ERROR', `${type === 'video' ? '视频' : '链接'}类型必须提供 URL`, 400);
  }
}

export async function listLearningResources(
  filters: LearningResourceFilters = {},
  page = 1,
  limit = 20
): Promise<{ items: LearningResourceResponse[]; total: number; page: number; limit: number }> {
  const safeLimit = Math.min(50, Math.max(1, limit));
  const safePage = Math.max(1, page);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.type) {
    conditions.push(`type = $${paramIndex}`);
    params.push(filters.type);
    paramIndex++;
  }
  if (filters.category) {
    conditions.push(`category = $${paramIndex}`);
    params.push(filters.category);
    paramIndex++;
  }
  if (filters.status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const count = await queryCount(`SELECT COUNT(*) FROM learning_resources ${whereClause}`, params);

  const offset = (safePage - 1) * safeLimit;
  const resources = await query<LearningResource>(
    `SELECT * FROM learning_resources
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, safeLimit, offset]
  );

  return {
    items: resources.map(toResponse),
    total: count,
    page: safePage,
    limit: safeLimit,
  };
}

export async function getLearningResourceById(id: string): Promise<LearningResourceResponse> {
  if (!isUuid(id)) {
    throw new AppError('VALIDATION_ERROR', '资料 ID 格式无效', 400);
  }

  const resource = await queryOne<LearningResource>(
    'SELECT * FROM learning_resources WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!resource) {
    throw new AppError('LEARNING_RESOURCE_NOT_FOUND', '学习资料不存在', 404);
  }

  // 原子递增浏览次数
  await query('UPDATE learning_resources SET view_count = view_count + 1 WHERE id = $1', [id]);

  return toResponse({ ...resource, view_count: resource.view_count + 1 });
}

export async function getLearningResourceByIdWithoutIncrement(id: string): Promise<LearningResource> {
  if (!isUuid(id)) {
    throw new AppError('VALIDATION_ERROR', '资料 ID 格式无效', 400);
  }

  const resource = await queryOne<LearningResource>(
    'SELECT * FROM learning_resources WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!resource) {
    throw new AppError('LEARNING_RESOURCE_NOT_FOUND', '学习资料不存在', 404);
  }

  return resource;
}

export async function createLearningResource(
  userId: string,
  input: CreateLearningResourceInput
): Promise<LearningResourceResponse> {
  validateResourceUrl(input.type, input.url);

  const rows = await query<LearningResource>(
    `INSERT INTO learning_resources (
      title, description, type, content, url, cover_url,
      category, tags, status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      input.title,
      input.description ?? null,
      input.type,
      input.content ?? null,
      input.url ?? null,
      input.cover_url ?? null,
      input.category ?? null,
      input.tags ?? null,
      input.status ?? 'published',
      userId,
    ]
  );

  if (rows.length === 0) {
    throw new AppError('LEARNING_RESOURCE_SERVICE_ERROR', '创建学习资料失败', 500);
  }

  return toResponse(rows[0]);
}

export async function updateLearningResource(
  id: string,
  input: UpdateLearningResourceInput
): Promise<LearningResourceResponse> {
  if (!isUuid(id)) {
    throw new AppError('VALIDATION_ERROR', '资料 ID 格式无效', 400);
  }

  const existing = await queryOne<LearningResource>(
    'SELECT * FROM learning_resources WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!existing) {
    throw new AppError('LEARNING_RESOURCE_NOT_FOUND', '学习资料不存在', 404);
  }

  const newType = input.type ?? existing.type;
  const newUrl = input.url !== undefined ? input.url : existing.url;
  validateResourceUrl(newType, newUrl);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  function addSet(column: string, value: unknown) {
    updates.push(`${column} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  if (input.title !== undefined) addSet('title', input.title);
  if (input.description !== undefined) addSet('description', input.description);
  if (input.type !== undefined) addSet('type', input.type);
  if (input.content !== undefined) addSet('content', input.content);
  if (input.url !== undefined) addSet('url', input.url);
  if (input.cover_url !== undefined) addSet('cover_url', input.cover_url);
  if (input.category !== undefined) addSet('category', input.category);
  if (input.tags !== undefined) addSet('tags', input.tags);
  if (input.status !== undefined) addSet('status', input.status);

  if (updates.length === 0) {
    return toResponse(existing);
  }

  // 如果更新了 cover_url，删除旧封面图
  if (input.cover_url !== undefined && input.cover_url !== existing.cover_url) {
    await deleteCoverImage(existing.cover_url);
  }

  params.push(id);
  const rows = await query<LearningResource>(
    `UPDATE learning_resources
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (rows.length === 0) {
    throw new AppError('LEARNING_RESOURCE_SERVICE_ERROR', '更新学习资料失败', 500);
  }

  return toResponse(rows[0]);
}

export async function updateLearningResourceStatus(
  id: string,
  status: 'draft' | 'published'
): Promise<LearningResourceResponse> {
  if (!isUuid(id)) {
    throw new AppError('VALIDATION_ERROR', '资料 ID 格式无效', 400);
  }

  const rows = await query<LearningResource>(
    `UPDATE learning_resources
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  if (rows.length === 0) {
    throw new AppError('LEARNING_RESOURCE_NOT_FOUND', '学习资料不存在', 404);
  }

  return toResponse(rows[0]);
}

export async function deleteLearningResource(id: string): Promise<void> {
  if (!isUuid(id)) {
    throw new AppError('VALIDATION_ERROR', '资料 ID 格式无效', 400);
  }

  const existing = await queryOne<LearningResource>(
    'SELECT * FROM learning_resources WHERE id = $1 LIMIT 1',
    [id]
  );

  if (!existing) {
    throw new AppError('LEARNING_RESOURCE_NOT_FOUND', '学习资料不存在', 404);
  }

  await query('DELETE FROM learning_resources WHERE id = $1', [id]);
  await deleteCoverImage(existing.cover_url);
}
