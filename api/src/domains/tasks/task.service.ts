import { supabase } from '../../lib/supabase.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  Task,
  TaskResponse,
  TaskWithStats,
  StudentTask,
  TaskDetail,
  CreateTaskInput,
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
  const { data, error } = await supabase
    .from('users')
    .select('class_id, classes!left(college_id)')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
  }

  return {
    class_id: data.class_id,
    college_id: (data.classes as { college_id?: string } | null)?.college_id,
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
    const { data, error } = await supabase
      .from('counselor_classes')
      .select('id')
      .eq('counselor_id', userId)
      .eq('class_id', targetClassId)
      .maybeSingle();

    if (error || !data) {
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
    throw new AppError('TASK_DEADLINE_PASSED', '任务已截止，无法编辑', 409);
  }
}

async function fetchTaskById(taskId: string): Promise<Task> {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();
  if (error || !data) {
    throw new AppError('TASK_NOT_FOUND', '任务不存在', 404);
  }
  return data as Task;
}

async function fetchUserCheckIns(userId: string, taskIds: string[]) {
  if (taskIds.length === 0) return {};
  const { data, error } = await supabase
    .from('check_ins')
    .select('task_id, status, created_at')
    .eq('user_id', userId)
    .in('task_id', taskIds);

  if (error) {
    throw new AppError('TASK_SERVICE_ERROR', '获取打卡记录失败', 500);
  }

  const map: Record<string, { status: CheckInStatus; created_at: string }> = {};
  (data || []).forEach((row) => {
    map[row.task_id] = { status: row.status as CheckInStatus, created_at: row.created_at };
  });
  return map;
}

function buildVisibleTasksQuery(scope: UserScope) {
  const now = new Date().toISOString();
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', now);

  // P4: 显式 UUID 校验后再拼接 PostgREST OR，杜绝过滤器注入。
  // scope 值来自数据库，正常情况必为 UUID；此处防御非 UUID 异常数据。
  const orConditions: string[] = ['scope_type.eq.school'];
  if (scope.college_id && isUuid(scope.college_id)) {
    orConditions.push(`and(scope_type.eq.college,target_college_id.eq.${scope.college_id})`);
  }
  if (scope.class_id && isUuid(scope.class_id)) {
    orConditions.push(`and(scope_type.eq.class,target_class_id.eq.${scope.class_id})`);
  }
  query = query.or(orConditions.join(','));
  return query;
}

// P4: 简单 UUID v4 形式校验，防止非法值进入 PostgREST 过滤器字符串
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function createTask(
  userId: string,
  role: string,
  input: CreateTaskInput
): Promise<TaskResponse> {
  await assertScopePermission(userId, role, input.scope_type, input.target_college_id, input.target_class_id);

  if (new Date(input.deadline_at) <= new Date(input.published_at)) {
    throw new AppError('VALIDATION_ERROR', '截止时间必须晚于发布时间', 400);
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      content: input.content,
      scope_type: input.scope_type,
      target_college_id: input.target_college_id ?? null,
      target_class_id: input.target_class_id ?? null,
      created_by: userId,
      published_at: input.published_at,
      deadline_at: input.deadline_at,
    })
    .select()
    .single();

  if (error || !data) {
    throw new AppError('TASK_SERVICE_ERROR', '创建任务失败', 500);
  }

  return toTaskResponse(data as Task);
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

  let countQuery = supabase.from('tasks').select('*', { count: 'exact', head: true });
  let query = supabase.from('tasks').select('*');

  if (role !== 'admin') {
    countQuery = countQuery.eq('created_by', userId);
    query = query.eq('created_by', userId);
  }
  if (filters.status) {
    countQuery = countQuery.eq('status', filters.status);
    query = query.eq('status', filters.status);
  }
  if (filters.scopeType) {
    countQuery = countQuery.eq('scope_type', filters.scopeType);
    query = query.eq('scope_type', filters.scopeType);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new AppError('TASK_SERVICE_ERROR', '统计任务总数失败', 500);
  }

  query = query
    .order('deadline_at', { ascending: false })
    .range((safePage - 1) * safeLimit, safePage * safeLimit - 1);

  const { data, error } = await query;
  if (error) {
    throw new AppError('TASK_SERVICE_ERROR', '获取任务列表失败', 500);
  }

  const tasks = (data || []) as Task[];
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

  return { items, total: count || 0, page: safePage, limit: safeLimit };
}

// P2: 批量统计多任务的覆盖人数与完成人数。
// 按作用域类型分组，每组一次 count 查询；完成数一次 GROUP BY 查询。
async function batchTaskStats(
  tasks: Task[]
): Promise<Record<string, { total: number; completed: number }>> {
  const result: Record<string, { total: number; completed: number }> = {};
  if (tasks.length === 0) return result;

  // 完成数：一次性 GROUP BY task_id，status='approved'
  const taskIds = tasks.map((t) => t.id);
  const { data: completedRows, error: completedError } = await supabase
    .from('check_ins')
    .select('task_id')
    .eq('status', 'approved')
    .in('task_id', taskIds);

  if (completedError) {
    throw new AppError('TASK_SERVICE_ERROR', '统计完成人数失败', 500);
  }
  const completedMap: Record<string, number> = {};
  (completedRows || []).forEach((row: { task_id: string }) => {
    completedMap[row.task_id] = (completedMap[row.task_id] || 0) + 1;
  });

  // 覆盖人数：按作用域分组分别 count（school / college / class）
  const schoolTasks = tasks.filter((t) => t.scope_type === 'school');
  const collegeTasks = tasks.filter((t) => t.scope_type === 'college' && t.target_college_id);
  const classTasks = tasks.filter((t) => t.scope_type === 'class' && t.target_class_id);

  // school 作用域：全校学生数（所有 school 任务共享）
  let schoolTotal = 0;
  if (schoolTasks.length > 0) {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');
    if (error) {
      throw new AppError('TASK_SERVICE_ERROR', '统计全校学生数失败', 500);
    }
    schoolTotal = count || 0;
  }

  // college 作用域：每个学院一次 count
  for (const task of collegeTasks) {
    const { count, error } = await supabase
      .from('users')
      .select('*, classes!inner(college_id)', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('classes.college_id', task.target_college_id as string);
    if (error) {
      throw new AppError('TASK_SERVICE_ERROR', '统计学院学生数失败', 500);
    }
    result[task.id] = { total: count || 0, completed: completedMap[task.id] || 0 };
  }

  // class 作用域：每个班级一次 count
  for (const task of classTasks) {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('class_id', task.target_class_id as string);
    if (error) {
      throw new AppError('TASK_SERVICE_ERROR', '统计班级学生数失败', 500);
    }
    result[task.id] = { total: count || 0, completed: completedMap[task.id] || 0 };
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

  const scopeType = input.scope_type ?? task.scope_type;
  // P8: scope 切换时主动清理无关 target id，避免 DB CHECK 约束 500
  const targetCollegeId = resolveTargetCollegeId(scopeType, input.target_college_id, task.target_college_id);
  const targetClassId = resolveTargetClassId(scopeType, input.target_class_id, task.target_class_id);
  await assertScopePermission(userId, role, scopeType, targetCollegeId, targetClassId);

  const publishedAt = input.published_at ?? task.published_at;
  const deadlineAt = input.deadline_at ?? task.deadline_at;
  if (new Date(deadlineAt) <= new Date(publishedAt)) {
    throw new AppError('VALIDATION_ERROR', '截止时间必须晚于发布时间', 400);
  }

  const updatePayload: Record<string, unknown> = {};
  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.content !== undefined) updatePayload.content = input.content;
  if (input.scope_type !== undefined) {
    updatePayload.scope_type = input.scope_type;
    // scope 变化时强制带上清理后的 target id，保持 valid_task_scope 约束
    updatePayload.target_college_id = targetCollegeId;
    updatePayload.target_class_id = targetClassId;
  } else {
    if (input.target_college_id !== undefined) updatePayload.target_college_id = input.target_college_id;
    if (input.target_class_id !== undefined) updatePayload.target_class_id = input.target_class_id;
  }
  if (input.published_at !== undefined) updatePayload.published_at = input.published_at;
  if (input.deadline_at !== undefined) updatePayload.deadline_at = input.deadline_at;
  if (input.status !== undefined) updatePayload.status = input.status;

  const { data, error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId).select().single();
  if (error || !data) {
    throw new AppError('TASK_SERVICE_ERROR', '更新任务失败', 500);
  }

  return toTaskResponse(data as Task);
}

// P8: 按 scope_type 归零无关字段；只允许 college 携带 college_id、class 携带 class_id
function resolveTargetCollegeId(
  scopeType: TaskScopeType,
  incoming: string | null | undefined,
  current: string | null
): string | null {
  if (scopeType === 'college') {
    return incoming !== undefined ? (incoming ?? null) : current;
  }
  return null;
}

function resolveTargetClassId(
  scopeType: TaskScopeType,
  incoming: string | null | undefined,
  current: string | null
): string | null {
  if (scopeType === 'class') {
    return incoming !== undefined ? (incoming ?? null) : current;
  }
  return null;
}

// P1: 下架独立于编辑。admin 可下架任意任务；发布人可下架自己的。
// 不再受截止时间限制（下架是「立即隐藏」，不是编辑内容）。
export async function delistTask(userId: string, role: string, taskId: string): Promise<TaskResponse> {
  const task = await fetchTaskById(taskId);

  if (role !== 'admin' && task.created_by !== userId) {
    throw new AppError('ACCESS_DENIED', '只有管理员或发布人可以下架该任务', 403);
  }
  if (task.status === 'delisted') {
    throw new AppError('TASK_ALREADY_DELISTED', '任务已下架', 409);
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'delisted' })
    .eq('id', taskId)
    .select()
    .single();
  if (error || !data) {
    throw new AppError('TASK_SERVICE_ERROR', '下架任务失败', 500);
  }

  return toTaskResponse(data as Task);
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

  const query = buildVisibleTasksQuery(scope)
    .order('deadline_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, error } = await query;
  if (error) {
    throw new AppError('TASK_SERVICE_ERROR', '获取任务列表失败', 500);
  }

  const tasks = (data || []) as Task[];
  const taskIds = tasks.map((t) => t.id);
  const checkIns = await fetchUserCheckIns(userId, taskIds);

  return tasks.map((task) => {
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

export async function getMyTaskDetail(userId: string, taskId: string): Promise<TaskDetail> {
  const scope = await getUserScope(userId);
  const task = await fetchTaskById(taskId);

  const isVisible =
    task.status === 'published' &&
    new Date(task.published_at) <= new Date() &&
    (task.scope_type === 'school' ||
      (task.scope_type === 'college' && task.target_college_id === scope.college_id) ||
      (task.scope_type === 'class' && task.target_class_id === scope.class_id));

  if (!isVisible) {
    throw new AppError('TASK_NOT_FOUND', '任务不存在', 404);
  }

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
    check_in_status: checkIn?.status,
    completed_at: status === 'completed' ? checkIn?.created_at : undefined,
  };
}
