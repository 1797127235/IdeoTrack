import bcrypt from 'bcryptjs';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    // 创建测试学院和班级
    const collegeResult = await client.query(
      `INSERT INTO colleges (name) VALUES ('马克思主义学院') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    const collegeId = collegeResult.rows[0].id;

    const classResult = await client.query(
      `INSERT INTO classes (college_id, name) VALUES ($1, '思政一班') ON CONFLICT (college_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [collegeId]
    );
    const classId = classResult.rows[0].id;

    // 创建测试账号，初始密码为学号/工号后 6 位
    const testUsers = [
      { schoolId: '2024001', role: 'student', classId },
      { schoolId: 'T001', role: 'counselor', classId: null },
      { schoolId: 'A001', role: 'admin', classId: null },
    ];

    for (const user of testUsers) {
      const password = user.schoolId.slice(-6);
      const passwordHash = await bcrypt.hash(password, 10);

      await client.query(
        `INSERT INTO users (school_id, password_hash, role, is_initial_password, class_id)
         VALUES ($1, $2, $3, true, $4)
         ON CONFLICT (school_id) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_initial_password = EXCLUDED.is_initial_password,
           class_id = EXCLUDED.class_id`,
        [user.schoolId, passwordHash, user.role, user.classId]
      );

      console.log(`Seeded user: ${user.schoolId} / ${user.role}`);
    }

    // 关联辅导员和班级
    const counselorResult = await client.query(
      `SELECT id FROM users WHERE school_id = 'T001'`
    );
    if (counselorResult.rows.length > 0) {
      const counselorId = counselorResult.rows[0].id;
      await client.query(
        `INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2)
         ON CONFLICT (counselor_id, class_id) DO NOTHING`,
        [counselorId, classId]
      );
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
