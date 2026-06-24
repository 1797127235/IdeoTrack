import bcrypt from 'bcryptjs';
import { query, queryOne } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  College,
  Class,
  User,
  CreateCollegeInput,
  UpdateCollegeInput,
  CreateClassInput,
  UpdateClassInput,
  CreateUserInput,
  UpdateUserInput,
  BatchImportUserInput,
  BatchImportResult,
  UserRole,
} from './users.types.js';

const BCRYPT_SALT_ROUNDS = 10;

function generateDefaultPassword(schoolId: string): string {
  return schoolId.slice(-6).padStart(6, '0');
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
      c.college_id AS "collegeId",
      c.name AS "className",
      co.name AS "collegeName",
      u.created_at AS "createdAt",
      u.updated_at AS "updatedAt"
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN colleges co ON c.college_id = co.id
  `;
}

export async function listUsers(): Promise<User[]> {
  const rows = await query<User>(
    `${buildUserListQuery()}
     ORDER BY u.created_at DESC`
  );
  return rows;
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

  const passwordHash = await bcrypt.hash(generateDefaultPassword(input.schoolId), BCRYPT_SALT_ROUNDS);

  const user = await queryOne<User>(
    `INSERT INTO users (school_id, password_hash, name, role, class_id, is_enabled, is_initial_password)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id`,
    [
      input.schoolId,
      passwordHash,
      input.name || null,
      input.role,
      input.classId || null,
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
  if (input.classId !== undefined) {
    updates.push(`class_id = $${paramIndex++}`);
    values.push(input.classId);
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

export async function deleteUser(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [id]
  );
  return !!result;
}
