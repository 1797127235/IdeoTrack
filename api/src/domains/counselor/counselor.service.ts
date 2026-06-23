import { query, queryOne } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  ClassDashboardItem,
  ClassStudentItem,
  ClassStudentList,
  CounselorDashboard,
  DashboardSummary,
  StudentFilterStatus,
} from './counselor.types.js';

function toBeijingDateString(date = new Date()): string {
  return date.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function parseDate(input?: string): string {
  if (!input) return toBeijingDateString();
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'date 参数无效', 400);
  }
  return toBeijingDateString(d);
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
 * 获取辅导员所带班级的今日打卡概览。
 */
export async function getCounselorDashboard(
  counselorId: string,
  dateInput?: string
): Promise<CounselorDashboard> {
  const date = parseDate(dateInput);

  const rows = await query<ClassDashboardItem & { college_name: string }>(
    `SELECT
       c.id AS class_id,
       c.name AS class_name,
       co.name AS college_name,
       COUNT(DISTINCT s.id)::int AS total_students,
       COUNT(DISTINCT CASE
         WHEN ci.id IS NOT NULL AND ci.status = 'approved'
         THEN s.id
       END)::int AS checked_in_count
     FROM counselor_classes cc
     JOIN classes c ON cc.class_id = c.id
     JOIN colleges co ON c.college_id = co.id
     LEFT JOIN users s ON s.class_id = c.id AND s.role = 'student'
     LEFT JOIN check_ins ci
       ON ci.user_id = s.id
      AND ci.status = 'approved'
      AND DATE(ci.checked_in_at AT TIME ZONE 'Asia/Shanghai') = $2::date
     WHERE cc.counselor_id = $1
     GROUP BY c.id, c.name, co.name
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
       ) AS consecutive_absent_days
     FROM users s
     LEFT JOIN check_ins ci
       ON ci.user_id = s.id
      AND ci.status = 'approved'
      AND DATE(ci.checked_in_at AT TIME ZONE 'Asia/Shanghai') = $2::date
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
