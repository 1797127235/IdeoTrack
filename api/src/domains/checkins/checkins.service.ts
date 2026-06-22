import { supabase } from '../../lib/supabase.js';
import { AppError } from '../../middleware/error-handler.js';
import { assertTaskVisibleToStudent, fetchTaskById } from '../tasks/task.service.js';
import type { CheckIn, CheckInResponse, CreateCheckInInput } from './checkins.types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function createOrUpdateCheckIn(
  userId: string,
  input: CreateCheckInInput
): Promise<CheckInResponse> {
  const { task_id, latitude, longitude, address } = input;

  if (!task_id || !isUuid(task_id)) {
    throw new AppError('VALIDATION_ERROR', '任务 ID 无效', 400);
  }

  // 坐标范围已由 controller 的 zod schema 校验，此处为防御性断言
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new AppError('CHECKIN_LOCATION_INVALID', '定位坐标超出有效范围', 400);
  }

  const task = await fetchTaskById(task_id);
  await assertTaskVisibleToStudent(task, userId);

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
    throw new AppError('CHECKIN_SERVICE_ERROR', '签到失败', 500);
  }

  return toCheckInResponse(data as CheckIn);
}
