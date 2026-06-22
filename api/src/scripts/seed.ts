import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seed() {
  try {
    // 创建测试学院
    const { data: existingCollege } = await supabase
      .from('colleges')
      .select('id')
      .eq('name', '马克思主义学院')
      .single();

    let collegeId = existingCollege?.id;
    if (!collegeId) {
      const { data: college, error: collegeError } = await supabase
        .from('colleges')
        .insert({ name: '马克思主义学院' })
        .select('id')
        .single();

      if (collegeError || !college) {
        throw new Error(`Failed to create college: ${collegeError?.message}`);
      }
      collegeId = college.id;
    }

    // 创建测试班级
    const { data: existingClass } = await supabase
      .from('classes')
      .select('id')
      .eq('college_id', collegeId)
      .eq('name', '思政一班')
      .single();

    let classId = existingClass?.id;
    if (!classId) {
      const { data: cls, error: classError } = await supabase
        .from('classes')
        .insert({ college_id: collegeId, name: '思政一班' })
        .select('id')
        .single();

      if (classError || !cls) {
        throw new Error(`Failed to create class: ${classError?.message}`);
      }
      classId = cls.id;
    }

    // 创建测试账号，初始密码为学号/工号后 6 位
    const testUsers = [
      { schoolId: '2024001', role: 'student', classId },
      { schoolId: 'T001', role: 'counselor', classId: null },
      { schoolId: 'A001', role: 'admin', classId: null },
    ];

    for (const user of testUsers) {
      const password = user.schoolId.slice(-6);
      const passwordHash = await bcrypt.hash(password, 10);

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', user.schoolId)
        .single();

      if (existingUser) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            password_hash: passwordHash,
            role: user.role,
            is_initial_password: true,
            class_id: user.classId,
            failed_login_attempts: 0,
            locked_until: null,
          })
          .eq('id', existingUser.id);

        if (updateError) {
          throw new Error(`Failed to update user ${user.schoolId}: ${updateError.message}`);
        }
      } else {
        const { error: insertError } = await supabase.from('users').insert({
          school_id: user.schoolId,
          password_hash: passwordHash,
          role: user.role,
          is_initial_password: true,
          class_id: user.classId,
        });

        if (insertError) {
          throw new Error(`Failed to insert user ${user.schoolId}: ${insertError.message}`);
        }
      }

      console.log(`Seeded user: ${user.schoolId} / ${user.role}`);
    }

    // 关联辅导员和班级
    const { data: counselor } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', 'T001')
      .single();

    if (counselor && classId) {
      const { data: existingRelation } = await supabase
        .from('counselor_classes')
        .select('id')
        .eq('counselor_id', counselor.id)
        .eq('class_id', classId)
        .single();

      if (!existingRelation) {
        const { error: relationError } = await supabase.from('counselor_classes').insert({
          counselor_id: counselor.id,
          class_id: classId,
        });

        if (relationError) {
          throw new Error(`Failed to create counselor relation: ${relationError.message}`);
        }
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
      const { data: existingQuote } = await supabase
        .from('quotes')
        .select('id')
        .eq('content', quotes[i].content)
        .single();

      if (existingQuote) continue;

      const { error: quoteError } = await supabase.from('quotes').insert({
        content: quotes[i].content,
        author: quotes[i].author,
        source: quotes[i].source,
        is_enabled: true,
        display_order: i,
      });

      if (quoteError) {
        throw new Error(`Failed to seed quote ${i}: ${quoteError.message}`);
      }
    }

    // 创建示例任务
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', 'A001')
      .single();

    if (adminUser && classId) {
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('title', '示例：每日思政学习任务')
        .single();

      if (!existingTask) {
        const { error: taskError } = await supabase.from('tasks').insert({
          title: '示例：每日思政学习任务',
          content:
            '请认真阅读今日思政学习材料，结合自己的学习与生活实际，撰写不少于 50 字的学习心得。',
          scope_type: 'class',
          target_class_id: classId,
          created_by: adminUser.id,
          published_at: new Date().toISOString(),
          deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        if (taskError) {
          throw new Error(`Failed to seed task: ${taskError.message}`);
        }
      }
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
