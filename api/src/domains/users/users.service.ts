import bcrypt from 'bcryptjs';
import { query, queryOne } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import { logger } from '../../lib/logger.js';
import { extractEmbedding, FaceServiceError, isFaceServiceConfigured } from '../../lib/face-client.js';
import { saveRegisteredPhoto, deleteRegisteredPhoto, readRegisteredPhoto } from '../../lib/face-storage.js';
import { runPool } from '../../lib/pool.js';
import type {
  College,
  Class,
  User,
  UserFace,
  BatchFaceImportItem,
  BatchFaceImportResult,
  Counselor,
  ManagedClass,
  SetManagedClassesInput,
  CreateCollegeInput,
  UpdateCollegeInput,
  CreateClassInput,
  UpdateClassInput,
  CreateUserInput,
  UpdateUserInput,
  BatchImportUserInput,
  BatchImportResult,
  BatchImportOrgRow,
  BatchImportOrgResult,
  BatchImportOrgResultItem,
  UserRole,
  UserFilters,
  ListUsersResult,
} from './users.types.js';

const BCRYPT_SALT_ROUNDS = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateDefaultPassword(schoolId: string): string {
  return schoolId.slice(-6);
}

// ===== Colleges =====

export async function listColleges(): Promise<College[]> {
  const rows = await query<College>(
    `SELECT id, name, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM colleges
     ORDER BY name`
  );
  return rows;
}

export async function getCollegeById(id: string): Promise<College | null> {
  return queryOne<College>(
    `SELECT id, name, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM colleges
     WHERE id = $1`,
    [id]
  );
}

export async function createCollege(input: CreateCollegeInput): Promise<College> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM colleges WHERE name = $1 LIMIT 1',
    [input.name]
  );
  if (existing) {
    throw new AppError('COLLEGE_NAME_EXISTS', '学院名称已存在', 409);
  }

  return queryOne<College>(
    `INSERT INTO colleges (name)
     VALUES ($1)
     RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [input.name]
  ) as Promise<College>;
}

export async function updateCollege(id: string, input: UpdateCollegeInput): Promise<College | null> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM colleges WHERE name = $1 AND id != $2 LIMIT 1',
    [input.name, id]
  );
  if (existing) {
    throw new AppError('COLLEGE_NAME_EXISTS', '学院名称已存在', 409);
  }

  return queryOne<College>(
    `UPDATE colleges SET name = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [input.name, id]
  );
}

export async function deleteCollege(id: string): Promise<boolean> {
  const classesCount = await queryOne<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM classes WHERE college_id = $1',
    [id]
  );
  if (classesCount && classesCount.count > 0) {
    throw new AppError('COLLEGE_HAS_CLASSES', '该学院下还有班级，无法删除', 409);
  }

  const result = await queryOne<{ id: string }>(
    'DELETE FROM colleges WHERE id = $1 RETURNING id',
    [id]
  );
  return !!result;
}

// ===== Classes =====

export async function listClasses(): Promise<Class[]> {
  const rows = await query<Class>(
    `SELECT c.id, c.college_id AS "collegeId", c.name,
            c.created_at AS "createdAt", c.updated_at AS "updatedAt",
            co.name AS "collegeName"
     FROM classes c
     JOIN colleges co ON c.college_id = co.id
     ORDER BY co.name, c.name`
  );
  return rows;
}

export async function getClassById(id: string): Promise<Class | null> {
  return queryOne<Class>(
    `SELECT c.id, c.college_id AS "collegeId", c.name,
            c.created_at AS "createdAt", c.updated_at AS "updatedAt",
            co.name AS "collegeName"
     FROM classes c
     JOIN colleges co ON c.college_id = co.id
     WHERE c.id = $1`,
    [id]
  );
}

export async function createClass(input: CreateClassInput): Promise<Class> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM classes WHERE college_id = $1 AND name = $2 LIMIT 1',
    [input.collegeId, input.name]
  );
  if (existing) {
    throw new AppError('CLASS_NAME_EXISTS', '该学院下已存在同名班级', 409);
  }

  return queryOne<Class>(
    `INSERT INTO classes (college_id, name)
     VALUES ($1, $2)
     RETURNING id, college_id AS "collegeId", name,
              created_at AS "createdAt", updated_at AS "updatedAt"`,
    [input.collegeId, input.name]
  ) as Promise<Class>;
}

export async function updateClass(id: string, input: UpdateClassInput): Promise<Class | null> {
  const collegeId = input.collegeId ?? (await getClassById(id))?.collegeId;
  if (!collegeId) {
    throw new AppError('CLASS_NOT_FOUND', '班级不存在', 404);
  }

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM classes WHERE college_id = $1 AND name = $2 AND id != $3 LIMIT 1',
    [collegeId, input.name, id]
  );
  if (existing) {
    throw new AppError('CLASS_NAME_EXISTS', '该学院下已存在同名班级', 409);
  }

  return queryOne<Class>(
    `UPDATE classes SET college_id = $1, name = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, college_id AS "collegeId", name,
              created_at AS "createdAt", updated_at AS "updatedAt"`,
    [collegeId, input.name, id]
  );
}

export async function deleteClass(id: string): Promise<boolean> {
  const usersCount = await queryOne<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM users WHERE class_id = $1',
    [id]
  );
  if (usersCount && usersCount.count > 0) {
    throw new AppError('CLASS_HAS_STUDENTS', '该班级下还有学生，无法删除', 409);
  }

  // 清理辅导员班级关联
  await query('DELETE FROM counselor_classes WHERE class_id = $1', [id]);

  const result = await queryOne<{ id: string }>(
    'DELETE FROM classes WHERE id = $1 RETURNING id',
    [id]
  );
  return !!result;
}

// ===== Users =====

function buildUserListQuery(): string {
  return `
    SELECT
      u.id,
      u.school_id AS "schoolId",
      u.name,
      u.role,
      u.is_enabled AS "isEnabled",
      u.is_initial_password AS "isInitialPassword",
      u.class_id AS "classId",
      COALESCE(c.college_id, u.college_id) AS "collegeId",
      u.college_id AS "directCollegeId",
      c.name AS "className",
      COALESCE(co.name, co2.name) AS "collegeName",
      -- hasFace：有可用比对向量才算「已注册」，仅存原图无向量（face 服务降级）的不计
      (uf.id IS NOT NULL AND uf.embedding IS NOT NULL) AS "hasFace",
      u.created_at AS "createdAt",
      u.updated_at AS "updatedAt"
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN colleges co ON c.college_id = co.id
    LEFT JOIN colleges co2 ON u.college_id = co2.id
    LEFT JOIN user_faces uf ON uf.user_id = u.id
  `;
}

export async function listUsers(
  filters: UserFilters = {},
  page = 1,
  limit = 20
): Promise<ListUsersResult> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (filters.keyword && filters.keyword.trim()) {
    const keyword = `%${filters.keyword.trim()}%`;
    conditions.push(`(u.school_id ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
    values.push(keyword);
    paramIndex++;
  }
  if (filters.role) {
    conditions.push(`u.role = $${paramIndex}`);
    values.push(filters.role);
    paramIndex++;
  }
  if (filters.classId) {
    conditions.push(`u.class_id = $${paramIndex}`);
    values.push(filters.classId);
    paramIndex++;
  }
  if (filters.collegeId) {
    conditions.push(`(c.college_id = $${paramIndex} OR u.college_id = $${paramIndex})`);
    values.push(filters.collegeId);
    paramIndex++;
  }
  if (filters.isEnabled !== undefined) {
    conditions.push(`u.is_enabled = $${paramIndex}`);
    values.push(filters.isEnabled);
    paramIndex++;
  }
  if (filters.hasFace !== undefined) {
    conditions.push(filters.hasFace
      ? `(uf.id IS NOT NULL AND uf.embedding IS NOT NULL)`
      : `(uf.id IS NULL OR uf.embedding IS NULL)`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM users u
     LEFT JOIN classes c ON u.class_id = c.id
     LEFT JOIN colleges co ON c.college_id = co.id
     LEFT JOIN colleges co2 ON u.college_id = co2.id
     LEFT JOIN user_faces uf ON uf.user_id = u.id
     ${whereClause}`,
    values
  );
  const total = countRow?.count ?? 0;

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  const rows = await query<User>(
    `${buildUserListQuery()}
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, safeLimit, offset]
  );

  return {
    items: rows,
    total,
    page: safePage,
    limit: safeLimit,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    `${buildUserListQuery()}
     WHERE u.id = $1`,
    [id]
  );
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE school_id = $1 LIMIT 1',
    [input.schoolId]
  );
  if (existing) {
    throw new AppError('SCHOOL_ID_EXISTS', '学号/工号已存在', 409);
  }

  if (input.role === 'student' && !input.classId) {
    throw new AppError('STUDENT_REQUIRES_CLASS', '学生必须分配班级', 400);
  }
  // 辅导员直属单一学院，所带班级必须属于该学院
  if (input.role === 'counselor' && !input.collegeId) {
    throw new AppError('COUNSELOR_REQUIRES_COLLEGE', '辅导员必须分配学院', 400);
  }

  const passwordHash = await bcrypt.hash(generateDefaultPassword(input.schoolId), BCRYPT_SALT_ROUNDS);

  // 如果传了 classId，从班级推断学院；否则用显式 collegeId
  let collegeId = input.collegeId ?? null;
  if (input.classId) {
    const cls = await queryOne<{ college_id: string }>('SELECT college_id FROM classes WHERE id = $1 LIMIT 1', [input.classId]);
    if (cls) collegeId = cls.college_id;
    // 辅导员/学生的班级必须与归属学院一致
    if (input.collegeId && cls && cls.college_id !== input.collegeId) {
      throw new AppError('CLASS_COLLEGE_MISMATCH', '班级不属于所选学院', 400);
    }
  }

  const user = await queryOne<User>(
    `INSERT INTO users (school_id, password_hash, name, role, class_id, college_id, is_enabled, is_initial_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING id`,
    [
      input.schoolId,
      passwordHash,
      input.name || null,
      input.role,
      input.classId || null,
      collegeId,
      input.isEnabled ?? true,
    ]
  );

  if (input.role === 'counselor' && input.classId) {
    await query(
      'INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user!.id, input.classId]
    );
  }

  return getUserById(user!.id) as Promise<User>;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
  const existing = await getUserById(id);
  if (!existing) return null;

  if (input.role === 'student' && input.classId === null) {
    throw new AppError('STUDENT_REQUIRES_CLASS', '学生必须分配班级', 400);
  }

  // 角色变成辅导员、或已是辅导员且未提供学院 -> 必须有学院
  const newRole = input.role ?? existing.role;
  const newCollegeId = input.collegeId !== undefined ? input.collegeId : existing.collegeId;
  if (newRole === 'counselor' && !newCollegeId) {
    throw new AppError('COUNSELOR_REQUIRES_COLLEGE', '辅导员必须分配学院', 400);
  }

  // 班级与学院一致性：若同时提供了班级和学院，必须同属
  if (input.classId && input.collegeId !== undefined && input.collegeId) {
    const cls = await queryOne<{ college_id: string }>(
      'SELECT college_id FROM classes WHERE id = $1 LIMIT 1',
      [input.classId]
    );
    if (cls && cls.college_id !== input.collegeId) {
      throw new AppError('CLASS_COLLEGE_MISMATCH', '班级不属于所选学院', 400);
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name || null);
  }
  if (input.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(input.role);
  }
  if (input.collegeId !== undefined) {
    updates.push(`college_id = $${paramIndex++}`);
    values.push(input.collegeId);
  }
  if (input.classId !== undefined) {
    updates.push(`class_id = $${paramIndex++}`);
    values.push(input.classId);
    // 当 classId 变更时，自动同步 college_id 为班级所属学院
    if (input.classId) {
      updates.push(`college_id = (SELECT college_id FROM classes WHERE id = $${paramIndex++})`);
      values.push(input.classId);
    }
  }
  if (input.isEnabled !== undefined) {
    updates.push(`is_enabled = $${paramIndex++}`);
    values.push(input.isEnabled);
  }

  if (updates.length === 0) {
    return existing;
  }

  values.push(id);
  await query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
    values
  );

  // 同步辅导员班级关联
  if (input.role !== undefined || input.classId !== undefined) {
    const newRole = input.role ?? existing.role;
    const newClassId = input.classId ?? existing.classId;

    await query('DELETE FROM counselor_classes WHERE counselor_id = $1', [id]);

    if (newRole === 'counselor' && newClassId) {
      await query(
        'INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, newClassId]
      );
    }
  }

  // 辅导员切换学院：清空旧的所带班级（所带班级必须同属其学院）
  if (
    (newRole === 'counselor' || existing.role === 'counselor') &&
    input.collegeId !== undefined &&
    input.collegeId !== existing.collegeId
  ) {
    await query('DELETE FROM counselor_classes WHERE counselor_id = $1', [id]);
  }

  return getUserById(id);
}

export async function batchImportUsers(input: BatchImportUserInput): Promise<BatchImportResult> {
  const result: BatchImportResult = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < input.users.length; i++) {
    const row = input.users[i];
    try {
      await createUser(row);
      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : '创建失败',
      });
    }
  }

  return result;
}

/**
 * 批量导入组织（学院 + 班级）。幂等：
 * - 学院重名 -> 跳过（ON CONFLICT DO NOTHING）
 * - 同学院下班级重名 -> 跳过
 * 逐行执行，单行失败不影响后续行，最终返回每行结果明细。
 */
export async function batchImportOrganizations(rows: BatchImportOrgRow[]): Promise<BatchImportOrgResult> {
  const result: BatchImportOrgResult = { created: 0, skipped: 0, failed: 0, items: [] };
  // 学院名称 -> id 缓存，避免同一学院反复查询
  const collegeCache = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const { collegeName, className } = rows[i];
    const rowNo = i + 2; // 表头占第 1 行
    const item: BatchImportOrgResultItem = {
      row: rowNo,
      collegeName,
      className,
      status: 'failed',
    };

    try {
      // 1. 幂等 upsert 学院
      let collegeId = collegeCache.get(collegeName);
      if (!collegeId) {
        const college = await queryOne<{ id: string }>(
          `INSERT INTO colleges (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [collegeName]
        );
        collegeId = college!.id;
        collegeCache.set(collegeName, collegeId);
      }

      // 2. 无班级名 -> 仅建学院，视为 created
      if (!className || !className.trim()) {
        item.status = 'created';
        result.created++;
        result.items.push(item);
        continue;
      }

      // 3. 幂等 upsert 班级（同学院下重名跳过）
      const before = await queryOne<{ id: string }>(
        'SELECT id FROM classes WHERE college_id = $1 AND name = $2 LIMIT 1',
        [collegeId, className]
      );

      await queryOne<{ id: string }>(
        `INSERT INTO classes (college_id, name) VALUES ($1, $2)
         ON CONFLICT (college_id, name) DO NOTHING
         RETURNING id`,
        [collegeId, className]
      );

      if (before) {
        item.status = 'skipped';
        item.message = `${collegeName}/${className} 已存在，跳过`;
        result.skipped++;
      } else {
        item.status = 'created';
        result.created++;
      }
      result.items.push(item);
    } catch (err) {
      item.status = 'failed';
      item.message = err instanceof Error ? err.message : '创建失败';
      result.failed++;
      result.items.push(item);
    }
  }

  return result;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [id]
  );
  return !!result;
}

// ===== Counselor Class Assignments =====

export async function listCounselors(): Promise<Counselor[]> {
  const rows = await query<Counselor>(
    `SELECT u.id, u.school_id AS "schoolId", u.name,
            u.college_id AS "collegeId", co.name AS "collegeName"
     FROM users u
     LEFT JOIN colleges co ON u.college_id = co.id
     WHERE u.role = 'counselor' AND u.is_enabled = true
     ORDER BY u.name, u.school_id`
  );
  return rows;
}

export async function getManagedClasses(counselorId: string): Promise<ManagedClass[]> {
  const rows = await query<ManagedClass>(
    `SELECT c.id,
            c.name,
            c.college_id AS "collegeId",
            co.name AS "collegeName"
     FROM counselor_classes cc
     JOIN classes c ON cc.class_id = c.id
     JOIN colleges co ON c.college_id = co.id
     WHERE cc.counselor_id = $1
     ORDER BY co.name, c.name`,
    [counselorId]
  );
  return rows;
}

export async function setManagedClasses(
  counselorId: string,
  input: SetManagedClassesInput
): Promise<ManagedClass[]> {
  const user = await queryOne<{ id: string; role: UserRole; college_id: string | null }>(
    'SELECT id, role, college_id FROM users WHERE id = $1 LIMIT 1',
    [counselorId]
  );
  if (!user) {
    throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
  }
  if (user.role !== 'counselor') {
    throw new AppError('VALIDATION_ERROR', '只能为辅导员分配班级', 400);
  }

  const validClassIds: string[] = [];
  if (input.classIds.length > 0) {
    // 校验班级存在，且必须属于该辅导员所在学院（一所一属）
    const placeholders = input.classIds.map((_, i) => `$${i + 2}`).join(', ');
    const classes = await query<{ id: string; college_id: string }>(
      `SELECT id, college_id FROM classes WHERE id IN (${placeholders})`,
      input.classIds
    );
    for (const cls of classes) {
      if (user.college_id && cls.college_id !== user.college_id) {
        throw new AppError(
          'CLASS_COLLEGE_MISMATCH',
          '辅导员只能管理所属学院的班级',
          400
        );
      }
    }
    const existingSet = new Set(classes.map((r) => r.id));
    for (const classId of input.classIds) {
      if (existingSet.has(classId)) {
        validClassIds.push(classId);
      }
    }
  }

  await query('BEGIN', []);
  try {
    await query('DELETE FROM counselor_classes WHERE counselor_id = $1', [counselorId]);
    for (const classId of validClassIds) {
      await query(
        'INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [counselorId, classId]
      );
    }
    await query('COMMIT', []);
  } catch (err) {
    await query('ROLLBACK', []);
    throw err;
  }

  return getManagedClasses(counselorId);
}

// ===== Face =====

/** 查询某用户的注册照信息。无注册照返回 null。 */
export async function getUserFace(userId: string): Promise<UserFace | null> {
  if (!UUID_RE.test(userId)) {
    throw new AppError('VALIDATION_ERROR', '用户 ID 无效', 400);
  }
  return queryOne<UserFace>(
    `SELECT id, user_id AS "userId", photo_path AS "photoPath",
            (embedding IS NOT NULL) AS "hasEmbedding",
            created_at AS "createdAt"
     FROM user_faces WHERE user_id = $1`,
    [userId]
  );
}

/** 单张补录注册照：存原图 + 提特征向量。 */
export async function uploadUserFace(
  userId: string,
  imageBuffer: Buffer,
  ext: string
): Promise<UserFace> {
  if (!UUID_RE.test(userId)) {
    throw new AppError('VALIDATION_ERROR', '用户 ID 无效', 400);
  }

  // 确认用户存在
  const user = await queryOne<{ id: string; role: UserRole }>(
    'SELECT id, role FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  if (!user) {
    throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
  }

  // 提取向量（face 服务不可用时仍保存原图，但标记无 embedding）
  let embedding: number[] | null = null;
  if (isFaceServiceConfigured()) {
    try {
      const result = await extractEmbedding(imageBuffer, `upload.${ext}`);
      embedding = result.detected ? result.embedding : null;
      if (!result.detected) {
        throw new AppError('FACE_NOT_DETECTED', '未在照片中检测到人脸，请更换照片', 400);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // FaceServiceError：原图仍存，降级标记无 embedding，管理员后续可重新提取
      if (err instanceof FaceServiceError) {
        logger.warn({ userId, code: err.code }, '人脸服务不可用，仅保存原图');
      } else {
        throw err;
      }
    }
  }

  // 存原图
  const photoPath = await saveRegisteredPhoto(userId, imageBuffer, ext);

  // upsert user_faces
  const row = await queryOne<UserFace>(
    `INSERT INTO user_faces (user_id, photo_path, embedding)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       photo_path = EXCLUDED.photo_path,
       embedding = EXCLUDED.embedding,
       created_at = NOW()
     RETURNING id, user_id AS "userId", photo_path AS "photoPath",
              (embedding IS NOT NULL) AS "hasEmbedding",
              created_at AS "createdAt"`,
    [userId, photoPath, embedding]
  );

  return row!;
}

/** 删除注册照（数据库记录 + 原图文件）。 */
export async function deleteUserFace(userId: string): Promise<boolean> {
  if (!UUID_RE.test(userId)) {
    throw new AppError('VALIDATION_ERROR', '用户 ID 无效', 400);
  }
  const row = await queryOne<{ id: string; photo_path: string }>(
    'DELETE FROM user_faces WHERE user_id = $1 RETURNING id, photo_path',
    [userId]
  );
  if (!row) return false;
  await deleteRegisteredPhoto(row.photo_path);
  return true;
}

/**
 * 处理单条注册照导入（按学号匹配用户，提向量并存库）。
 * 供同步导入与异步 job runner 复用：job runner 跑并发池时每路调这个。
 */
export async function processFaceImportEntry(
  entry: { schoolId: string; buffer: Buffer; ext: string }
): Promise<BatchFaceImportItem> {
  const item: BatchFaceImportItem = {
    row: entry.schoolId,
    schoolId: entry.schoolId,
    status: 'failed',
  };

  // 找用户
  const user = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE school_id = $1 LIMIT 1',
    [entry.schoolId]
  );
  if (!user) {
    item.status = 'skipped';
    item.message = '学号不存在，跳过';
    return item;
  }

  try {
    await uploadUserFace(user.id, entry.buffer, entry.ext);
    item.status = 'success';
  } catch (err) {
    item.message = err instanceof Error ? err.message : '导入失败';
  }
  return item;
}

/** 同步批量导入（小批量/兼容旧调用方）。大批量请走异步 job。 */
export async function batchImportFaces(
  entries: Array<{ schoolId: string; buffer: Buffer; ext: string }>
): Promise<BatchFaceImportResult> {
  const items = await runPool(entries, 4, (entry) => processFaceImportEntry(entry));
  return {
    success: items.filter((i) => i.status === 'success').length,
    skipped: items.filter((i) => i.status === 'skipped').length,
    failed: items.filter((i) => i.status === 'failed').length,
    items,
  };
}

/** 读取某用户注册照字节，供预览接口流式返回。无注册照返回 null。 */
export async function getUserFacePhoto(
  userId: string
): Promise<{ buffer: Buffer; photoPath: string } | null> {
  if (!UUID_RE.test(userId)) {
    throw new AppError('VALIDATION_ERROR', '用户 ID 无效', 400);
  }
  const face = await getUserFace(userId);
  if (!face) return null;
  return {
    buffer: await readRegisteredPhoto(face.photoPath),
    photoPath: face.photoPath,
  };
}
