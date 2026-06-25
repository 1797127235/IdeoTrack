import { query, queryOne } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import type { LeaderboardResult, LeaderboardItem } from './leaderboard.types.js';

const LIMIT = 10;

interface StudentScope {
  classId: string | null;
  collegeId: string | null;
}

async function getStudentScope(userId: string): Promise<StudentScope> {
  const row = await queryOne<StudentScope>(
    `SELECT u.class_id AS "classId", c.college_id AS "collegeId"
     FROM users u
     LEFT JOIN classes c ON c.id = u.class_id
     WHERE u.id = $1`,
    [userId]
  );
  return { classId: row?.classId ?? null, collegeId: row?.collegeId ?? null };
}

function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}*${name[name.length - 1]}`;
}

function buildLeaderboard(
  rows: Array<{ user_id: string; name: string; school_id: string; points: number }>,
  userId: string
): LeaderboardItem[] {
  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    name: row.user_id === userId ? row.name : maskName(row.name),
    schoolId: row.school_id,
    points: row.points,
    isMe: row.user_id === userId,
  }));
}

async function queryLeaderboard(
  whereClause: string,
  params: unknown[],
  userId: string
): Promise<LeaderboardResult> {
  const rows = await query<{ user_id: string; name: string; school_id: string; points: number }>(
    `SELECT u.id AS user_id,
            COALESCE(NULLIF(u.name, ''), u.school_id) AS name,
            u.school_id,
            COALESCE(SUM(pr.points), 0)::int AS points
     FROM users u
     LEFT JOIN point_records pr ON pr.user_id = u.id
     WHERE u.role = 'student'
       AND u.is_enabled = true
       AND ${whereClause}
     GROUP BY u.id, u.name, u.school_id
     ORDER BY points DESC, u.school_id ASC
     LIMIT ${LIMIT}`,
    params
  );

  const allRows = await query<{ user_id: string; points: number; rank: number }>(
    `SELECT ranked.user_id, ranked.points, ranked.rank
     FROM (
       SELECT u.id AS user_id,
              COALESCE(SUM(pr.points), 0)::int AS points,
              DENSE_RANK() OVER (ORDER BY COALESCE(SUM(pr.points), 0) DESC, u.school_id ASC) AS rank
       FROM users u
       LEFT JOIN point_records pr ON pr.user_id = u.id
       WHERE u.role = 'student'
         AND u.is_enabled = true
         AND ${whereClause}
       GROUP BY u.id, u.school_id
     ) ranked`,
    params
  );

  const myRow = allRows.find((r) => r.user_id === userId);
  const totalCount = allRows.length;
  const myRank = myRow?.rank ?? null;
  const beatRate = totalCount > 0 && myRank !== null
    ? Math.round(((totalCount - myRank) / totalCount) * 100)
    : 0;

  return {
    scope: 'class',
    myRank,
    beatRate,
    totalCount,
    items: buildLeaderboard(rows, userId),
  };
}

export async function getClassLeaderboard(userId: string): Promise<LeaderboardResult> {
  const scope = await getStudentScope(userId);
  if (!scope.classId) {
    throw new AppError('LEADERBOARD_NO_CLASS', '未加入班级，无法查看班级排行榜', 400);
  }

  const result = await queryLeaderboard('u.class_id = $1', [scope.classId], userId);
  return { ...result, scope: 'class' };
}

export async function getCollegeLeaderboard(userId: string): Promise<LeaderboardResult> {
  const scope = await getStudentScope(userId);
  if (!scope.collegeId) {
    throw new AppError('LEADERBOARD_NO_COLLEGE', '未加入学院，无法查看学院排行榜', 400);
  }

  const result = await queryLeaderboard(
    'u.class_id IN (SELECT id FROM classes WHERE college_id = $1)',
    [scope.collegeId],
    userId
  );
  return { ...result, scope: 'college' };
}

export async function getSchoolLeaderboard(userId: string): Promise<LeaderboardResult> {
  const result = await queryLeaderboard('1 = $1', [1], userId);
  return { ...result, scope: 'school' };
}
