import type { PoolClient } from 'pg';
import { query } from '../../lib/db.js';
import type { AwardPointsInput } from './points.types.js';

/**
 * 为学生某次有效打卡发放积分。
 * 幂等：同一 check_in_id 只能发放一次积分。
 * 可选传入事务 client，保证原子性。
 */
export async function awardPoints(
  input: AwardPointsInput,
  client?: PoolClient
): Promise<void> {
  const params = [input.userId, input.checkInId, input.points, input.reason];
  const sql = `INSERT INTO point_records (user_id, check_in_id, points, reason)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (check_in_id) DO NOTHING`;

  if (client) {
    await client.query(sql, params);
  } else {
    await query(sql, params);
  }
}
