import { query, queryOne, queryCount } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import { getReviewReasonCode } from '../reviews/reviews.service.js';
import type {
  Task,
  TaskResponse,
  TaskWithStats,
  StudentTask,
  TaskDetail,
  CreateTaskInput,
  DispatchTaskInput,
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
  if (task.scope_type === 'pool') scope_label = '任务池';
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
     ORDER BY deadline_at DESC`,
    params
  );
}

export async function createTask(
  userId: string,
  role: string,
  input: CreateTaskInput
): Promise<TaskResponse> {
  // AD-21: 管理员可以创建任何 scope_type，辅导员只能创建 class scope
  if (role === 'counselor') {
    // 辅导员不能直接创建任务，只能派发
    throw new AppError('ACCESS_DENIED', '辅导员不能直接创建任务，请从任务池派发', 403);
  }

  // AD-21: 校验 scope_type 和 scope_id（与 schema 保持一致）
  if (input.scope_type === 'pool' || input.scope_type === 'school') {
    // 任务池/全校任务不需要 scope_id
    if (input.scope_id) {
      throw new AppError('VALIDATION_ERROR', '任务池/全校任务不需要指定 scope_id', 400);
    }
  } else {
    // college/class 必须提供有效 scope_id
    if (!input.scope_id) {
      throw new AppError('VALIDATION_ERROR', '学院/班级任务必须指定 scope_id', 400);
    }
  }

  if (new Date(input.deadline_at) <= new Date(input.published_at)) {
    throw new AppError('VALIDATION_ERROR', '截止时间必须晚于发布时间', 400);
  }

  // AD-21/AD-22: 统一使用 scope_id，同时维护 target_college_id/target_class_id 以保持查询兼容
  const targetCollegeId = input.scope_type === 'college' ? input.scope_id ?? null : null;
  const targetClassId = input.scope_type === 'class' ? input.scope_id ?? null : null;

  const rows = await query<Task>(
    `INSERT INTO tasks (
      title, content, guiding_questions, source_url, video_url,
      scope_type, scope_id, target_college_id, target_class_id, source_task_id,
      created_by, published_at, deadline_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      input.title,
      input.content,
      input.guiding_questions ? JSON.stringify(input.guiding_questions) : null,
      input.source_url ?? null,
      input.video_url ?? null,
      input.scope_type,
      input.scope_id ?? null,  // pool 时为 NULL
      targetCollegeId,
      targetClassId,
      null,  // source_task_id: 管理员直接创建的为 NULL
      userId,
      input.published_at,
      input.deadline_at,
    ]
  );

  if (rows.length === 0) {
    throw new AppError('TASK_SERVICE_ERROR', '创建任务失败', 500);
  }

  return toTaskResponse(rows[0]);
}

// AD-21: 辅导员派发任务
export async function dispatchTask(
  userId: string,
  role: string,
  input: DispatchTaskInput
): Promise<TaskResponse> {
  // 只有辅导员可以派发任务
  if (role !== 'counselor') {
    throw new AppError('ACCESS_DENIED', '只有辅导员可以派发任务', 403);
  }

  // 查询源任务
  const sourceTask = await fetchTaskById(input.source_task_id);

  // 校验源任务必须是任务池中的
  if (sourceTask.scope_type !== 'pool') {
    throw new AppError('VALIDATION_ERROR', '只能派发任务池中的任务', 400);
  }

  // P7: 校验源任务状态必须是 published
  if (sourceTask.status !== 'published') {
    throw new AppError('VALIDATION_ERROR', '只能派发已发布的任务', 400);
  }

  // 校验辅导员是否有权限派发到目标班级
  const relation = await queryOne<{ id: string }>(
    `SELECT id FROM counselor_classes
     WHERE counselor_id = $1 AND class_id = $2
     LIMIT 1`,
    [userId, input.target_class_id]
  );

  if (!relation) {
    throw new AppError('ACCESS_DENIED', '您没有该班级的派发权限', 403);
  }

  // 校验截止时间
  if (new Date(input.deadline_at) <= new Date()) {
    throw new AppError('VALIDATION_ERROR', '截止时间必须晚于当前时间', 400);
  }

  // DN-3: 校验派发截止时间不能晚于源任务截止时间
  if (new Date(input.deadline_at) > new Date(sourceTask.deadline_at)) {
    throw new AppError('VALIDATION_ERROR', '派发截止时间不能晚于源任务截止时间', 400);
  }

  // 从源任务拷贝快照字段，创建派发实例
  const rows = await query<Task>(
    `INSERT INTO tasks (
      title, content, guiding_questions, source_url, video_url,
      scope_type, scope_id, target_college_id, target_class_id, source_task_id,
      created_by, published_at, deadline_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      sourceTask.title,  // 快照：从源任务拷贝
      sourceTask.content,  // 快照：从源任务拷贝
      sourceTask.guiding_questions ? JSON.stringify(sourceTask.guiding_questions) : null,  // 快照
      sourceTask.source_url,  // 快照
      sourceTask.video_url,  // 快照
      'class',  // 派发实例的 scope_type 固定为 class
      input.target_class_id,
      null,  // target_college_id: class 作用域为 NULL
      input.target_class_id,  // target_class_id 与 scope_id 保持一致
      input.source_task_id,  // 指向源任务
      userId,
      new Date().toISOString(),  // 发布时间为当前时间
      input.deadline_at,
    ]
  );

  if (rows.length === 0) {
    throw new AppError('TASK_SERVICE_ERROR', '派发任务失败', 500);
  }

  return toTaskResponse(rows[0]);
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
    whereConditions.push(`created_by = $${paramIndex}`);
    params.push(userId);
    paramIndex++;
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

  // AD-21: 权限控制
  if (role === 'admin') {
    // 管理员不能编辑派发实例
    if (task.source_task_id) {
      throw new AppError('ACCESS_DENIED', '管理员不能编辑派发实例', 403);
    }
  } else if (role === 'counselor') {
    // 辅导员只能编辑派发实例
    if (!task.source_task_id) {
      throw new AppError('ACCESS_DENIED', '辅导员不能编辑源任务', 403);
    }
    // 辅导员只能编辑 deadline_at
    const allowedFields = ['deadline_at'];
    const inputFields = Object.keys(input);
    const invalidFields = inputFields.filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      throw new AppError('VALIDATION_ERROR', `辅导员只能编辑截止时间，不能编辑: ${invalidFields.join(', ')}`, 400);
    }
  }

  const scopeType = input.scope_type ?? task.scope_type;
  // AD-21/AD-22: 统一使用 scope_id，同时兼容 target_college_id/target_class_id
  const scopeId = input.scope_id !== undefined ? input.scope_id : task.scope_id;
  // P8: scope 切换时主动清理无关 target id，避免 DB CHECK 约束 500
  const targetCollegeId = resolveTargetCollegeId(scopeType, input.target_college_id, task.target_college_id, scopeId);
  const targetClassId = resolveTargetClassId(scopeType, input.target_class_id, task.target_class_id, scopeId);
  // P3: 跳过派发实例的范围检查（辅导员编辑 deadline_at 时）
  if (!(task.source_task_id && role === 'counselor')) {
    await assertScopePermission(userId, role, scopeType, targetCollegeId, targetClassId);
  }

  const publishedAt = input.published_at ?? task.published_at;
  const deadlineAt = input.deadline_at ?? task.deadline_at;
  if (new Date(deadlineAt) <= new Date(publishedAt)) {
    throw new AppError('VALIDATION_ERROR', '截止时间必须晚于发布时间', 400);
  }

  // P7: 辅导员编辑派发实例时，验证新截止时间不超过源任务截止时间
  if (task.source_task_id && role === 'counselor' && input.deadline_at) {
    const sourceTask = await fetchTaskById(task.source_task_id);
    if (new Date(deadlineAt) > new Date(sourceTask.deadline_at)) {
      throw new AppError('VALIDATION_ERROR', '派发截止时间不能晚于源任务截止时间', 400);
    }
  }

  // P8: 辅导员编辑派发实例时，验证新截止时间在当前时间之后
  if (task.source_task_id && role === 'counselor' && input.deadline_at) {
    if (new Date(deadlineAt) <= new Date()) {
      throw new AppError('VALIDATION_ERROR', '截止时间必须晚于当前时间', 400);
    }
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  function addSet(column: string, value: unknown) {
    updates.push(`${column} = $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  // P12: 派发实例不允许修改范围
  if (task.source_task_id && (input.scope_type || input.scope_id !== undefined || input.target_college_id || input.target_class_id)) {
    throw new AppError('VALIDATION_ERROR', '派发实例不允许修改发布范围', 400);
  }

  if (input.title !== undefined) addSet('title', input.title);
  if (input.content !== undefined) addSet('content', input.content);
  // AD-22: 添加新字段支持
  if (input.guiding_questions !== undefined) {
    addSet('guiding_questions', input.guiding_questions ? JSON.stringify(input.guiding_questions) : null);
  }
  if (input.source_url !== undefined) addSet('source_url', input.source_url ?? null);
  if (input.video_url !== undefined) addSet('video_url', input.video_url ?? null);
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

  // AD-21: 权限控制
  if (role === 'admin') {
    // 管理员可下架任意任务
  } else if (role === 'counselor') {
    // 辅导员只能下架自己派发的任务
    if (!task.source_task_id || task.created_by !== userId) {
      throw new AppError('ACCESS_DENIED', '辅导员只能下架自己派发的任务', 403);
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

  // 权限校验：admin 可查看任意任务，辅导员只能查看自己派发的任务
  if (role === 'admin') {
    // no-op
  } else if (role === 'counselor') {
    if (!task.source_task_id || task.created_by !== userId) {
      throw new AppError('ACCESS_DENIED', '辅导员只能查看自己派发的任务统计', 403);
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
  } else if (task.scope_type === 'pool') {
    // 任务池任务没有直接的总人数，返回 0
    total = 0;
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

// DN-1: 任务池查询（辅导员专用）
export async function listTaskPool(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ items: Task[]; total: number; page: number; limit: number }> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));

  const count = await queryCount(
    `SELECT COUNT(*) FROM tasks 
     WHERE scope_type = 'pool' AND status = 'published'`
  );

  const offset = (safePage - 1) * safeLimit;
  const tasks = await query<Task>(
    `SELECT * FROM tasks 
     WHERE scope_type = 'pool' AND status = 'published'
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [safeLimit, offset]
  );

  return { items: tasks, total: count, page: safePage, limit: safeLimit };
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
  };
}
