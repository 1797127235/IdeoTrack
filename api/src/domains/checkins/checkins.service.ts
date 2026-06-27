import { query, queryOne, withTransaction } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { AppError } from '../../middleware/error-handler.js';
import { verifyFaces, isFaceServiceConfigured } from '../../lib/face-client.js';
import { saveCapturedPhoto, readRegisteredPhoto } from '../../lib/face-storage.js';
import { aiReviewReflection, getReviewReasonCode, saveAIReviewRecord } from '../reviews/reviews.service.js';
import { assertTaskVisibleToStudent, fetchTaskById } from '../tasks/task.service.js';
import { awardPoints } from '../points/points.service.js';
import { haversineDistance } from '../tasks/task.utils.js';
import type {
  CheckIn,
  CheckInStatus,
  CheckInResponse,
  CheckInResultSummary,
  CreateCheckInInput,
  SubmitReflectionInput,
  CalendarDay,
  CalendarMonth,
  StudyRecordsResult,
  StudyRecordItem,
} from './checkins.types.js';
import type { AIReviewResult } from '../reviews/reviews.types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function formatChinaDate(date: Date): string {
  const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return chinaTime.toISOString().slice(0, 10);
}

function computeStreakDays(days: string[]): number {
  if (days.length === 0) return 0;
  const dateSet = new Set(days);
  const sortedDesc = [...days].sort((a, b) => b.localeCompare(a));
  let cursor = new Date(sortedDesc[0] + 'T00:00:00.000Z');
  let count = 0;
  const maxLookback = 365;
  for (let i = 0; i < maxLookback; i++) {
    const cursorStr = cursor.toISOString().slice(0, 10);
    if (dateSet.has(cursorStr)) {
      count++;
    } else {
      break;
    }
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return count;
}

function computeLevelProgress(streakDays: number): number {
  if (streakDays < 7) {
    return Math.min(100, Math.round((streakDays / 7) * 100));
  }
  if (streakDays < 30) {
    return Math.min(100, Math.round((streakDays / 30) * 100));
  }
  return 100;
}

function computeEarnedBadge(streakDays: number): '坚持一周' | '坚持一月' | null {
  if (streakDays >= 30) return '坚持一月';
  if (streakDays >= 7) return '坚持一周';
  return null;
}

export async function getCheckInResult(
  userId: string,
  checkInId: string
): Promise<CheckInResultSummary> {
  if (!isUuid(checkInId)) {
    throw new AppError('VALIDATION_ERROR', '打卡记录 ID 无效', 400);
  }

  const checkIn = await queryOne<{
    check_in_id: string;
    task_id: string;
    task_title: string;
    status: string;
    reflection_content: string | null;
  }>(
    `SELECT ci.id AS check_in_id,
            ci.task_id,
            t.title AS task_title,
            ci.status,
            ci.reflection_content
     FROM check_ins ci
     JOIN tasks t ON ci.task_id = t.id
     WHERE ci.id = $1 AND ci.user_id = $2
     LIMIT 1`,
    [checkInId, userId]
  );

  if (!checkIn) {
    throw new AppError('CHECKIN_NOT_FOUND', '打卡记录不存在', 404);
  }

  const daysRows = await query<{ day: string }>(
    `SELECT DISTINCT DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai')::text AS day
     FROM check_ins
     WHERE user_id = $1 AND status IN ('approved', 'ai_approved')
     ORDER BY day DESC`,
    [userId]
  );
  const days = daysRows.map((row) => row.day);
  const streakDays = computeStreakDays(days);

  return {
    check_in_id: checkIn.check_in_id,
    task_id: checkIn.task_id,
    task_title: checkIn.task_title,
    status: checkIn.status as CheckInResultSummary['status'],
    reflection_content: checkIn.reflection_content,
    base_points: 10,
    streak_days: streakDays,
    next_level_progress: computeLevelProgress(streakDays),
    earned_badge: computeEarnedBadge(streakDays),
  };
}

function toCheckInResponse(checkIn: CheckIn): CheckInResponse {
  return {
    id: checkIn.id,
    task_id: checkIn.task_id,
    status: checkIn.status,
    latitude: Number(checkIn.latitude),
    longitude: Number(checkIn.longitude),
    address: checkIn.address,
    checked_in_at: checkIn.checked_in_at,
    reflection_content: checkIn.reflection_content,
    ai_review_reason: checkIn.ai_review_reason,
    ai_review_reason_code: getReviewReasonCode(checkIn.ai_review_reason ?? undefined),
    review_feedback: checkIn.review_feedback,
    reflection_modified: checkIn.reflection_modified,
    face_photo_path: checkIn.face_photo_path,
    face_verified: checkIn.face_verified,
    face_similarity: checkIn.face_similarity === null ? null : Number(checkIn.face_similarity),
  };
}

export async function createOrUpdateCheckIn(
  userId: string,
  input: CreateCheckInInput,
  photoBuffer?: Buffer,
  photoExt?: string
): Promise<CheckInResponse> {
  const { task_id, latitude, longitude, address, reflection_content } = input;

  if (!task_id || !isUuid(task_id)) {
    throw new AppError('VALIDATION_ERROR', '任务 ID 无效', 400);
  }

  // 坐标范围已由 controller 的 zod schema 校验，此处为防御性断言
  // 未配置位置签到的任务允许使用默认值 0,0
  const safeLatitude = latitude ?? 0;
  const safeLongitude = longitude ?? 0;
  if (safeLatitude < -90 || safeLatitude > 90 || safeLongitude < -180 || safeLongitude > 180) {
    throw new AppError('CHECKIN_LOCATION_INVALID', '定位坐标超出有效范围', 400);
  }

  const task = await fetchTaskById(task_id);
  await assertTaskVisibleToStudent(task, userId);

  // 演示环境：放开位置签到范围校验。
  // 原因：Web 端发布任务用的是桌面浏览器 IP 定位（误差数百米~数公里），
  // 与手机真实 GPS 坐标系统性偏差，导致学生即使站在签到点也被误判为越界。
  // 完整校验逻辑见 git 历史，正式上线前需恢复。
  // if (task.geo_lat != null && task.geo_lng != null && task.geo_radius_meters != null) {
  //   const distance = haversineDistance(safeLatitude, safeLongitude, task.geo_lat, task.geo_lng);
  //   if (distance > task.geo_radius_meters) {
  //     throw new AppError('CHECKIN_OUTSIDE_GEOFENCE', '当前不在签到范围内，请到指定地点打卡', 403);
  //   }
  // }

  // 人脸打卡校验：任务开启 require_face 时，必须上传现场照并与注册照比对通过
  // 任一环节失败均硬阻断签到（不通过/无人脸/无注册照/服务故障）
  let facePhotoPath: string | null = null;
  let faceVerified: boolean | null = null;
  let faceSimilarity: number | null = null;

  if (task.require_face) {
    if (!photoBuffer) {
      throw new AppError('FACE_PHOTO_REQUIRED', '该任务需要人脸打卡，请先拍照', 400);
    }
    if (!isFaceServiceConfigured()) {
      throw new AppError('FACE_SERVICE_UNAVAILABLE', '人脸校验服务未启用，请联系管理员', 503);
    }

    // 查询该学生的注册照
    const face = await queryOne<{ photo_path: string }>(
      'SELECT photo_path FROM user_faces WHERE user_id = $1',
      [userId]
    );
    if (!face) {
      throw new AppError('FACE_NO_REFERENCE', '未找到您的注册照，请联系辅导员录入', 400);
    }

    // image vs image 比对（无需 embedding 向量）
    const refBytes = await readRegisteredPhoto(face.photo_path);
    let result;
    try {
      result = await verifyFaces(refBytes, photoBuffer);
    } catch (err) {
      // FaceServiceError（超时/HTTP错误/不可用）→ 硬阻断，避免无人脸校验即放行
      logger.warn(
        { err: err instanceof Error ? { message: err.message } : { message: String(err) } },
        '人脸比对服务调用失败，阻断签到'
      );
      throw new AppError('FACE_SERVICE_UNAVAILABLE', '人脸校验服务暂时不可用，请重试', 503);
    }
    if (!result.detected) {
      throw new AppError('FACE_NOT_DETECTED', '未检测到人脸，请在光线充足处正对镜头重拍', 400);
    }
    if (!result.isMatch) {
      logger.warn(
        {
          userId,
          taskId: task_id,
          similarity: result.similarity,
          threshold: result.threshold,
        },
        '人脸比对未通过'
      );
      throw new AppError('FACE_MISMATCH', '人脸比对不通过，请使用本人面部', 403);
    }

    // 比对通过：落盘现场照并记录结果
    facePhotoPath = await saveCapturedPhoto(photoBuffer, photoExt ?? 'jpg');
    faceVerified = true;
    faceSimilarity = result.similarity;
  } else if (photoBuffer) {
    // 非强制人脸任务但传了现场照：best-effort 落盘留痕（不影响签到结果）
    facePhotoPath = await saveCapturedPhoto(photoBuffer, photoExt ?? 'jpg');
  }

  const rows = await query<CheckIn>(
    `INSERT INTO check_ins (
      task_id, user_id, status, latitude, longitude, address, checked_in_at, reflection_content,
      face_photo_path, face_verified, face_similarity
    ) VALUES ($1, $2, 'submitted', $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (task_id, user_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      address = EXCLUDED.address,
      checked_in_at = EXCLUDED.checked_in_at,
      reflection_content = EXCLUDED.reflection_content,
      face_photo_path = EXCLUDED.face_photo_path,
      face_verified = EXCLUDED.face_verified,
      face_similarity = EXCLUDED.face_similarity,
      updated_at = NOW()
    RETURNING *`,
    [
      task_id,
      userId,
      safeLatitude,
      safeLongitude,
      address ?? null,
      new Date().toISOString(),
      reflection_content ?? null,
      facePhotoPath,
      faceVerified,
      faceSimilarity,
    ]
  );

  if (rows.length === 0) {
    throw new AppError('CHECKIN_SERVICE_ERROR', '签到失败', 500);
  }

  // 带心得一次性提交（task/detail 一站式流程）：落库后立即跑 AI 审核，
  // 这样 status 直接是终态（ai_approved / pending_manual_review），不再停留在 submitted。
  const checkIn = rows[0];
  const trimmedReflection = reflection_content?.trim();
  if (trimmedReflection) {
    const reviewed = await applyReflectionReview(
      checkIn.id,
      userId,
      trimmedReflection,
      { id: task.id, content: task.content }
    );
    return toCheckInResponse(reviewed);
  }

  return toCheckInResponse(checkIn);
}

function isReflectionEditableStatus(status: string): boolean {
  return status === 'submitted' || status === 'ai_reviewing';
}

function isReflectionModifiableStatus(status: string): boolean {
  return status === 'pending_manual_review' || status === 'requires_modification';
}

function isTerminalStatus(status: string): boolean {
  return status === 'approved' || status === 'rejected';
}

function toCalendarDay(row: {
  day: string;
  status: string;
  reflection_content: string | null;
  task_title: string | null;
}): CalendarDay {
  return {
    day: row.day,
    checked_in: true,
    status: row.status as CheckInStatus,
    reflection_content: row.reflection_content,
    task_title: row.task_title,
  };
}

export async function getStudentCalendar(
  userId: string,
  year: number,
  month: number
): Promise<CalendarMonth> {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError('VALIDATION_ERROR', '年份或月份无效', 400);
  }

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10);

  const rows = await query<{
    day: string;
    status: string;
    reflection_content: string | null;
    task_title: string | null;
  }>(
    `SELECT DISTINCT ON (DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai'))
            DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai')::text AS day,
            ci.status,
            ci.reflection_content,
            t.title AS task_title
     FROM check_ins ci
     JOIN tasks t ON ci.task_id = t.id
     WHERE ci.user_id = $1
       AND DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai') BETWEEN $2 AND $3
     ORDER BY DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai'), ci.updated_at DESC`,
    [userId, start, end]
  );

  return {
    year,
    month,
    days: rows.map(toCalendarDay),
  };
}

/**
 * 对一条打卡心得执行 AI 审核：跑审核规则 → 存初审记录 → 落库终态。
 * 审核通过（ai_approved）即发放积分；转人工复核不发积分，留待辅导员通过后再发。
 * 打卡接口（带心得一次性提交）与心得提交接口共用此逻辑，保证行为一致。
 */
async function applyReflectionReview(
  checkInId: string,
  userId: string,
  content: string,
  task: { id: string; content: string }
): Promise<CheckIn> {
  // AI 审核（事务外执行，aiReviewReflection 内部已实现 3 秒超时）
  let reviewResult: AIReviewResult;
  try {
    reviewResult = await aiReviewReflection({
      reflectionContent: content,
      taskContent: task.content,
    });
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? { message: error.message } : { message: String(error) } },
      'AI review failed, falling back to manual review'
    );
    reviewResult = {
      status: 'pending_manual_review',
      reason: 'AI 审核异常，转人工复核',
      reason_code: 'ai_review_error',
    };
  }

  // 保存 AI 初审记录，支持审计与调优（Story 5.1 / NFR-8）
  try {
    await saveAIReviewRecord({
      checkInId,
      taskId: task.id,
      userId,
      reflectionContent: content,
      taskContent: task.content,
      status: reviewResult.status,
      reason: reviewResult.reason,
      reasonCode: reviewResult.reason_code,
    });
  } catch (recordError) {
    logger.warn(
      { err: recordError instanceof Error ? { message: recordError.message } : { message: String(recordError) } },
      'Failed to save AI review record'
    );
  }

  const finalRows = await query<CheckIn>(
    `UPDATE check_ins
     SET status = $1,
         ai_review_reason = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [reviewResult.status, reviewResult.reason ?? null, checkInId]
  );

  if (finalRows.length === 0) {
    throw new AppError('CHECKIN_SERVICE_ERROR', '心得状态更新失败', 500);
  }

  // AI 审核通过即发放积分（幂等：ON CONFLICT (check_in_id) DO NOTHING）；
  // 转人工复核的留待辅导员通过后由 makeReviewDecision 发放。
  if (reviewResult.status === 'ai_approved') {
    await awardPoints({
      userId,
      checkInId,
      points: 10,
      reason: '打卡通过，获得积分',
    });
  }

  return finalRows[0];
}

export async function submitReflection(
  userId: string,
  input: SubmitReflectionInput
): Promise<CheckInResponse> {
  const { check_in_id, content } = input;

  if (!check_in_id || !isUuid(check_in_id)) {
    throw new AppError('VALIDATION_ERROR', '打卡记录 ID 无效', 400);
  }

  // 在事务中锁定并更新打卡记录，防止并发提交突破修改次数限制
  const { checkIn, task } = await withTransaction(async (client) => {
    const checkInResult = await client.query<CheckIn>(
      `SELECT * FROM check_ins WHERE id = $1 AND user_id = $2 LIMIT 1 FOR UPDATE`,
      [check_in_id, userId]
    );

    if (checkInResult.rows.length === 0) {
      throw new AppError('CHECKIN_NOT_FOUND', '打卡记录不存在', 404);
    }

    const checkIn = checkInResult.rows[0];

    // 校验任务未截止且对学生可见
    const task = await fetchTaskById(checkIn.task_id);
    await assertTaskVisibleToStudent(task, userId);

    if (isTerminalStatus(checkIn.status)) {
      throw new AppError('CHECKIN_ALREADY_REVIEWED', '打卡已完成审核，无法修改心得', 409);
    }

    const isFirstSubmission = isReflectionEditableStatus(checkIn.status);
    const isModification = isReflectionModifiableStatus(checkIn.status);

    if (!isFirstSubmission && !isModification) {
      throw new AppError('CHECKIN_INVALID_STATUS', '当前状态不允许提交心得', 409);
    }

    // 除辅导员要求修改（requires_modification）外，其余流程均受 reflection_modified 一次限制
    const limitedByModifiedFlag = checkIn.status !== 'requires_modification';
    if (limitedByModifiedFlag && checkIn.reflection_modified) {
      throw new AppError(
        'CHECKIN_REFLECTION_ALREADY_MODIFIED',
        '你已经修改过一次心得，无法再次修改',
        409
      );
    }

    // 首次提交：只有已经存在内容时才算修改；修改流程一律标记为 true
    const reflectionModified = isModification ? true : !!checkIn.reflection_content;

    const updateResult = await client.query<CheckIn>(
      `UPDATE check_ins
       SET reflection_content = $1,
           reflection_modified = $2,
           status = 'ai_reviewing',
           ai_review_reason = NULL,
           updated_at = NOW()
       WHERE id = $3
         AND status = ANY($4)
       RETURNING *`,
      [content, reflectionModified, checkIn.id, [checkIn.status]]
    );

    if (updateResult.rows.length === 0) {
      throw new AppError('CHECKIN_CANNOT_MODIFY_REFLECTION', '当前状态不允许修改心得', 409);
    }

    return { checkIn: updateResult.rows[0], task };
  });

  // 复用统一审核逻辑：AI 审核 → 存记录 → 落库终态 → 通过发积分
  const finalCheckIn = await applyReflectionReview(checkIn.id, userId, content, { id: task.id, content: task.content });

  return toCheckInResponse(finalCheckIn);
}

export async function getStudyRecords(
  userId: string,
  type: string | undefined,
  page = 1,
  limit = 20
): Promise<StudyRecordsResult> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  const whereType = type === 'reflection'
    ? "AND ci.reflection_content IS NOT NULL AND ci.reflection_content <> ''"
    : type === 'task'
    ? "AND ci.status IN ('approved', 'ai_approved')"
    : '';

  const items = await query<{
    id: string;
    task_id: string;
    task_title: string;
    status: string;
    checked_in_at: string;
    reflection_content: string | null;
    points: number;
  }>(
    `SELECT ci.id,
            ci.task_id,
            t.title AS task_title,
            ci.status,
            ci.checked_in_at,
            ci.reflection_content,
            COALESCE(SUM(pr.points), 0)::int AS points
     FROM check_ins ci
     JOIN tasks t ON ci.task_id = t.id
     LEFT JOIN point_records pr ON pr.check_in_id = ci.id
     WHERE ci.user_id = $1
       ${whereType}
     GROUP BY ci.id, ci.task_id, t.title, ci.status, ci.checked_in_at, ci.reflection_content
     ORDER BY ci.checked_in_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, offset]
  );

  const countRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM check_ins ci
     JOIN tasks t ON ci.task_id = t.id
     WHERE ci.user_id = $1
       ${whereType}`,
    [userId]
  );

  return {
    items: items.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      taskTitle: row.task_title,
      status: row.status as StudyRecordItem['status'],
      checkedInAt: row.checked_in_at,
      reflectionContent: row.reflection_content,
      points: row.points,
    })),
    total: countRow?.total ?? 0,
    page: safePage,
    limit: safeLimit,
  };
}
