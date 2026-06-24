import { query, queryOne } from '../../lib/db.js';
import type {
  DashboardStats,
  MultiDimStats,
  StatsFilters,
  ExportRequest,
  ExportResult,
} from './reports.types.js';

function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { start, end } = getTodayRange();

  const totalStudentsResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM users WHERE role = 'student' AND is_enabled = true`
  );
  const todayTotalStudents = totalStudentsResult?.count ?? 0;

  const checkInResult = await queryOne<{ count: number }>(
    `SELECT COUNT(DISTINCT user_id)::int AS count
     FROM check_ins
     WHERE checked_in_at >= $1 AND checked_in_at < $2
       AND status <> 'rejected'`,
    [start, end]
  );
  const todayCheckInCount = checkInResult?.count ?? 0;
  const todayAbsentCount = todayTotalStudents - todayCheckInCount;
  const todayCheckInRate = todayTotalStudents > 0
    ? Math.round((todayCheckInCount / todayTotalStudents) * 1000) / 10
    : 0;

  const totalCheckInsResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM check_ins WHERE status <> 'rejected'`
  );
  const totalReflectionsResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM check_ins WHERE reflection_content IS NOT NULL`
  );

  const collegeRanking = await query<{
    id: string;
    name: string;
    check_in_count: number;
    total_students: number;
  }>(
    `WITH college_students AS (
       SELECT u.id AS user_id, c.id AS college_id, c.name AS college_name
       FROM users u
       JOIN classes cl ON u.class_id = cl.id
       JOIN colleges c ON cl.college_id = c.id
       WHERE u.role = 'student' AND u.is_enabled = true
     ),
     today_checkins AS (
       SELECT DISTINCT user_id
       FROM check_ins
       WHERE checked_in_at >= $1 AND checked_in_at < $2
         AND status <> 'rejected'
     )
     SELECT
       cs.college_id AS id,
       cs.college_name AS name,
       COUNT(DISTINCT cs.user_id)::int AS total_students,
       COUNT(DISTINCT tc.user_id)::int AS check_in_count
     FROM college_students cs
     LEFT JOIN today_checkins tc ON cs.user_id = tc.user_id
     GROUP BY cs.college_id, cs.college_name
     ORDER BY check_in_count DESC`,
    [start, end]
  );

  const ranking = collegeRanking.map((c) => ({
    id: c.id,
    name: c.name,
    checkInCount: c.check_in_count,
    totalStudents: c.total_students,
    rate: c.total_students > 0
      ? Math.round((c.check_in_count / c.total_students) * 1000) / 10
      : 0,
  }));

  const absentStudents = await query<{
    id: string;
    name: string | null;
    school_id: string;
    college_name: string | null;
    class_name: string | null;
    last_check_in_date: string | null;
  }>(
    `WITH last_checkin AS (
       SELECT user_id, MAX(checked_in_at::date) AS last_date
       FROM check_ins
       WHERE status <> 'rejected'
       GROUP BY user_id
     )
     SELECT
       u.id,
       u.name,
       u.school_id,
       co.name AS college_name,
       cl.name AS class_name,
       lc.last_date AS last_check_in_date
     FROM users u
     JOIN classes cl ON u.class_id = cl.id
     JOIN colleges co ON cl.college_id = co.id
     LEFT JOIN last_checkin lc ON u.id = lc.user_id
     WHERE u.role = 'student' AND u.is_enabled = true
       AND (lc.last_date IS NULL OR lc.last_date < CURRENT_DATE)
     ORDER BY lc.last_date NULLS FIRST
     LIMIT 10`
  );

  const recentAbsentStudents = absentStudents.map((s) => {
    const lastDate = s.last_check_in_date ? new Date(s.last_check_in_date) : null;
    const today = new Date();
    const diffDays = lastDate
      ? Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : 30;
    return {
      id: s.id,
      name: s.name,
      schoolId: s.school_id,
      collegeName: s.college_name,
      className: s.class_name,
      consecutiveAbsentDays: diffDays,
      lastCheckInDate: s.last_check_in_date,
    };
  });

  return {
    todayCheckInRate,
    todayCheckInCount,
    todayTotalStudents,
    todayAbsentCount,
    totalStudents: todayTotalStudents,
    totalCheckIns: totalCheckInsResult?.count ?? 0,
    totalReflections: totalReflectionsResult?.count ?? 0,
    collegeRanking: ranking,
    recentAbsentStudents,
  };
}

export async function getMultiDimStats(filters: StatsFilters): Promise<MultiDimStats[]> {
  const { scope, scopeId, startDate, endDate } = filters;

  const whereConditions = ["u.role = 'student'", "u.is_enabled = true"];
  const params: unknown[] = [];

  if (scope === 'college' && scopeId) {
    whereConditions.push('co.id = $1');
    params.push(scopeId);
  } else if (scope === 'class' && scopeId) {
    whereConditions.push('cl.id = $1');
    params.push(scopeId);
  }

  let dateCondition = '';
  if (startDate && endDate) {
    const idx = params.length + 1;
    dateCondition = `AND ci.checked_in_at >= $${idx} AND ci.checked_in_at < $${idx + 1}`;
    params.push(startDate, endDate);
  }

  const groupBy = scope === 'class'
    ? 'cl.id, cl.name, co.name'
    : scope === 'college'
      ? 'co.id, co.name'
      : "'school', '全校'";

  const selectScope = scope === 'class'
    ? "cl.id AS scope_id, cl.name AS scope_name, co.name AS parent_name"
    : scope === 'college'
      ? "co.id AS scope_id, co.name AS scope_name, NULL AS parent_name"
      : "'school' AS scope_id, '全校' AS scope_name, NULL AS parent_name";

  const joinClass = scope === 'school'
    ? 'LEFT JOIN classes cl ON u.class_id = cl.id LEFT JOIN colleges co ON cl.college_id = co.id'
    : scope === 'college'
      ? 'JOIN classes cl ON u.class_id = cl.id JOIN colleges co ON cl.college_id = co.id'
      : 'JOIN classes cl ON u.class_id = cl.id JOIN colleges co ON cl.college_id = co.id';

  const rows = await query<{
    scope_id: string;
    scope_name: string;
    parent_name: string | null;
    total_students: number;
    check_in_count: number;
    reflection_count: number;
    ai_approved_count: number;
    manual_review_count: number;
    manual_approved_count: number;
    manual_rejected_count: number;
  }>(
    `SELECT
       ${selectScope},
       COUNT(DISTINCT u.id)::int AS total_students,
       COUNT(DISTINCT ci.user_id)::int AS check_in_count,
       COUNT(ci.id)::int AS reflection_count,
       COUNT(CASE WHEN ci.status = 'ai_approved' THEN 1 END)::int AS ai_approved_count,
       COUNT(CASE WHEN ci.status IN ('pending_manual_review', 'approved', 'rejected', 'requires_modification') THEN 1 END)::int AS manual_review_count,
       COUNT(CASE WHEN ci.status = 'approved' THEN 1 END)::int AS manual_approved_count,
       COUNT(CASE WHEN ci.status = 'rejected' THEN 1 END)::int AS manual_rejected_count
     FROM users u
     ${joinClass}
     LEFT JOIN check_ins ci ON u.id = ci.user_id AND ci.status <> 'rejected' ${dateCondition}
     WHERE ${whereConditions.join(' AND ')}
     GROUP BY ${groupBy}`,
    params
  );

  return rows.map((r) => ({
    scope,
    scopeId: r.scope_id,
    scopeName: r.parent_name ? `${r.parent_name} - ${r.scope_name}` : r.scope_name,
    totalStudents: r.total_students,
    checkInCount: r.check_in_count,
    checkInRate: r.total_students > 0
      ? Math.round((r.check_in_count / r.total_students) * 1000) / 10
      : 0,
    absentCount: r.total_students - r.check_in_count,
    reflectionCount: r.reflection_count,
    aiApprovedCount: r.ai_approved_count,
    aiReviewCount: r.check_in_count - r.ai_approved_count,
    manualReviewCount: r.manual_review_count,
    manualApprovedCount: r.manual_approved_count,
    manualRejectedCount: r.manual_rejected_count,
  }));
}

export async function exportReport(_request: ExportRequest): Promise<ExportResult> {
  throw new Error('导出功能尚未实现');
}
