import bcrypt from 'bcryptjs';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

const COLLEGES = ['马克思主义学院', '计算机学院', '经济管理学院', '外国语学院'];
const CLASSES_PER_COLLEGE = [2, 3, 2, 2];
const STUDENTS_PER_CLASS = 25;
const CHECKIN_DAYS = 14;

const REFLECTIONS = [
  '通过学习，我更加深刻地理解了青年一代肩负的历史使命。',
  '这次学习让我认识到理论与实践相结合的重要性。',
  '作为新时代大学生，我们要坚定理想信念，练就过硬本领。',
  '思政学习不仅是知识的积累，更是价值观的塑造。',
  '我将以更加积极的态度投入到学习和实践中去。',
  '此次内容引发了我对社会责任和个人成长的深入思考。',
  '通过案例学习，我更加体会到制度优势转化为治理效能的力量。',
];

function hashPassword(schoolId: string): Promise<string> {
  return bcrypt.hash(schoolId.slice(-6).padStart(6, '0'), 10);
}

function randomDate(daysAgo: number): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
  d.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
  return d;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedDemo() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    // 清空旧 demo 数据（保留基础 seed 的测试账号和名言）
    await client.query("DELETE FROM check_ins WHERE user_id IN (SELECT id FROM users WHERE school_id LIKE 'D%')");
    await client.query("DELETE FROM tasks WHERE created_by IN (SELECT id FROM users WHERE school_id LIKE 'D%')");
    await client.query("DELETE FROM counselor_classes WHERE counselor_id IN (SELECT id FROM users WHERE school_id LIKE 'D%')");
    await client.query("DELETE FROM users WHERE school_id LIKE 'D%'");
    await client.query("DELETE FROM classes WHERE name LIKE 'Demo-%'");
    await client.query("DELETE FROM colleges WHERE name = ANY($1)", [COLLEGES]);

    // 创建学院
    const collegeIds: string[] = [];
    for (const name of COLLEGES) {
      const result = await client.query(
        'INSERT INTO colleges (name) VALUES ($1) RETURNING id',
        [name]
      );
      collegeIds.push(result.rows[0].id);
      console.log(`Created college: ${name}`);
    }

    // 创建班级
    const classRecords: { id: string; collegeId: string; name: string }[] = [];
    for (let c = 0; c < collegeIds.length; c++) {
      const count = CLASSES_PER_COLLEGE[c] ?? 2;
      for (let i = 1; i <= count; i++) {
        const result = await client.query(
          'INSERT INTO classes (college_id, name) VALUES ($1, $2) RETURNING id',
          [collegeIds[c], `Demo-班级${c + 1}-${i}`]
        );
        classRecords.push({
          id: result.rows[0].id,
          collegeId: collegeIds[c],
          name: `Demo-班级${c + 1}-${i}`,
        });
      }
    }
    console.log(`Created ${classRecords.length} classes`);

    // 创建辅导员（每个学院 1 名，带该学院多个班）
    const counselorIds: string[] = [];
    for (let c = 0; c < collegeIds.length; c++) {
      const schoolId = `D100${c + 1}`;
      const result = await client.query(
        `INSERT INTO users (school_id, password_hash, name, role, college_id, is_initial_password, is_enabled)
         VALUES ($1, $2, $3, 'counselor', $4, true, true) RETURNING id`,
        [schoolId, await hashPassword(schoolId), `辅导员${c + 1}`, collegeIds[c]]
      );
      counselorIds.push(result.rows[0].id);

      const collegeClasses = classRecords.filter((cls) => cls.collegeId === collegeIds[c]);
      for (const cls of collegeClasses) {
        await client.query(
          'INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [result.rows[0].id, cls.id]
        );
      }
      console.log(`Created counselor ${schoolId} with ${collegeClasses.length} classes`);
    }

    // 创建学生
    const studentIds: string[] = [];
    let studentIndex = 1;
    for (const cls of classRecords) {
      for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
        const schoolId = `D${String(studentIndex).padStart(5, '0')}`;
        const result = await client.query(
          `INSERT INTO users (school_id, password_hash, name, role, class_id, is_initial_password, is_enabled)
           VALUES ($1, $2, $3, 'student', $4, true, true) RETURNING id`,
          [schoolId, await hashPassword(schoolId), `学生${studentIndex}`, cls.id]
        );
        studentIds.push(result.rows[0].id);
        studentIndex++;
      }
    }
    console.log(`Created ${studentIds.length} students`);

    // 创建任务：1 个全校任务、1 个任务池、各学院任务、各班级任务
    const admin = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const adminId = admin.rows[0]?.id;
    if (!adminId) {
      throw new Error('管理员账号不存在，请先运行 npm run db:seed');
    }

    const now = new Date();
    const taskIds: string[] = [];

    // 全校任务
    const schoolTask = await client.query(
      `INSERT INTO tasks (title, content, scope_type, created_by, published_at, deadline_at)
       VALUES ($1, $2, 'school', $3, $4, $5) RETURNING id`,
      [
        'Demo-全校思政学习任务',
        '请阅读指定材料并撰写心得。',
        adminId,
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ]
    );
    taskIds.push(schoolTask.rows[0].id);

    // 任务模板库
    const templateTask = await client.query(
      `INSERT INTO task_templates (title, content, created_by, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        'Demo-模板：经典文献研读',
        '阅读经典文献，结合专业谈体会。',
        adminId,
        'published',
      ]
    );

    // 学院任务
    for (const collegeId of collegeIds) {
      const result = await client.query(
        `INSERT INTO tasks (title, content, scope_type, scope_id, target_college_id, created_by, published_at, deadline_at)
         VALUES ($1, $2, 'college', $3, $3, $4, $5, $6) RETURNING id`,
        [
          'Demo-学院专题学习',
          '结合学院专业特点开展思政学习。',
          collegeId,
          adminId,
          new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        ]
      );
      taskIds.push(result.rows[0].id);
    }

    // 班级任务
    for (const cls of classRecords) {
      const result = await client.query(
        `INSERT INTO tasks (title, content, scope_type, scope_id, target_class_id, created_by, published_at, deadline_at)
         VALUES ($1, $2, 'class', $3, $3, $4, $5, $6) RETURNING id`,
        [
          `Demo-${cls.name} 班级任务`,
          '请结合班级实际完成学习打卡。',
          cls.id,
          adminId,
          new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        ]
      );
      taskIds.push(result.rows[0].id);
    }

    // 辅导员从模板库发布一个班级任务
    const dispatchTarget = classRecords[0];
    const dispatched = await client.query(
      `INSERT INTO tasks (title, content, scope_type, scope_id, target_class_id, template_id, created_by, published_at, deadline_at)
       SELECT title, content, 'class', $1, $1, $2, $3, NOW(), $4
       FROM task_templates WHERE id = $2 RETURNING id`,
      [dispatchTarget.id, templateTask.rows[0].id, counselorIds[0], new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()]
    );
    taskIds.push(dispatched.rows[0].id);
    console.log(`Created ${taskIds.length} tasks`);

    // 生成打卡记录
    let checkInCount = 0;
    const statuses = ['approved', 'approved', 'approved', 'approved', 'ai_approved', 'pending_manual_review', 'rejected'];

    for (const studentId of studentIds) {
      // 随机选择 2-4 个任务打卡
      const tasksToCheckIn = taskIds.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));

      for (const taskId of tasksToCheckIn) {
        const status = randomItem(statuses);
        const checkedInAt = randomDate(Math.floor(Math.random() * CHECKIN_DAYS));
        const reflection = status !== 'rejected' && Math.random() > 0.3 ? randomItem(REFLECTIONS) : null;
        const aiReviewReason = status === 'rejected' ? '内容与主题关联度不足' : null;

        await client.query(
          `INSERT INTO check_ins (user_id, task_id, status, reflection_content, ai_review_reason, checked_in_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [studentId, taskId, status, reflection, aiReviewReason, checkedInAt.toISOString()]
        );
        checkInCount++;
      }
    }
    console.log(`Created ${checkInCount} check-ins`);

    // 生成每日名言
    const quotes = await client.query('SELECT id FROM quotes WHERE is_enabled = true LIMIT 7');
    if (quotes.rows.length > 0) {
      for (let i = 0; i < CHECKIN_DAYS; i++) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        await client.query(
          `INSERT INTO daily_quotes (quote_id, date) VALUES ($1, $2)
           ON CONFLICT (date) DO NOTHING`,
          [quotes.rows[i % quotes.rows.length].id, date]
        );
      }
      console.log(`Created daily quotes`);
    }

    await client.query('COMMIT');
    console.log('\nDemo seed completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Demo seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDemo();
