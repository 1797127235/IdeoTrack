import { supabase } from '../../lib/supabase.js';
import { AppError } from '../../middleware/error-handler.js';
import type { CheckIn, CheckInResponse, CreateCheckInInput } from './checkins.types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface UserScope {
  class_id?: string | null;
  college_id?: string | null;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function toCheckInResponse(checkIn: CheckIn): CheckInResponse {
  return {
    id: checkIn.id,
    task_id: checkIn.task_id,
    status: checkIn.status,
    latitude: checkIn.latitude,
    longitude: checkIn.longitude,
    address: checkIn.address,
    checked_in_at: checkIn.checked_in_at,
  };
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

async function fetchTaskById(taskId: string) {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();
  if (error || !data) {
    throw new AppError('TASK_NOT_FOUND', '任务不存在', 404);
  }
  return data as {
    id: string;
    status: string;
    published_at: string;
    deadline_at: string;
    scope_type: string;
    target_college_id: string | null;
    target_class_id: string | null;
  };
}

function assertTaskVisible(task: Awaited<ReturnType<typeof fetchTaskById>>, scope: UserScope): void {
  const now = new Date();
  if (new Date(task.deadline_at) <= now) {
    throw new AppError('CHECKIN_DEADLINE_PASSED', '任务已截止，无法打卡', 409);
  }

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

function validateCoordinates(latitude: number, longitude: number): void {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new AppError('CHECKIN_LOCATION_REQUIRED', '请提供有效的定位坐标', 400);
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new AppError('CHECKIN_LOCATION_INVALID', '定位坐标超出有效范围', 400);
  }
}

export async function createOrUpdateCheckIn(
  userId: string,
  input: CreateCheckInInput
): Promise<CheckInResponse> {
  const { task_id, latitude, longitude, address } = input;

  if (!task_id || !isUuid(task_id)) {
    throw new AppError('VALIDATION_ERROR', '任务 ID 无效', 400);
  }

  validateCoordinates(latitude, longitude);

  const [task, scope] = await Promise.all([fetchTaskById(task_id), getUserScope(userId)]);
  assertTaskVisible(task, scope);

  const { data, error } = await supabase
    .from('check_ins')
    .upsert(
      {
        task_id,
        user_id: userId,
        status: 'submitted',
        latitude,
        longitude,
        address: address ?? null,
        checked_in_at: new Date().toISOString(),
      },
      { onConflict: 'task_id,user_id' }
    )
    .select()
    .single();

  if (error || !data) {
    console.error('checkin upsert error:', error);
    throw new AppError('CHECKIN_SERVICE_ERROR', '签到失败', 500);
  }

  return toCheckInResponse(data as CheckIn);
}
