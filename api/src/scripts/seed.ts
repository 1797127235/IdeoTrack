import bcrypt from 'bcryptjs';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();

    // 创建测试学院
    const existingCollege = await client.query(
      'SELECT id FROM colleges WHERE name = $1 LIMIT 1',
      ['马克思主义学院']
    );

    let collegeId = existingCollege.rows[0]?.id;
    if (!collegeId) {
      const college = await client.query(
        'INSERT INTO colleges (name) VALUES ($1) RETURNING id',
        ['马克思主义学院']
      );
      collegeId = college.rows[0].id;
    }

    // 创建测试班级
    const existingClass = await client.query(
      'SELECT id FROM classes WHERE college_id = $1 AND name = $2 LIMIT 1',
      [collegeId, '思政一班']
    );

    let classId = existingClass.rows[0]?.id;
    if (!classId) {
      const cls = await client.query(
        'INSERT INTO classes (college_id, name) VALUES ($1, $2) RETURNING id',
        [collegeId, '思政一班']
      );
      classId = cls.rows[0].id;
    }

    // 创建测试账号，初始密码为学号/工号后 6 位
    const testUsers = [
      { schoolId: '2024001', role: 'student', classId, name: '学生2024001' },
      { schoolId: 'T001', role: 'counselor', classId: null, name: '辅导员T001' },
      { schoolId: 'A001', role: 'admin', classId: null, name: '管理员A001' },
    ];

    for (const user of testUsers) {
      const password = user.schoolId.slice(-6);
      const passwordHash = await bcrypt.hash(password, 10);

      const existingUser = await client.query(
        'SELECT id FROM users WHERE school_id = $1 LIMIT 1',
        [user.schoolId]
      );

      if (existingUser.rows[0]) {
        await client.query(
          `UPDATE users
           SET password_hash = $1,
               role = $2,
               is_initial_password = true,
               class_id = $3,
               college_id = $4,
               name = $5,
               failed_login_attempts = 0,
               locked_until = NULL
           WHERE id = $6`,
          [
            passwordHash,
            user.role,
            user.classId,
            user.role === 'admin' ? null : collegeId,
            user.name,
            existingUser.rows[0].id,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO users (school_id, password_hash, role, is_initial_password, class_id, college_id, name)
           VALUES ($1, $2, $3, true, $4, $5, $6)`,
          [user.schoolId, passwordHash, user.role, user.classId, user.role === 'admin' ? null : collegeId, user.name]
        );
      }

      console.log(`Seeded user: ${user.schoolId} / ${user.role}`);
    }

    // 关联辅导员和班级
    const counselor = await client.query(
      'SELECT id FROM users WHERE school_id = $1 LIMIT 1',
      ['T001']
    );

    if (counselor.rows[0] && classId) {
      const existingRelation = await client.query(
        `SELECT id FROM counselor_classes
         WHERE counselor_id = $1 AND class_id = $2
         LIMIT 1`,
        [counselor.rows[0].id, classId]
      );

      if (!existingRelation.rows[0]) {
        await client.query(
          'INSERT INTO counselor_classes (counselor_id, class_id) VALUES ($1, $2)',
          [counselor.rows[0].id, classId]
        );
      }
    }

    // 创建名言库
    const quotes = [
      { content: '路虽远，行则将至；事虽难，做则必成。', author: '荀子', source: '《荀子·修身》' },
      { content: '不积跬步，无以至千里；不积小流，无以成江海。', author: '荀子', source: '《荀子·劝学》' },
      { content: '业精于勤，荒于嬉；行成于思，毁于随。', author: '韩愈', source: '《进学解》' },
      { content: '博学之，审问之，慎思之，明辨之，笃行之。', author: '子思', source: '《中庸》' },
      { content: '天行健，君子以自强不息。', author: '周公', source: '《周易》' },
      { content: '士不可以不弘毅，任重而道远。', author: '孔子弟子', source: '《论语·泰伯》' },
      { content: '知之者不如好之者，好之者不如乐之者。', author: '孔子', source: '《论语·雍也》' },
    ];

    for (let i = 0; i < quotes.length; i++) {
      const existingQuote = await client.query(
        'SELECT id FROM quotes WHERE content = $1 LIMIT 1',
        [quotes[i].content]
      );

      if (existingQuote.rows[0]) continue;

      await client.query(
        `INSERT INTO quotes (content, author, source, is_enabled, display_order)
         VALUES ($1, $2, $3, true, $4)`,
        [quotes[i].content, quotes[i].author, quotes[i].source, i]
      );
    }

    // 创建示例任务
    const adminUser = await client.query(
      'SELECT id FROM users WHERE school_id = $1 LIMIT 1',
      ['A001']
    );

    if (adminUser.rows[0] && classId) {
      const existingTask = await client.query(
        'SELECT id FROM tasks WHERE title = $1 LIMIT 1',
        ['示例：每日思政学习任务']
      );

      if (!existingTask.rows[0]) {
        await client.query(
          `INSERT INTO tasks (
            title, content, scope_type, target_class_id, created_by,
            published_at, deadline_at
          ) VALUES ($1, $2, 'class', $3, $4, $5, $6)`,
          [
            '示例：每日思政学习任务',
            '请认真阅读今日思政学习材料，结合自己的学习与生活实际，撰写不少于 50 字的学习心得。',
            classId,
            adminUser.rows[0].id,
            new Date().toISOString(),
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ]
        );
      }
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
