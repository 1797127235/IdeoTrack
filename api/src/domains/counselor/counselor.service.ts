import { config } from '../../config/index.js';
import { pool, query, queryOne } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { sendSubscribeMessage } from '../../lib/wechat.js';
import {
  resolveFilePath,
  saveExportFile,
  signDownloadToken,
} from '../../lib/storage.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  ClassDashboardItem,
  ClassReminderList,
  ClassStudentItem,
  ClassStudentList,
  CounselorDashboard,
  DashboardSummary,
  ExportCheckInsInput,
  ExportJobResult,
  ExportRowItem,
  ReminderRecord,
  ReminderStatus,
  SendRemindersInput,
  SendRemindersSummary,
  StudentFilterStatus,
} from './counselor.types.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toBeijingDateString(date = new Date()): string {
  return date.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function parseDate(input?: string): string {
  if (!input) return toBeijingDateString();
  if (!DATE_REGEX.test(input)) {
    throw new AppError('VALIDATION_ERROR', 'date 参数必须是 YYYY-MM-DD 格式', 400);
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'date 参数无效', 400);
  }
  return toBeijingDateString(d);
}

/**
 * 获取当前北京时间（测试环境可通过 REMINDER_TIME_OVERRIDE 覆盖）。
 */
function getCurrentBeijingTime(): Date {
  const override = process.env.REMINDER_TIME_OVERRIDE;
  if (override) {
    const d = new Date(override);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function getCurrentBeijingHour(): number {
  const hour = parseInt(
    getCurrentBeijingTime().toLocaleString('en-GB', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      hour12: false,
    }),
    10
  );
  return Number.isNaN(hour) ? -1 : hour;
}

function assertReminderTimeWindow(): void {
  const hour = getCurrentBeijingHour();
  if (hour < 8 || hour >= 22) {
    throw new AppError('REMINDER_TIME_WINDOW', '一键提醒仅可在 08:00–22:00 发送', 400);
  }
}

function assertWechatConfigured(): void {
  if (!config.wechatAppId || !config.wechatAppSecret) {
    throw new AppError('WECHAT_NOT_CONFIGURED', '微信小程序登录/提醒未配置', 500);
  }
  if (!config.wechatReminderTemplateId) {
    throw new AppError('WECHAT_TEMPLATE_MISSING', '缺少微信订阅消息模板 ID', 500);
  }
}

function buildReminderTemplateData(studentName: string, date: string): Record<string, { value: string }> {
  return {
    thing1: { value: studentName },
    time2: { value: date },
    thing3: { value: '请尽快完成今日思政打卡' },
  };
}

/**
 * 校验班级是否属于该辅导员管辖。
 * 不属于时返回 false（外层应视为 NOT_FOUND，避免 ID 遍历）。
 */
async function isClassManagedByCounselor(counselorId: string, classId: string): Promise<boolean> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM counselor_classes
     WHERE counselor_id = $1 AND class_id = $2`,
    [counselorId, classId]
  );
  return (row?.count ?? 0) > 0;
}

/**
 * 按 (student_id, date) 获取进程级 PostgreSQL advisory lock，用于防止并发重复发送。
 */
async function withStudentDateLock<T>(studentId: string, date: string, fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let lockKey: number | null = null;
  try {
    const { rows } = await client.query<{ lock_key: number }>(
      'SELECT hashtext($1::text) AS lock_key',
      [`${studentId}:${date}`]
    );
    lockKey = rows[0].lock_key;
    await client.query('SELECT pg_advisory_lock($1)', [lockKey]);
    return await fn();
  } finally {
    if (lockKey !== null) {
      await client.query('SELECT pg_advisory_unlock($1)', [lockKey]).catch(() => undefined);
    }
    client.release();
  }
}

/**
 * 获取辅导员所带班级的今日打卡概览。
 */
export async function getCounselorDashboard(
  counselorId: string,
  dateInput?: string
): Promise<CounselorDashboard> {
  const date = parseDate(dateInput);

  const rows = await query<
    ClassDashboardItem & {
      total_students: number;
      checked_in_count: number;
      reminded_count: number;
    }
  >(
    `SELECT
       c.id AS class_id,
       c.name AS class_name,
       co.name AS college_name,
       (
         SELECT COUNT(*)::int
         FROM users s
         WHERE s.class_id = c.id AND s.role = 'student'
       ) AS total_students,
       (
         SELECT COUNT(DISTINCT s.id)::int
         FROM users s
         JOIN check_ins ci
           ON ci.user_id = s.id
          AND ci.status = 'approved'
          AND DATE(ci.checked_in_at AT TIME ZONE 'Asia/Shanghai') = $2::date
         WHERE s.class_id = c.id AND s.role = 'student'
       ) AS checked_in_count,
       (
         SELECT COUNT(DISTINCT s.id)::int
         FROM users s
         JOIN reminders r
           ON r.student_id = s.id
          AND r.reminder_date = $2::date
          AND r.status = 'sent'
         WHERE s.class_id = c.id AND s.role = 'student'
       ) AS reminded_count
     FROM counselor_classes cc
     JOIN classes c ON cc.class_id = c.id
     JOIN colleges co ON c.college_id = co.id
     WHERE cc.counselor_id = $1
     ORDER BY c.name`,
    [counselorId, date]
  );

  const classes: ClassDashboardItem[] = rows.map((row) => {
    const total = row.total_students;
    const checked = row.checked_in_count;
    const rate = total > 0 ? Math.round((checked / total) * 100) : 0;
    return {
      class_id: row.class_id,
      class_name: row.class_name,
      college_name: row.college_name,
      total_students: total,
      checked_in_count: checked,
      check_in_rate: rate,
      absent_count: total - checked,
      reminded_count: row.reminded_count,
    };
  });

  const summary: DashboardSummary = classes.reduce(
    (acc, cls) => ({
      total_students: acc.total_students + cls.total_students,
      checked_in_count: acc.checked_in_count + cls.checked_in_count,
      check_in_rate: 0,
    }),
    { total_students: 0, checked_in_count: 0, check_in_rate: 0 }
  );

  summary.check_in_rate =
    summary.total_students > 0
      ? Math.round((summary.checked_in_count / summary.total_students) * 100)
      : 0;

  return { date, classes, summary };
}

/**
 * 获取某班级学生的当日打卡名单。
 */
export async function getClassStudentList(
  counselorId: string,
  classId: string,
  dateInput?: string,
  filterStatus: StudentFilterStatus = 'all'
): Promise<ClassStudentList> {
  const date = parseDate(dateInput);

  const managed = await isClassManagedByCounselor(counselorId, classId);
  if (!managed) {
    throw new AppError('NOT_FOUND', '请求的资源不存在', 404);
  }

  const classRow = await queryOne<{ class_name: string }>(
    `SELECT name AS class_name FROM classes WHERE id = $1`,
    [classId]
  );
  if (!classRow) {
    throw new AppError('NOT_FOUND', '请求的资源不存在', 404);
  }

  const rows = await query<ClassStudentItem>(
    `SELECT
       s.id AS student_id,
       COALESCE(NULLIF(s.name, ''), s.school_id) AS student_name,
       s.school_id AS student_school_id,
       CASE WHEN ci.id IS NOT NULL THEN true ELSE false END AS checked_in,
       ci.checked_in_at::text AS checked_in_at,
       ci.status AS status,
       ci.reflection_content AS reflection_content,
       COALESCE(
         GREATEST(
           ($2::date - (
             SELECT MAX(DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai'))
             FROM check_ins
             WHERE user_id = s.id
               AND status = 'approved'
               AND DATE(checked_in_at AT TIME ZONE 'Asia/Shanghai') <= $2::date
           ))::int,
           0
         ),
         0
       ) AS consecutive_absent_days,
       CASE WHEN r.id IS NOT NULL THEN true ELSE false END AS reminded
     FROM users s
     LEFT JOIN check_ins ci
       ON ci.user_id = s.id
      AND ci.status = 'approved'
      AND DATE(ci.checked_in_at AT TIME ZONE 'Asia/Shanghai') = $2::date
     LEFT JOIN reminders r
       ON r.student_id = s.id
      AND r.reminder_date = $2::date
      AND r.status = 'sent'
     WHERE s.class_id = $1
       AND s.role = 'student'
     ORDER BY s.school_id`,
    [classId, date]
  );

  const students = rows.filter((student) => {
    if (filterStatus === 'checked_in') return student.checked_in;
    if (filterStatus === 'absent') return !student.checked_in;
    return true;
  });

  return {
    class_id: classId,
    class_name: classRow.class_name,
    date,
    students,
  };
}

interface StudentReminderCandidate {
  student_id: string;
  student_name: string;
  student_school_id: string;
  wechat_openid: string | null;
  checked_in: boolean;
}

interface ReminderAttemptResult {
  status: Exclude<ReminderStatus, 'already_reminded'>;
  error_message: string | null;
}

/**
 * 向指定班级的未打卡学生批量发送一键提醒。
 */
export async function sendReminders(
  counselorId: string,
  classId: string,
  input: SendRemindersInput
): Promise<SendRemindersSummary> {
  const date = parseDate(input.date);
  const today = toBeijingDateString(getCurrentBeijingTime());
  if (date !== today) {
    throw new AppError('VALIDATION_ERROR', '一键提醒只能发送当天的提醒', 400);
  }

  const managed = await isClassManagedByCounselor(counselorId, classId);
  if (!managed) {
    throw new AppError('NOT_FOUND', '请求的资源不存在', 404);
  }

  assertReminderTimeWindow();
  assertWechatConfigured();

  const requestedIds = [...new Set(input.student_ids ?? [])];
  if (requestedIds.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'student_ids 不能为空', 400);
  }

  const candidateRows = await query<StudentReminderCandidate>(
    `SELECT
       s.id AS student_id,
       COALESCE(NULLIF(s.name, ''), s.school_id) AS student_name,
       s.school_id AS student_school_id,
       s.wechat_openid,
       CASE WHEN ci.id IS NOT NULL THEN true ELSE false END AS checked_in
     FROM users s
     LEFT JOIN check_ins ci
       ON ci.user_id = s.id
      AND ci.status = 'approved'
      AND DATE(ci.checked_in_at AT TIME ZONE 'Asia/Shanghai') = $2::date
     WHERE s.class_id = $1
       AND s.role = 'student'
       AND s.id = ANY($3::uuid[])`,
    [classId, date, requestedIds]
  );

  const candidateMap = new Map(candidateRows.map((r) => [r.student_id, r]));
  for (const id of requestedIds) {
    const candidate = candidateMap.get(id);
    if (!candidate) {
      throw new AppError('VALIDATION_ERROR', `学生 ${id} 不在该班级`, 400);
    }
    if (candidate.checked_in) {
      throw new AppError('VALIDATION_ERROR', `学生 ${candidate.student_name} 当日已打卡`, 400);
    }
  }

  const summary: SendRemindersSummary = {
    total: requestedIds.length,
    sent: 0,
    skipped_no_openid: 0,
    already_reminded: 0,
    failed: 0,
  };

  for (const id of requestedIds) {
    const candidate = candidateMap.get(id)!;

    await withStudentDateLock(id, date, async () => {
      const existingSent = await queryOne<{ id: string }>(
        `SELECT id FROM reminders
         WHERE reminder_date = $1
           AND student_id = $2
           AND status = 'sent'`,
        [date, id]
      );

      if (existingSent) {
        summary.already_reminded += 1;
        return;
      }

      if (!candidate.wechat_openid) {
        summary.skipped_no_openid += 1;
        await insertReminderRecord(counselorId, classId, id, date, 'skipped_no_openid', null);
        return;
      }

      let result: ReminderAttemptResult;
      try {
        await sendSubscribeMessage(
          candidate.wechat_openid,
          config.wechatReminderTemplateId,
          'pages/home/index',
          buildReminderTemplateData(candidate.student_name, date)
        );
        result = { status: 'sent', error_message: null };
        summary.sent += 1;
      } catch (err) {
        logger.warn({ err, student_id: id, class_id: classId }, '微信订阅消息发送失败');
        result = {
          status: 'failed',
          error_message: '微信订阅消息发送失败',
        };
        summary.failed += 1;
      }

      await insertReminderRecord(counselorId, classId, id, date, result.status, result.error_message);
    });
  }

  return summary;
}

async function insertReminderRecord(
  counselorId: string,
  classId: string,
  studentId: string,
  date: string,
  status: Exclude<ReminderStatus, 'already_reminded'>,
  errorMessage: string | null
): Promise<void> {
  await query(
    `INSERT INTO reminders
     (counselor_id, class_id, student_id, reminder_date, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [counselorId, classId, studentId, date, status, errorMessage]
  );
}

/**
 * 获取某班级在指定日期的提醒记录列表。
 */
export async function getClassReminders(
  counselorId: string,
  classId: string,
  dateInput?: string
): Promise<ClassReminderList> {
  const date = parseDate(dateInput);

  const managed = await isClassManagedByCounselor(counselorId, classId);
  if (!managed) {
    throw new AppError('NOT_FOUND', '请求的资源不存在', 404);
  }

  const rows = await query<ReminderRecord>(
    `SELECT
       r.id AS reminder_id,
       s.id AS student_id,
       COALESCE(NULLIF(s.name, ''), s.school_id) AS student_name,
       s.school_id AS student_school_id,
       r.status,
       r.error_message,
       r.created_at::text AS created_at
     FROM reminders r
     JOIN users s ON s.id = r.student_id
     WHERE r.class_id = $1
       AND r.reminder_date = $2::date
     ORDER BY r.created_at DESC`,
    [classId, date]
  );

  return {
    class_id: classId,
    date,
    reminders: rows,
  };
}

// ─── Epic 8.4: 辅导员数据导出 ───────────────────────────────────────────────

const MAX_EXPORT_RANGE_DAYS = 90;
export const MAX_EXPORT_CLASS_IDS = 50;

/**
 * 校验日期范围参数（复用严格 YYYY-MM-DD 正则，不调 parseDate 因为那是单日）。
 */
function parseExportDate(raw: string, label: string): string {
  if (!DATE_REGEX.test(raw)) {
    throw new AppError('VALIDATION_ERROR', `${label} 必须是 YYYY-MM-DD 格式`, 400);
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new AppError('VALIDATION_ERROR', `${label} 日期无效`, 400);
  }
  return raw;
}

/**
 * 导出辅导员所带班级的打卡数据为 Excel 文件（FR-24）。
 *
 * - RBAC：对每个 class_id 校验辅导员管辖权（AD-5）。
 * - 时区：日期范围按北京时间切分边界（与 8.1/8.2 一致）。
 * - 存储：Excel 写入本地临时文件，返回 24h 有效签名链接（AD-7）。
 */
export async function exportClassCheckIns(
  counselorId: string,
  input: ExportCheckInsInput
): Promise<ExportJobResult> {
  const startDate = parseExportDate(input.start_date, 'start_date');
  const endDate = parseExportDate(input.end_date, 'end_date');

  if (startDate > endDate) {
    throw new AppError('EXPORT_RANGE_INVALID', 'start_date 不能晚于 end_date', 400);
  }

  const rangeDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (rangeDays > MAX_EXPORT_RANGE_DAYS) {
    throw new AppError(
      'EXPORT_RANGE_TOO_WIDE',
      `日期范围不能超过 ${MAX_EXPORT_RANGE_DAYS} 天`,
      400
    );
  }

  const classIds = input.class_ids;
  if (classIds.length > MAX_EXPORT_CLASS_IDS) {
    throw new AppError('VALIDATION_ERROR', `class_ids 数量不能超过 ${MAX_EXPORT_CLASS_IDS}`, 400);
  }

  // 逐个校验班级归属（非管辖 → NOT_FOUND 404，避免 ID 遍历泄露）
  for (const classId of classIds) {
    const managed = await isClassManagedByCounselor(counselorId, classId);
    if (!managed) {
      throw new AppError('NOT_FOUND', '请求的资源不存在', 404);
    }
  }

  // 查询打卡明细（批量 class_id + 北京时区日期范围）
  const rows = await query<ExportRowItem>(
    `SELECT
       c.name          AS class_name,
       COALESCE(NULLIF(u.name, ''), u.school_id) AS student_name,
       u.school_id     AS student_school_id,
       t.title         AS task_title,
       ci.checked_in_at::text AS checked_in_at,
       ci.status       AS check_in_status,
       ci.reflection_content AS reflection_content
     FROM check_ins ci
     JOIN users u  ON u.id = ci.user_id AND u.role = 'student'
     JOIN classes c ON c.id = u.class_id
     JOIN tasks t  ON t.id = ci.task_id
     WHERE u.class_id = ANY($1::uuid[])
       AND DATE(ci.checked_in_at AT TIME ZONE 'Asia/Shanghai') >= $2::date
       AND DATE(ci.checked_in_at AT TIME ZONE 'Asia/Shanghai') <= $3::date
     ORDER BY c.name, u.school_id, ci.checked_in_at`,
    [classIds, startDate, endDate]
  );

  if (rows.length === 0) {
    throw new AppError('EXPORT_NO_DATA', '所选范围内没有可导出的打卡记录', 404);
  }

  // Excel 生成（exceljs）
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IdeoTrack';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('打卡记录');
  sheet.columns = [
    { header: '班级', key: 'class_name', width: 18 },
    { header: '姓名', key: 'student_name', width: 14 },
    { header: '学号', key: 'student_school_id', width: 16 },
    { header: '任务', key: 'task_title', width: 30 },
    { header: '打卡时间', key: 'checked_in_at', width: 22 },
    { header: '打卡状态', key: 'check_in_status', width: 14 },
    { header: '审核状态', key: 'check_in_status_display', width: 14 },
    { header: '心得内容', key: 'reflection_content', width: 60 },
  ];

  // 表头样式
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFECFEFF' },
  };

  const statusDisplayMap: Record<string, string> = {
    submitted: '已提交',
    ai_reviewing: 'AI审核中',
    ai_approved: 'AI通过',
    pending_manual_review: '待人工复核',
    approved: '已通过',
    rejected: '未通过',
    requires_modification: '要求修改',
  };

  for (const row of rows) {
    sheet.addRow({
      class_name: row.class_name,
      student_name: row.student_name,
      student_school_id: row.student_school_id,
      task_title: row.task_title,
      checked_in_at: row.checked_in_at,
      check_in_status: row.check_in_status,
      check_in_status_display: statusDisplayMap[row.check_in_status] || row.check_in_status,
      reflection_content: row.reflection_content,
    });
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const { fileId } = await saveExportFile(buffer, '.xlsx');
  const token = signDownloadToken(fileId);
  const expiresAt = new Date(Date.now() + config.exportLinkTtlSeconds * 1000).toISOString();

  logger.info(
    { counselor_id: counselorId, class_count: classIds.length, rows: rows.length, fileId },
    '辅导员导出完成'
  );

  return {
    download_url: `/api/exports/${token}`,
    expires_at: expiresAt,
  };
}
