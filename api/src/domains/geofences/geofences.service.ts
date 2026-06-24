import { query, queryOne } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  Geofence,
  CreateGeofenceInput,
  UpdateGeofenceInput,
  GeofenceScopeType,
} from './geofences.types.js';

// 地球半径（米）
const EARTH_RADIUS = 6371000;

/**
 * Haversine 公式计算两点间距离（米）
 * 输入坐标为 gcj02 度
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

function buildSelect(): string {
  return `
    SELECT
      g.id,
      g.name,
      g.center_lat AS "centerLat",
      g.center_lng AS "centerLng",
      g.radius_meters AS "radiusMeters",
      g.scope_type AS "scopeType",
      g.scope_id AS "scopeId",
      g.is_enabled AS "isEnabled",
      g.created_at AS "createdAt",
      g.updated_at AS "updatedAt",
      CASE
        WHEN g.scope_type = 'school' THEN '全校'
        WHEN g.scope_type = 'college' THEN co.name
        WHEN g.scope_type = 'class' THEN cl.name
      END AS "scopeName"
    FROM geofences g
    LEFT JOIN colleges co ON g.scope_type = 'college' AND g.scope_id = co.id
    LEFT JOIN classes cl ON g.scope_type = 'class' AND g.scope_id = cl.id
  `;
}

export async function listGeofences(): Promise<Geofence[]> {
  return query<Geofence>(
    `${buildSelect()}
     ORDER BY g.created_at DESC`
  );
}

export async function getGeofenceById(id: string): Promise<Geofence | null> {
  return queryOne<Geofence>(
    `${buildSelect()}
     WHERE g.id = $1`,
    [id]
  );
}

export async function createGeofence(input: CreateGeofenceInput): Promise<Geofence> {
  validateGeofence(input);

  const result = await queryOne<Geofence>(
    `INSERT INTO geofences (name, center_lat, center_lng, radius_meters, scope_type, scope_id, is_enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.name,
      input.centerLat,
      input.centerLng,
      input.radiusMeters,
      input.scopeType,
      input.scopeId || null,
      input.isEnabled ?? true,
    ]
  );

  return getGeofenceById(result!.id) as Promise<Geofence>;
}

export async function updateGeofence(id: string, input: UpdateGeofenceInput): Promise<Geofence | null> {
  const existing = await getGeofenceById(id);
  if (!existing) return null;

  const merged: CreateGeofenceInput = {
    name: input.name ?? existing.name,
    centerLat: input.centerLat ?? existing.centerLat,
    centerLng: input.centerLng ?? existing.centerLng,
    radiusMeters: input.radiusMeters ?? existing.radiusMeters,
    scopeType: input.scopeType ?? existing.scopeType,
    scopeId: input.scopeId != null
      ? input.scopeId
      : (existing.scopeId ?? undefined),
    isEnabled: input.isEnabled ?? existing.isEnabled,
  };

  validateGeofence(merged);

  await query(
    `UPDATE geofences
     SET name = $1,
         center_lat = $2,
         center_lng = $3,
         radius_meters = $4,
         scope_type = $5,
         scope_id = $6,
         is_enabled = $7,
         updated_at = NOW()
     WHERE id = $8`,
    [
      merged.name,
      merged.centerLat,
      merged.centerLng,
      merged.radiusMeters,
      merged.scopeType,
      merged.scopeId || null,
      merged.isEnabled,
      id,
    ]
  );

  return getGeofenceById(id);
}

export async function deleteGeofence(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM geofences WHERE id = $1 RETURNING id',
    [id]
  );
  return !!result;
}

function validateGeofence(input: CreateGeofenceInput): void {
  if (!input.name || input.name.trim().length === 0) {
    throw new AppError('VALIDATION_ERROR', '围栏名称不能为空', 400);
  }
  if (input.centerLat < -90 || input.centerLat > 90) {
    throw new AppError('VALIDATION_ERROR', '纬度必须在 -90 到 90 之间', 400);
  }
  if (input.centerLng < -180 || input.centerLng > 180) {
    throw new AppError('VALIDATION_ERROR', '经度必须在 -180 到 180 之间', 400);
  }
  if (input.radiusMeters < 50 || input.radiusMeters > 5000) {
    throw new AppError('VALIDATION_ERROR', '半径必须在 50 到 5000 米之间', 400);
  }
  if ((input.scopeType === 'college' || input.scopeType === 'class') && !input.scopeId) {
    throw new AppError('VALIDATION_ERROR', '学院/班级围栏必须指定 scope_id', 400);
  }
  if (input.scopeType === 'school' && input.scopeId) {
    throw new AppError('VALIDATION_ERROR', '全校围栏不需要指定 scope_id', 400);
  }
}

/**
 * 判断给定点是否命中任一适用围栏。
 * 当前简化实现：只检查 school 级围栏和 class 级围栏（需要传入 classId）。
 */
export async function checkGeofence(
  lat: number,
  lng: number,
  classId?: string
): Promise<{ allowed: boolean; message?: string }> {
  // 1. 查询 school 级围栏
  const schoolGeofences = await query<Geofence>(
    `SELECT center_lat AS "centerLat", center_lng AS "centerLng", radius_meters AS "radiusMeters"
     FROM geofences
     WHERE scope_type = 'school' AND is_enabled = true`
  );

  // 2. 查询 class 级围栏
  const classGeofences = classId
    ? await query<Geofence>(
        `SELECT center_lat AS "centerLat", center_lng AS "centerLng", radius_meters AS "radiusMeters"
         FROM geofences
         WHERE scope_type = 'class' AND scope_id = $1 AND is_enabled = true`,
        [classId]
      )
    : [];

  const allGeofences = [...schoolGeofences, ...classGeofences];

  // 没有任何围栏时放行（兼容未配置围栏的过渡期）
  if (allGeofences.length === 0) {
    return { allowed: true };
  }

  for (const g of allGeofences) {
    const distance = haversineDistance(lat, lng, g.centerLat, g.centerLng);
    if (distance <= g.radiusMeters) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    message: '当前不在签到范围内，请到指定地点打卡',
  };
}
