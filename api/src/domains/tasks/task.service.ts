import { query, queryOne, queryCount } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import { getReviewReasonCode } from '../reviews/reviews.service.js';
import { fetchTaskTemplateById } from '../task-templates/task-templates.service.js';
import type {
  Task,
  TaskResponse,
  TaskWithStats,
  StudentTask,
  TaskDetail,
  CreateTaskInput,
  CreateTaskFromTemplateInput,
  UpdateTaskInput,
  TaskFilters,
  TaskScopeType,
  StudentTaskStatus,
  CheckInStatus,
} from './task.types.js';

interface UserScope {
  class_id?: string | null;
  college_id?: string | null;
}

function toTaskResponse(task: Task): TaskResponse {
  let scope_label = '全校';
  if (task.scope_type === 'college') scope_label = '学院';
  if (task.scope_type === 'class') scope_label = '班级';
  return {
    ...task,
    scope_label,
  };
}

function computeStudentTaskStatus(deadlineAt: string, checkInStatus?: CheckInStatus | null): StudentTaskStatus {
  if (!checkInStatus) {
    return new Date(deadlineAt) > new Date() ? 'in_progress' : 'overdue';
  }
  if (checkInStatus === 'approved') return 'completed';
  if (
    checkInStatus === 'submitted' ||
    checkInStatus === 'ai_reviewing' ||
    checkInStatus === 'ai_approved' ||
    checkInStatus === 'pending_manual_review' ||
    checkInStatus === 'rejected' ||
    checkInStatus === 'requires_modification'
  ) {
    return 'reviewing';
  }
  return 'in_progress';
}

async function getUserScope(userId: string): Promise<UserScope> {
  const data = await queryOne<{
    class_id: string | null;
    college_id: string | null;
  }>(
    `SELECT u.class_id, c.college_id
     FROM users u
     LEFT JOIN classes c ON u.class_id = c.id
     WHERE u.id = $1
     LIMIT 1`,
    [userId]
  );

  if (!data) {
    throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
  }

  return {
    class_id: data.class_id,
    college_id: data.college_id,
  };
}

async function assertScopePermission(
  userId: string,
  role: string,
  scopeType: TaskScopeType,
  targetCollegeId: string | null | undefined,
  targetClassId: string | null | undefined
): Promise<void> {
  if (role === 'admin') {
    if (scopeType === 'school' && (targetCollegeId || targetClassId)) {
      throw new AppError('VALIDATION_ERROR', '全校任务不需要指定学院或班级', 400);
    }
    if (scopeType === 'college' && !targetCollegeId) {
      throw new AppError('VALIDATION_ERROR', '学院任务必须指定学院', 400);
    }
    if (scopeType === 'class' && !targetClassId) {
      throw new AppError('VALIDATION_ERROR', '班级任务必须指定班级', 400);
    }
    return;
  }

  if (role === 'counselor') {
    if (scopeType !== 'class' || !targetClassId) {
      throw new AppError('ACCESS_DENIED', '辅导员只能发布到自己所带班级', 403);
    }
    const relation = await queryOne<{ id: string }>(
      `SELECT id FROM counselor_classes
       WHERE counselor_id = $1 AND class_id = $2
       LIMIT 1`,
      [userId, targetClassId]
    );

    if (!relation) {
      throw new AppError('ACCESS_DENIED', '您没有该班级的发布权限', 403);
    }
    return;
  }

  throw new AppError('ACCESS_DENIED', '无权发布任务', 403);
}

async function assertTaskEditable(task: Task, userId: string): Promise<void> {
  if (task.created_by !== userId) {
    throw new AppError('ACCESS_DENIED', '只有发布人可以编辑该任务', 403);
  }
  if (new Date(task.deadline_at) <= new Date()) {
    throw new AppError('TASK_DEADLINE_PASSED', '任务已截止，无法编辑或下架', 409);
  }
}

export async function fetchTaskById(taskId: string): Promise<Task> {
  const data = await queryOne<Task>('SELECT * FROM tasks WHERE id = $1 LIMIT 1', [taskId]);
  if (!data) {
    throw new AppError('TASK_NOT_FOUND', '任务不存在', 404);
  }
  return data;
}

async function fetchUserCheckIns(userId: string, taskIds: string[]) {
  if (taskIds.length === 0) return {};
  const rows = await query<{
    task_id: string;
    id: string;
    status: CheckInStatus;
    created_at: string;
    reflection_content: string | null;
    ai_review_reason: string | null;
    reflection_modified: boolean;
    review_feedback: string | null;
  }>(
    `SELECT task_id, id, status, created_at, reflection_content, ai_review_reason, reflection_modified, review_feedback
     FROM check_ins
     WHERE user_id = $1 AND task_id = ANY($2)`,
    [userId, taskIds]
  );

  const map: Record<
    string,
    {
      id: string;
      status: CheckInStatus;
      created_at: string;
      reflection_content: string | null;
      ai_review_reason: string | null;
      reflection_modified: boolean;
      review_feedback: string | null;
    }
  > = {};
  rows.forEach((row) => {
    map[row.task_id] = {
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      reflection_content: row.reflection_content,
      ai_review_reason: row.ai_review_reason,
      reflection_modified: row.reflection_modified,
      review_feedback: row.review_feedback,
    };
  });
  return map;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

async function listVisibleTaskIds(scope: UserScope): Promise<Task[]> {
  const now = new Date().toISOString();
  const orConditions: string[] = ["scope_type = 'school'"];
  const params: (string | null)[] = [now];
  let paramIndex = 2;

  if (scope.college_id && isUuid(scope.college_id)) {
    orConditions.push(`(scope_type = 'college' AND target_college_id = $${paramIndex})`);
    params.push(scope.college_id);
    paramIndex++;
  }
  if (scope.class_id && isUuid(scope.class_id)) {
    orConditions.push(`(scope_type = 'class' AND target_class_id = $${paramIndex})`);
    params.push(scope.class_id);
    paramIndex++;
  }

  return query<Task>(
    `SELECT * FROM tasks
     WHERE status = 'published'
       AND published_at <= $1
       AND (${orConditions.join(' OR ')})
     ORDER BY deadline_at ASC, published_at DESC`,
    params
  );
}

export async function createTask(
  userId: string,
  role: string,
  input: CreateTaskInput
): Promise<TaskResponse> {
  // 管理员可创建 school/college/class；辅导员仅可创建自己所带班级的 class 任务
  if (role === 'student') {
    throw new AppError('ACCESS_DENIED', '无权发布任务', 403);
  }

  if (role === 'counselor' && input.scope_type !== 'class') {
    throw new AppError('ACCESS_DENIED', '辅导员只能发布班级任务', 403);
  }

  // 校验 scope_type 和 scope_id
  if (input.scope_type === 'school') {
    if (input.scope_id) {
      throw new AppError('VALIDATION_ERROR', '全校任务不需要指定 scope_id', 400);
    }
  } else {
    if (!input.scope_id) {
      throw new AppError('VALIDATION_ERROR', '学院/班级任务必须指定 scope_id', 400);
    }
  }

  if (new Date(input.deadline_at) <= new Date(input.published_at)) {
    throw new AppError('VALIDATION_ERROR', '截止时间必须晚于发布时间', 400);
  }

  const targetCollegeId = input.scope_type === 'college' ? input.scope_id ?? null : null;
  const targetClassId = input.scope_type === 'class' ? input.scope_id ?? null : null;

  // 辅导员创建班级任务时校验管辖权
  if (role === 'counselor' && targetClassId) {
    const relation = await queryOne<{ id: string }>(
      `SELECT id FROM counselor_classes
       WHERE counselor_id = $1 AND class_id = $2
       LIMIT 1`,
      [userId, targetClassId]
    );
    if (!relation) {
      throw new AppError('ACCESS_DENIED', '您没有该班级的发布权限', 403);
    }
  }

  const rows = await query<Task>(
    `INSERT INTO tasks (
      title, description, content, cover_image, category, tags,
      guiding_questions, source_url, video_url,
      checkin_type, require_text, require_image, require_video,
      min_text_length, max_images, require_location,
      scope_type, scope_id, target_college_id, target_class_id, template_id,
      created_by, published_at, deadline_at,
      geo_lat, geo_lng, geo_radius_meters, geo_address, require_face
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
    RETURNING *`,
    [
      input.title,
      input.description ?? null,
      input.content,
      input.cover_image ?? null,
      input.category ?? null,
      input.tags ? JSON.stringify(input.tags) : null,
      input.guiding_questions ? JSON.stringify(input.guiding_questions) : null,
      input.source_url ?? null,
      input.video_url ?? null,
      input.checkin_type ?? 'text',
      input.require_text ?? false,
      input.require_image ?? false,
      input.require_video ?? false,
      input.min_text_length ?? null,
      input.max_images ?? null,
      input.require_location ?? false,
      input.scope_type,
      input.scope_id ?? null,
      targetCollegeId,
      targetClassId,
      null, // 直接创建的任务无模板来源
      userId,
      input.published_at,
      input.deadline_at,
      input.geo_lat ?? null,
      input.geo_lng ?? null,
      input.geo_radius_meters ?? null,
      input.geo_address ?? null,
      input.require_face ?? false,
    ]
  );

  if (rows.length === 0) {
    throw new AppError('TASK_SERVICE_ERROR', '创建任务失败', 500);
  }

  return toTaskResponse(rows[0]);
}

// 从任务模板发布任务实例（辅导员批量派发到班级 / 管理员发布全校或全院任务）
export async function createTaskFromTemplate(
  userId: string,
  role: string,
  input: CreateTaskFromTemplateInput
): Promise<TaskResponse[]> {
  if (role === 'student') {
    throw new AppError('ACCESS_DENIED', '无权发布任务', 403);
  }

  const template = await fetchTaskTemplateById(input.template_id);

  if (template.status !== 'published') {
    throw new AppError('VALIDATION_ERROR', '只能使用已上架的模板发布任务', 400);
  }

  if (new Date(input.deadline_at) <= new Date(input.published_at)) {
    throw new AppError('VALIDATION_ERROR', '截止时间必须晚于发布时间', 400);
  }

  const baseValues = {
    title: template.title,
    description: template.description ?? null,
    content: template.content,
    coverImage: template.cover_image ?? null,
    category: template.category ?? null,
    tags: template.tags ? JSON.stringify(template.tags) : null,
    guidingQuestions: template.guiding_questions ? JSON.stringify(template.guiding_questions) : null,
    sourceUrl: template.source_url,
    videoUrl: template.video_url,
    checkinType: template.checkin_type ?? 'text',
    requireText: template.require_text ?? false,
    requireImage: template.require_image ?? false,
    requireVideo: template.require_video ?? false,
    minTextLength: template.min_text_length ?? null,
    maxImages: template.max_images ?? null,
    requireLocation: template.require_location ?? false,
    geoLat: template.geo_lat ?? null,
    geoLng: template.geo_lng ?? null,
    geoRadius: template.geo_radius_meters ?? null,
    geoAddress: template.geo_address ?? null,
    requireFace: template.require_face ?? false,
  };

  const results: TaskResponse[] = [];

  if (input.scope_type === 'school') {
    if (role !== 'admin') {
      throw new AppError('ACCESS_DENIED', '只有管理员可以发布全校任务', 403);
    }

    const rows = await query<Task>(
      `INSERT INTO tasks (
        title, description, content, cover_image, category, tags,
        guiding_questions, source_url, video_url,
        checkin_type, require_text, require_image, require_video,
        min_text_length, max_images, require_location,
        scope_type, scope_id, target_college_id, target_class_id, template_id,
        created_by, published_at, deadline_at,
        geo_lat, geo_lng, geo_radius_meters, geo_address, require_face
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'school', NULL, NULL, NULL, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        baseValues.title,
        baseValues.description,
        baseValues.content,
        baseValues.coverImage,
        baseValues.category,
        baseValues.tags,
        baseValues.guidingQuestions,
        baseValues.sourceUrl,
        baseValues.videoUrl,
        baseValues.checkinType,
        baseValues.requireText,
        baseValues.requireImage,
        baseValues.requireVideo,
        baseValues.minTextLength,
        baseValues.maxImages,
        baseValues.requireLocation,
        template.id,
        userId,
        input.published_at,
        input.deadline_at,
        baseValues.geoLat,
        baseValues.geoLng,
        baseValues.geoRadius,
        baseValues.geoAddress,
        baseValues.requireFace,
      ]
    );
    results.push(toTaskResponse(rows[0]));
    return results;
  }

  if (input.scope_type === 'college') {
    if (role !== 'admin') {
      throw new AppError('ACCESS_DENIED', '只有管理员可以发布学院任务', 403);
    }
    if (!input.scope_id) {
      throw new AppError('VALIDATION_ERROR', '学院任务必须指定 scope_id', 400);
    }

    const rows = await query<Task>(
      `INSERT INTO tasks (
        title, description, content, cover_image, category, tags,
        guiding_questions, source_url, video_url,
        checkin_type, require_text, require_image, require_video,
        min_text_length, max_images, require_location,
        scope_type, scope_id, target_college_id, target_class_id, template_id,
        created_by, published_at, deadline_at,
        geo_lat, geo_lng, geo_radius_meters, geo_address, require_face
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'college', $17, $17, NULL, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      RETURNING *`,
      [
        baseValues.title,
        baseValues.description,
        baseValues.content,
        baseValues.coverImage,
        baseValues.category,
        baseValues.tags,
        baseValues.guidingQuestions,
        baseValues.sourceUrl,
        baseValues.videoUrl,
        baseValues.checkinType,
        baseValues.requireText,
        baseValues.requireImage,
        baseValues.requireVideo,
        baseValues.minTextLength,
        baseValues.maxImages,
        baseValues.requireLocation,
        input.scope_id,
        template.id,
        userId,
        input.published_at,
        input.deadline_at,
        baseValues.geoLat,
        baseValues.geoLng,
        baseValues.geoRadius,
        baseValues.geoAddress,
        baseValues.requireFace,
      ]
    );
    results.push(toTaskResponse(rows[0]));
    return results;
  }

  // scope_type === 'class'
  const classIds = input.target_class_ids ?? [];
  if (classIds.length === 0) {
    throw new AppError('VALIDATION_ERROR', '班级任务必须指定至少一个班级', 400);
  }

  // 校验班级归属
  if (role === 'counselor') {
    const managed = await query<{ class_id: string }>(
      `SELECT class_id FROM counselor_classes WHERE counselor_id = $1 AND class_id = ANY($2::uuid[])`,
      [userId, classIds]
    );
    if (managed.length !== classIds.length) {
      throw new AppError('ACCESS_DENIED', '您只能发布到自己管辖的班级', 403);
    }
  } else if (role === 'admin') {
    // 管理员发布班级任务时，仅校验班级存在即可
    const existing = await query<{ id: string }>(
      `SELECT id FROM classes WHERE id = ANY($1::uuid[])`,
      [classIds]
    );
    if (existing.length !== classIds.length) {
      throw new AppError('VALIDATION_ERROR', '部分班级不存在', 400);
    }
  }

  for (const classId of classIds) {
    const rows = await query<Task>(
      `INSERT INTO tasks (
        title, description, content, cover_image, category, tags,
        guiding_questions, source_url, video_url,
        checkin_type, require_text, require_image, require_video,
        min_text_length, max_images, require_location,
        scope_type, scope_id, target_college_id, target_class_id, template_id,
        created_by, published_at, deadline_at,
        geo_lat, geo_lng, geo_radius_meters, geo_address, require_face
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'class', $17, NULL, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      RETURNING *`,
      [
        baseValues.title,
        baseValues.description,
        baseValues.content,
        baseValues.coverImage,
        baseValues.category,
        baseValues.tags,
        baseValues.guidingQuestions,
        baseValues.sourceUrl,
        baseValues.videoUrl,
        baseValues.checkinType,
        baseValues.requireText,
        baseValues.requireImage,
        baseValues.requireVideo,
        baseValues.minTextLength,
        baseValues.maxImages,
        baseValues.requireLocation,
        classId,
        template.id,
        userId,
        input.published_at,
        input.deadline_at,
        baseValues.geoLat,
        baseValues.geoLng,
        baseValues.geoRadius,
        baseValues.geoAddress,
        baseValues.requireFace,
      ]
    );
    results.push(toTaskResponse(rows[0]));
  }

  return results;
}

export async function listTasks(
  userId: string,
  role: string,
  filters: TaskFilters = {},
  page = 1,
  limit = 20
): Promise<{ items: TaskWithStats[]; total: number; page: number; limit: number }> {
  // P3: 服务端分页，硬上限 50
  const safeLimit = Math.min(50, Math.max(1, limit));
  const safePage = Math.max(1, page);

  const whereConditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (role !== 'admin') {
    if (role === 'counselor') {
      // 辅导员应看到：
      // 1) 自己创建/派发的任务；
      // 2) 管理员直接发布给其管辖班级/学院/全校的任务。
      // 否则管理员在 Web 端发布的班级任务，教师端小程序里会看不到。
      const managed = await query<{ class_id: string; college_id: string }>(
        `SELECT cc.class_id, c.college_id
         FROM counselor_classes cc
         JOIN classes c ON c.id = cc.class_id
         WHERE cc.counselor_id = $1`,
        [userId]
      );
      const classIds = managed.map((m) => m.class_id).filter(Boolean);
      const collegeIds = [...new Set(managed.map((m) => m.college_id).filter(Boolean))];

      const visibilityConditions: string[] = [];
      visibilityConditions.push(`created_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
      visibilityConditions.push(`scope_type = 'school'`);

      if (collegeIds.length > 0) {
        visibilityConditions.push(
          `(scope_type = 'college' AND target_college_id = ANY($${paramIndex}::uuid[]))`
        );
        params.push(collegeIds);
        paramIndex++;
      }
      if (classIds.length > 0) {
        visibilityConditions.push(
          `(scope_type = 'class' AND target_class_id = ANY($${paramIndex}::uuid[]))`
        );
        params.push(classIds);
        paramIndex++;
      }

      whereConditions.push(`(${visibilityConditions.join(' OR ')})`);
    } else {
      whereConditions.push(`created_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }
  }
  if (filters.status) {
    whereConditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }
  if (filters.scopeType) {
    whereConditions.push(`scope_type = $${paramIndex}`);
    params.push(filters.scopeType);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const count = await queryCount(
    `SELECT COUNT(*) FROM tasks ${whereClause}`,
    params
  );

  const offset = (safePage - 1) * safeLimit;
  const tasks = await query<Task>(
    `SELECT * FROM tasks
     ${whereClause}
     ORDER BY deadline_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, safeLimit, offset]
  );

  // P2: 批量计算统计，消除 N+1
  const statsMap = await batchTaskStats(tasks);

  const items: TaskWithStats[] = tasks.map((task) => {
    const stats = statsMap[task.id] ?? { total: 0, completed: 0 };
    return {
      ...toTaskResponse(task),
      total_assignees: stats.total,
      completed_count: stats.completed,
      completion_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 1000) / 10 : 0,
    };
  });

  return { items, total: count, page: safePage, limit: safeLimit };
}

// P2: 批量统计多任务的覆盖人数与完成人数。
async function batchTaskStats(
  tasks: Task[]
): Promise<Record<string, { total: number; completed: number }>> {
  const result: Record<string, { total: number; completed: number }> = {};
  if (tasks.length === 0) return result;

  const taskIds = tasks.map((t) => t.id);

  // 完成数：一次性 GROUP BY task_id，status='approved'
  const completedRows = await query<{ task_id: string; count: string }>(
    `SELECT task_id, COUNT(*) AS count
     FROM check_ins
     WHERE status = 'approved' AND task_id = ANY($1)
     GROUP BY task_id`,
    [taskIds]
  );
  const completedMap: Record<string, number> = {};
  completedRows.forEach((row) => {
    completedMap[row.task_id] = parseInt(row.count, 10);
  });

  // 覆盖人数：按作用域分组分别 count（school / college / class）
  const schoolTasks = tasks.filter((t) => t.scope_type === 'school');
  const collegeTasks = tasks.filter((t) => t.scope_type === 'college' && t.target_college_id);
  const classTasks = tasks.filter((t) => t.scope_type === 'class' && t.target_class_id);

  // school 作用域：全校学生数
  let schoolTotal = 0;
  if (schoolTasks.length > 0) {
    schoolTotal = await queryCount(
      "SELECT COUNT(*) FROM users WHERE role = 'student'"
    );
  }

  // college 作用域：每个学院一次 count
  for (const task of collegeTasks) {
    const count = await queryCount(
      `SELECT COUNT(*) FROM users u
       JOIN classes c ON u.class_id = c.id
       WHERE u.role = 'student' AND c.college_id = $1`,
      [task.target_college_id as string]
    );
    result[task.id] = { total: count, completed: completedMap[task.id] || 0 };
  }

  // class 作用域：每个班级一次 count
  for (const task of classTasks) {
    const count = await queryCount(
      "SELECT COUNT(*) FROM users WHERE role = 'student' AND class_id = $1",
      [task.target_class_id as string]
    );
    result[task.id] = { total: count, completed: completedMap[task.id] || 0 };
  }

  // school 作用域共享同一个总数
  schoolTasks.forEach((task) => {
    result[task.id] = { total: schoolTotal, completed: completedMap[task.id] || 0 };
  });

  return result;
}

export async function updateTask(
  userId: string,
  role: string,
  taskId: string,
  input: UpdateTaskInput
): Promise<TaskResponse> {
  const task = await fetchTaskById(taskId);
  await assertTaskEditable(task, userId);

  // 权限控制
  if (role === 'admin') {
    // 管理员不能编辑从模板派生的任务实例（内容应在模板中维护）
    if (task.template_id) {
      throw new AppError('ACCESS_DENIED', '管理员不能编辑模板派生实例，请在模板库中编辑模板', 403);
    }
  } else if (role === 'counselor') {
    // 辅导员只能编辑自己直接创建的班级任务；模板派生实例只能下架
    if (task.template_id || task.created_by !== userId) {
      throw new AppError('ACCESS_DENIED', '辅导员只能编辑自己创建的班级任务', 403);
    }
  }

  const scopeType = input.scope_type ?? task.scope_type;
  // AD-21/AD-22: 统一使用 scope_id，同时兼容 target_college_id/target_class_id
  const scopeId = input.scope_id !== undefined ? input.scope_id : task.scope_id;
  // P8: scope 切换时主动清理无关 target id，避免 DB CHECK 约束 500
  const targetCollegeId = resolveTargetCollegeId(scopeType, input.target_college_id, task.target_college_id, scopeId);
  const targetClassId = resolveTargetClassId(scopeType, input.target_class_id, task.target_class_id, scopeId);
  // 仅非模板派生实例且为辅导员编辑时才需要校验范围权限
  if (!task.template_id || role !== 'counselor') {
    await assertScopePermission(userId, role, scopeType, targetCollegeId, targetClassId);
  }

  const publishedAt = input.published_at ?? task.published_at;
  const deadlineAt = input.deadline_at ?? task.deadline_at;
  if (new Date(deadlineAt) <= new Date(publishedAt)) {
    throw new AppError('VALIDATION_ERROR', '截止时间必须晚于发布时间', 400);
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  function addSet(column: string, value: unknown) {
    updates.push(`${column} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  // 模板派生实例不允许修改范围
  if (task.template_id && (input.scope_type || input.scope_id !== undefined || input.target_college_id || input.target_class_id)) {
    throw new AppError('VALIDATION_ERROR', '模板派生实例不允许修改发布范围', 400);
  }

  if (input.title !== undefined) addSet('title', input.title);
  if (input.description !== undefined) addSet('description', input.description ?? null);
  if (input.content !== undefined) addSet('content', input.content);
  if (input.cover_image !== undefined) addSet('cover_image', input.cover_image ?? null);
  if (input.category !== undefined) addSet('category', input.category ?? null);
  if (input.tags !== undefined) addSet('tags', input.tags ? JSON.stringify(input.tags) : null);
  // AD-22: 添加新字段支持
  if (input.guiding_questions !== undefined) {
    addSet('guiding_questions', input.guiding_questions ? JSON.stringify(input.guiding_questions) : null);
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
  if (input.scope_type !== undefined || input.scope_id !== undefined) {
    if (input.scope_type !== undefined) addSet('scope_type', input.scope_type);
    if (input.scope_id !== undefined) addSet('scope_id', scopeId);
    // scope 变化时强制带上清理后的 target id，保持 valid_task_scope 约束
    addSet('target_college_id', targetCollegeId);
    addSet('target_class_id', targetClassId);
  } else {
    if (input.target_college_id !== undefined) addSet('target_college_id', targetCollegeId);
    if (input.target_class_id !== undefined) addSet('target_class_id', targetClassId);
  }
  if (input.published_at !== undefined) addSet('published_at', input.published_at);
  if (input.deadline_at !== undefined) addSet('deadline_at', input.deadline_at);
  if (input.geo_lat !== undefined) addSet('geo_lat', input.geo_lat ?? null);
  if (input.geo_lng !== undefined) addSet('geo_lng', input.geo_lng ?? null);
  if (input.geo_radius_meters !== undefined) addSet('geo_radius_meters', input.geo_radius_meters ?? null);
  if (input.geo_address !== undefined) addSet('geo_address', input.geo_address ?? null);
  if (input.require_face !== undefined) addSet('require_face', input.require_face);
  if (input.status !== undefined) addSet('status', input.status);

  if (updates.length === 0) {
    return toTaskResponse(task);
  }

  params.push(taskId);
  const rows = await query<Task>(
    `UPDATE tasks
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (rows.length === 0) {
    throw new AppError('TASK_SERVICE_ERROR', '更新任务失败', 500);
  }

  return toTaskResponse(rows[0]);
}

// P8: 按 scope_type 归零无关字段；只允许 college 携带 college_id、class 携带 class_id
function resolveTargetCollegeId(
  scopeType: TaskScopeType,
  incoming: string | null | undefined,
  current: string | null,
  scopeId: string | null
): string | null {
  if (scopeType === 'college') {
    return incoming !== undefined ? (incoming ?? null) : (scopeId ?? current);
  }
  return null;
}

function resolveTargetClassId(
  scopeType: TaskScopeType,
  incoming: string | null | undefined,
  current: string | null,
  scopeId: string | null
): string | null {
  if (scopeType === 'class') {
    return incoming !== undefined ? (incoming ?? null) : (scopeId ?? current);
  }
  return null;
}

// P1: 下架独立于编辑。admin 可下架任意任务；发布人可下架自己的。
export async function delistTask(userId: string, role: string, taskId: string): Promise<TaskResponse> {
  const task = await fetchTaskById(taskId);

  // 权限控制
  if (role === 'admin') {
    // 管理员可下架任意任务实例
  } else if (role === 'counselor') {
    // 辅导员只能下架自己发布的任务实例
    if (task.created_by !== userId) {
      throw new AppError('ACCESS_DENIED', '辅导员只能下架自己发布的任务', 403);
    }
  }

  // P1: 下架不受截止时间限制（区别于编辑）

  if (task.status === 'delisted') {
    throw new AppError('TASK_ALREADY_DELISTED', '任务已下架', 409);
  }

  const rows = await query<Task>(
    `UPDATE tasks SET status = 'delisted' WHERE id = $1 RETURNING *`,
    [taskId]
  );
  if (rows.length === 0) {
    throw new AppError('TASK_SERVICE_ERROR', '下架任务失败', 500);
  }

  return toTaskResponse(rows[0]);
}

// AC-5: 任务统计
export async function getTaskStats(
  userId: string,
  role: string,
  taskId: string
): Promise<{ total: number; completed: number; rate: number }> {
  // P4: UUID 验证
  if (!isUuid(taskId)) {
    throw new AppError('VALIDATION_ERROR', '任务 ID 格式无效', 400);
  }

  const task = await fetchTaskById(taskId);

  // 权限校验：admin 可查看任意任务，辅导员只能查看自己发布的任务统计
  if (role === 'admin') {
    // no-op
  } else if (role === 'counselor') {
    if (task.created_by !== userId) {
      throw new AppError('ACCESS_DENIED', '辅导员只能查看自己发布的任务统计', 403);
    }
  }

  // 计算总人数（按 scope_type）
  let total = 0;
  if (task.scope_type === 'school') {
    total = await queryCount("SELECT COUNT(*) FROM users WHERE role = 'student'");
  } else if (task.scope_type === 'college' && task.target_college_id) {
    total = await queryCount(
      `SELECT COUNT(*) FROM users u
       JOIN classes c ON u.class_id = c.id
       WHERE u.role = 'student' AND c.college_id = $1`,
      [task.target_college_id]
    );
  } else if (task.scope_type === 'class' && task.target_class_id) {
    total = await queryCount(
      "SELECT COUNT(*) FROM users WHERE role = 'student' AND class_id = $1",
      [task.target_class_id]
    );
  }

  // 计算已完成人数（status = 'approved'）
  const completed = await queryCount(
    "SELECT COUNT(*) FROM check_ins WHERE task_id = $1 AND status = 'approved'",
    [taskId]
  );

  // 计算完成率
  const rate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  return { total, completed, rate };
}

export async function listMyTasks(
  userId: string,
  page = 1,
  limit = 20
): Promise<StudentTask[]> {
  const scope = await getUserScope(userId);
  if (!scope.class_id && !scope.college_id) {
    return [];
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  const tasks = await listVisibleTaskIds(scope);
  const paginated = tasks.slice(offset, offset + safeLimit);

  const taskIds = paginated.map((t) => t.id);
  const checkIns = await fetchUserCheckIns(userId, taskIds);

  return paginated.map((task) => {
    const checkIn = checkIns[task.id];
    const status = computeStudentTaskStatus(task.deadline_at, checkIn?.status);
    return {
      id: task.id,
      title: task.title,
      content: task.content,
      published_at: task.published_at,
      deadline_at: task.deadline_at,
      status,
      completed_at: status === 'completed' ? checkIn?.created_at : undefined,
    };
  });
}

export async function assertTaskVisibleToStudent(
  task: Task,
  userId: string
): Promise<void> {
  const now = new Date();
  if (new Date(task.deadline_at) <= now) {
    throw new AppError('CHECKIN_DEADLINE_PASSED', '任务已截止，无法打卡', 409);
  }

  const scope = await getUserScope(userId);
  const isVisible =
    task.status === 'published' &&
    new Date(task.published_at) <= now &&
    (task.scope_type === 'school' ||
      (task.scope_type === 'college' && task.target_college_id === scope.college_id) ||
      (task.scope_type === 'class' && task.target_class_id === scope.class_id));

  if (!isVisible) {
    throw new AppError('TASK_NOT_FOUND', '任务不存在', 404);
  }
}

export async function getMyTaskDetail(userId: string, taskId: string): Promise<TaskDetail> {
  const task = await fetchTaskById(taskId);
  await assertTaskVisibleToStudent(task, userId);

  const checkIns = await fetchUserCheckIns(userId, [taskId]);
  const checkIn = checkIns[taskId];
  const status = computeStudentTaskStatus(task.deadline_at, checkIn?.status);

  return {
    id: task.id,
    title: task.title,
    content: task.content,
    published_at: task.published_at,
    deadline_at: task.deadline_at,
    status,
    check_in_id: checkIn?.id,
    check_in_status: checkIn?.status,
    reflection_content: checkIn?.reflection_content ?? undefined,
    ai_review_reason: checkIn?.ai_review_reason ?? undefined,
    ai_review_reason_code: getReviewReasonCode(checkIn?.ai_review_reason ?? undefined),
    reflection_modified: checkIn?.reflection_modified,
    review_feedback: checkIn?.review_feedback ?? undefined,
    completed_at: status === 'completed' ? checkIn?.created_at : undefined,
    description: task.description,
    cover_image: task.cover_image,
    category: task.category,
    tags: task.tags,
    checkin_type: task.checkin_type,
    require_text: task.require_text,
    require_image: task.require_image,
    require_video: task.require_video,
    min_text_length: task.min_text_length,
    max_images: task.max_images,
    require_location: task.require_location,
    geo_lat: task.geo_lat,
    geo_lng: task.geo_lng,
    geo_radius_meters: task.geo_radius_meters,
    geo_address: task.geo_address,
    require_face: task.require_face,
  };
}
