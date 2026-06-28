import { query, queryOne } from '../../lib/db.js';
import type {
  DashboardStats,
  MultiDimStats,
  StatsFilters,
  ExportRequest,
  ExportResult,
} from './reports.types.js';

// 任务驱动口径：当前"进行中"的任务 = status='published' 且 now 在 published_at/deadline_at 窗口内。
const ACTIVE_TASKS_CTE = `
  active_tasks AS (
    SELECT t.id, t.title, t.deadline_at, t.scope_type,
           t.target_college_id, t.target_class_id
    FROM tasks t
    WHERE t.status = 'published'
      AND t.published_at <= NOW()
      AND t.deadline_at > NOW()
  )
`;

// 把每个活跃任务展开成 (task_id, user_id) 的"应打卡"明细。
// 应打卡人数定义与 task.service.ts 的 batchTaskStats 完全一致：
//   school  = 全校启用学生
//   college = 该学院下的启用学生
//   class   = 该班级的启用学生
const ACTIVE_ASSIGNMENTS_CTE = `
  active_assignments AS (
    SELECT a.id AS task_id, a.title AS task_title, a.deadline_at AS task_deadline,
           u.id AS user_id, co.id AS college_id, co.name AS college_name
    FROM active_tasks a
    JOIN users u ON u.role = 'student' AND u.is_enabled = true
    LEFT JOIN classes cl ON u.class_id = cl.id
    LEFT JOIN colleges co ON cl.college_id = co.id
    WHERE
      (a.scope_type = 'school')
      OR (a.scope_type = 'college' AND co.id = a.target_college_id)
      OR (a.scope_type = 'class'   AND u.class_id = a.target_class_id)
  )
`;

// "已完成打卡"宽口径：ai_approved（AI 自动通过）+ approved（人工终审通过）。
// 注意这与任务列表 completion_rate（仅 approved）有意不同：此处取学生"打完卡"视角。
const COMPLETED_STATUS = "('ai_approved', 'approved')";
// "有效打卡"口径：除 rejected 外都算（含进行中的各审核中间态）。
const VALID_STATUS = "<> 'rejected'";

export async function getDashboardStats(): Promise<DashboardStats> {
  // 一次性把活跃任务及其应打卡明细展开，后续所有 KPI 都基于这套 CTE 复用。
  // check_ins 只取关联到活跃任务、且为已完成态的，用于完成度统计。
  const baseQuery = `
    WITH ${ACTIVE_TASKS_CTE},
         ${ACTIVE_ASSIGNMENTS_CTE},
         completed_checkins AS (
           SELECT aa.task_id, aa.user_id
           FROM active_assignments aa
           JOIN check_ins ci ON ci.task_id = aa.task_id AND ci.user_id = aa.user_id
           WHERE ci.status IN ${COMPLETED_STATUS}
         )
    SELECT
      (SELECT COUNT(*)::int FROM active_tasks) AS active_task_count,
      -- 待完成人次 = 应打卡明细总数 - 已完成数
      (SELECT COUNT(*)::int FROM active_assignments)
        - (SELECT COUNT(*)::int FROM completed_checkins) AS pending_completion_count,
      -- 今日新增的有效打卡（不限任务，status<>rejected）
      (SELECT COUNT(*)::int FROM check_ins
         WHERE checked_in_at >= CURRENT_DATE AND status ${VALID_STATUS}) AS today_check_in_count,
      -- 系统累计完成打卡（不限任务/时间）
      (SELECT COUNT(*)::int FROM check_ins WHERE status IN ${COMPLETED_STATUS}) AS total_completed_count
  `;
  const kpi = await queryOne<{
    active_task_count: number;
    pending_completion_count: number;
    today_check_in_count: number;
    total_completed_count: number;
  }>(baseQuery);

  // 学院完成率排行：按学院聚合应打卡人次与已完成人次
  const collegeRankingRows = await query<{
    id: string;
    name: string;
    total_assignees: number;
    completed_count: number;
  }>(
    `WITH ${ACTIVE_TASKS_CTE}, ${ACTIVE_ASSIGNMENTS_CTE}, completed_checkins AS (
        SELECT aa.task_id, aa.user_id
        FROM active_assignments aa
        JOIN check_ins ci ON ci.task_id = aa.task_id AND ci.user_id = aa.user_id
        WHERE ci.status IN ${COMPLETED_STATUS}
      )
     SELECT aa.college_id AS id, aa.college_name AS name,
            COUNT(*)::int AS total_assignees,
            COUNT(cc.user_id)::int AS completed_count
     FROM active_assignments aa
     LEFT JOIN completed_checkins cc ON cc.task_id = aa.task_id AND cc.user_id = aa.user_id
     WHERE aa.college_id IS NOT NULL
     GROUP BY aa.college_id, aa.college_name
     ORDER BY completed_count DESC`,
    []
  );

  // 当前活跃任务下尚未完成打卡的学生（按截止时间升序，最紧迫优先）
  const pendingRows = await query<{
    id: string;
    name: string | null;
    school_id: string;
    college_name: string | null;
    class_name: string | null;
    task_id: string;
    task_title: string;
    task_deadline: string;
  }>(
    `WITH ${ACTIVE_TASKS_CTE}, ${ACTIVE_ASSIGNMENTS_CTE}, completed_checkins AS (
        SELECT aa.task_id, aa.user_id
        FROM active_assignments aa
        JOIN check_ins ci ON ci.task_id = aa.task_id AND ci.user_id = aa.user_id
        WHERE ci.status IN ${COMPLETED_STATUS}
      )
     SELECT aa.user_id AS id, u.name, u.school_id,
            aa.college_name, cl.name AS class_name,
            aa.task_id, aa.task_title, aa.task_deadline
     FROM active_assignments aa
     JOIN users u ON u.id = aa.user_id
     LEFT JOIN classes cl ON u.class_id = cl.id
     LEFT JOIN completed_checkins cc ON cc.task_id = aa.task_id AND cc.user_id = aa.user_id
     WHERE cc.user_id IS NULL
     ORDER BY aa.task_deadline ASC, u.school_id
     LIMIT 10`,
    []
  );

  // 近 12 天每日有效打卡趋势
  const trendRows = await query<{ date: string; check_in_count: number }>(
    `SELECT to_char(day, 'YYYY-MM-DD') AS date,
            COUNT(ci.id)::int AS check_in_count
     FROM generate_series(CURRENT_DATE - INTERVAL '11 days', CURRENT_DATE, INTERVAL '1 day') AS day
     LEFT JOIN check_ins ci ON ci.checked_in_at::date = day AND ci.status ${VALID_STATUS}
     GROUP BY day
     ORDER BY day`,
    []
  );

  return {
    activeTaskCount: kpi?.active_task_count ?? 0,
    pendingCompletionCount: kpi?.pending_completion_count ?? 0,
    todayCheckInCount: kpi?.today_check_in_count ?? 0,
    totalCompletedCount: kpi?.total_completed_count ?? 0,
    collegeRanking: collegeRankingRows.map((c) => ({
      id: c.id,
      name: c.name,
      totalAssignees: c.total_assignees,
      completedCount: c.completed_count,
      completionRate: c.total_assignees > 0
        ? Math.round((c.completed_count / c.total_assignees) * 1000) / 10
        : 0,
    })),
    pendingStudents: pendingRows.map((s) => ({
      id: s.id,
      name: s.name,
      schoolId: s.school_id,
      collegeName: s.college_name,
      className: s.class_name,
      taskId: s.task_id,
      taskTitle: s.task_title,
      taskDeadline: s.task_deadline,
    })),
    dailyCheckInTrend: trendRows.map((d) => ({
      date: d.date,
      checkInCount: d.check_in_count,
    })),
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
       -- 有效打卡：DISTINCT user_id，排除 rejected
       COUNT(DISTINCT CASE WHEN ci.status <> 'rejected' THEN ci.user_id END)::int AS check_in_count,
       COUNT(CASE WHEN ci.status <> 'rejected' THEN ci.id END)::int AS reflection_count,
       COUNT(CASE WHEN ci.status = 'ai_approved' THEN 1 END)::int AS ai_approved_count,
       COUNT(CASE WHEN ci.status IN ('pending_manual_review', 'approved', 'requires_modification') THEN 1 END)::int AS manual_review_count,
       COUNT(CASE WHEN ci.status = 'approved' THEN 1 END)::int AS manual_approved_count,
       COUNT(CASE WHEN ci.status = 'rejected' THEN 1 END)::int AS manual_rejected_count
     FROM users u
     ${joinClass}
     -- JOIN 保留所有状态（含 rejected），让下方 CASE 能分别计数；
     -- 各指标再用 CASE 显式按状态归类，避免 rejected 被算入"有效打卡"。
     LEFT JOIN check_ins ci ON u.id = ci.user_id ${dateCondition}
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
