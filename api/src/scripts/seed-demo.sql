-- IdeoTrack 演示数据 SQL
-- 运行方式：docker compose exec -T postgres psql -U postgres -d ideo_track < api/src/scripts/seed-demo.sql

-- 先清空可能已存在的旧 demo 数据（注意顺序避免外键冲突）
DELETE FROM check_ins WHERE user_id IN (SELECT id FROM users WHERE school_id LIKE 'DEMO-%');
DELETE FROM tasks WHERE created_by IN (SELECT id FROM users WHERE school_id LIKE 'DEMO-%');
DELETE FROM counselor_classes WHERE counselor_id IN (SELECT id FROM users WHERE school_id LIKE 'DEMO-%');
DELETE FROM users WHERE school_id LIKE 'DEMO-%';
DELETE FROM classes WHERE name LIKE 'Demo-%';
DELETE FROM colleges WHERE name LIKE 'Demo-%学院';
DELETE FROM daily_quotes WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- 创建学院
INSERT INTO colleges (name) VALUES
  ('Demo-马克思主义学院'),
  ('Demo-计算机学院'),
  ('Demo-经济管理学院'),
  ('Demo-外国语学院');

-- 创建班级（每学院 2 个）
INSERT INTO classes (college_id, name)
SELECT c.id, 'Demo-' || c.name || '-' || g || '班'
FROM colleges c
CROSS JOIN generate_series(1, 2) AS g
WHERE c.name LIKE 'Demo-%学院';

-- 创建辅导员（每学院 1 名，带该学院所有班级）
WITH ranked_colleges AS (
  SELECT id, name AS college_name, row_number() OVER (ORDER BY id) AS rn
  FROM colleges
  WHERE name LIKE 'Demo-%学院'
),
inserted_counselors AS (
  INSERT INTO users (school_id, password_hash, name, role, is_initial_password, is_enabled)
  SELECT 'DEMO-C' || rc.rn,
         crypt('DEMO-C' || rc.rn, gen_salt('bf')),
         'Demo辅导员' || rc.rn,
         'counselor',
         true,
         true
  FROM ranked_colleges rc
  RETURNING id, school_id
)
INSERT INTO counselor_classes (counselor_id, class_id)
SELECT ic.id, cl.id
FROM inserted_counselors ic
JOIN ranked_colleges rc ON rc.rn = CAST(substring(ic.school_id from 'DEMO-C([0-9]+)') AS INT)
JOIN classes cl ON cl.college_id = rc.id;

-- 创建学生（每班 25 人）
DO $$
DECLARE
  cls RECORD;
  i INT;
  counter INT := 1;
BEGIN
  FOR cls IN (
    SELECT cl.id
    FROM classes cl
    JOIN colleges co ON cl.college_id = co.id
    WHERE co.name LIKE 'Demo-%学院'
    ORDER BY cl.id
  ) LOOP
    FOR i IN 1..25 LOOP
      INSERT INTO users (school_id, password_hash, name, role, class_id, is_initial_password, is_enabled)
      VALUES (
        'DEMO-S' || LPAD(counter::TEXT, 6, '0'),
        crypt('DEMO-S' || LPAD(counter::TEXT, 6, '0'), gen_salt('bf')),
        'Demo学生' || counter,
        'student',
        cls.id,
        true,
        true
      );
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- 创建任务
DO $$
DECLARE
  admin_id UUID;
  pool_task_id UUID;
BEGIN
  SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION '请先创建管理员账号（运行 npm run db:seed）';
  END IF;

  -- 全校任务
  INSERT INTO tasks (title, content, scope_type, created_by, published_at, deadline_at)
  VALUES ('Demo-全校思政学习任务', '请阅读指定材料并撰写心得。', 'school', admin_id, NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days');

  -- 任务池任务
  INSERT INTO tasks (title, content, scope_type, created_by, published_at, deadline_at)
  VALUES ('Demo-任务池：经典文献研读', '阅读经典文献，结合专业谈体会。', 'pool', admin_id, NOW() - INTERVAL '7 days', NOW() + INTERVAL '14 days')
  RETURNING id INTO pool_task_id;

  -- 学院任务
  INSERT INTO tasks (title, content, scope_type, scope_id, target_college_id, created_by, published_at, deadline_at)
  SELECT 'Demo-' || co.name || '专题学习', '结合学院专业特点开展思政学习。', 'college', co.id, co.id, admin_id, NOW() - INTERVAL '6 days', NOW() + INTERVAL '6 days'
  FROM colleges co
  WHERE co.name LIKE 'Demo-%学院';

  -- 班级任务
  INSERT INTO tasks (title, content, scope_type, scope_id, target_class_id, created_by, published_at, deadline_at)
  SELECT 'Demo-' || cl.name || '任务', '请结合班级实际完成学习打卡。', 'class', cl.id, cl.id, admin_id, NOW() - INTERVAL '5 days', NOW() + INTERVAL '5 days'
  FROM classes cl
  JOIN colleges co ON cl.college_id = co.id
  WHERE co.name LIKE 'Demo-%学院';

  -- 辅导员从任务池派发一个班级任务
  INSERT INTO tasks (title, content, scope_type, scope_id, target_class_id, source_task_id, created_by, published_at, deadline_at)
  SELECT t.title, t.content, 'class', cl.id, cl.id, pool_task_id, admin_id, NOW(), t.deadline_at
  FROM tasks t
  CROSS JOIN (
    SELECT cl.id
    FROM classes cl
    JOIN colleges co ON cl.college_id = co.id
    WHERE co.name LIKE 'Demo-%学院'
    ORDER BY cl.id
    LIMIT 1
  ) cl
  WHERE t.id = pool_task_id;
END $$;

-- 生成打卡记录（一个学生一个任务只打一次）
INSERT INTO check_ins (user_id, task_id, status, reflection_content, ai_review_reason, checked_in_at)
SELECT DISTINCT ON (s.id, t.id)
       s.id,
       t.id,
       CASE WHEN random() < 0.05 THEN 'rejected'
            WHEN random() < 0.15 THEN 'requires_modification'
            WHEN random() < 0.30 THEN 'pending_manual_review'
            WHEN random() < 0.60 THEN 'ai_approved'
            ELSE 'approved'
       END,
       CASE WHEN random() > 0.25 THEN '通过学习，我更加深刻地理解了青年一代肩负的历史使命。' END,
       CASE WHEN random() < 0.10 THEN '内容与主题关联度不足' END,
       NOW() - (random() * INTERVAL '14 days')
FROM users s
JOIN tasks t ON (
  t.scope_type = 'school'
  OR (t.scope_type = 'college' AND t.target_college_id = (SELECT c2.college_id FROM classes c2 WHERE c2.id = s.class_id))
  OR (t.scope_type = 'class' AND t.target_class_id = s.class_id)
)
WHERE s.role = 'student'
  AND s.school_id LIKE 'DEMO-%'
  AND random() < 0.65;

-- 生成每日名言
WITH dates AS (
  SELECT CURRENT_DATE - generate_series AS d
  FROM generate_series(0, 13)
),
enabled_quotes AS (
  SELECT id, row_number() OVER () AS rn
  FROM quotes
  WHERE is_enabled = true
),
quote_count AS (
  SELECT COUNT(*) AS cnt FROM enabled_quotes
)
INSERT INTO daily_quotes (quote_id, date)
SELECT eq.id, dates.d
FROM dates
CROSS JOIN quote_count
JOIN enabled_quotes eq ON eq.rn = ((dates.d - CURRENT_DATE) % quote_count.cnt + quote_count.cnt) % quote_count.cnt + 1
ON CONFLICT (date) DO UPDATE SET quote_id = EXCLUDED.quote_id;
