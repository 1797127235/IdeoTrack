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

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
