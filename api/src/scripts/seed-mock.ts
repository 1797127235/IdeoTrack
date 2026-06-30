/**
 * 大规模 mock 数据生成器。
 *
 * 默认规模：
 * - 10 个学院
 * - 200 个班级（每学院 20 个班）
 * - 10,000 名学生（每班 50 人）
 * - 30 名辅导员（每学院 3 人）
 * - 5 名管理员
 * - 20 个任务模板（含 draft/published/delisted 多种状态）
 * - 400 个班级任务（每班 2 个，约 30% 从模板派生）
 * - 约 12,000 条打卡记录
 *
 * 运行方式：
 *   npm --prefix api run db:seed:mock
 *
 * 注意：该脚本会先清空数据库（TRUNCATE CASCADE），再重新生成全部数据。
 */
import bcrypt from 'bcryptjs';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

// ===================== 可配置规模 =====================
const CONFIG = {
  colleges: 10,
  classesPerCollege: 20,
  studentsPerClass: 50,
  counselorsPerCollege: 3,
  admins: 5,
  tasksPerClass: 2,
  templatesCount: 20,
  templatesDispatchRate: 0.3,
  maxCheckInsPerStudent: 2,
  batchSize: 1000,
};

// ===================== 姓名库 =====================
const SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周',
  '徐', '孙', '马', '朱', '胡', '郭', '何', '林', '罗', '高',
  '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹',
];
const GIVEN_NAMES = [
  '伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋',
  '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '华', '鹏',
  '飞', '婷', '宇', '慧', '玲', '龙', '倩', '欣', '轩', '雨',
  '晨', '浩然', '梓涵', '一诺', '诗涵', '子轩', '子涵', '可馨',
  '宇轩', '欣怡', '博文', '梦瑶', '佳怡', '俊杰', '思涵', '语桐',
];

// ===================== 学院名 =====================
const COLLEGE_NAMES = [
  '马克思主义学院',
  '计算机科学与技术学院',
  '土木工程学院',
  '经济管理学院',
  '外国语学院',
  '法学院',
  '文学与新闻传播学院',
  '理学院',
  '机械工程学院',
  '电气工程学院',
];

// ===================== 任务文案 =====================
const TASK_TITLES = [
  '学习习近平新时代中国特色社会主义思想',
  '观看青年大学习网上主题团课',
  '阅读《求是》杂志重要文章',
  '参与党史学习教育心得征集',
  '撰写思政实践调研报告',
  '学习党的二十大精神',
  '参与志愿服务并提交心得',
  '观看红色经典影片并写观后感',
  '学习全国两会精神',
  '完成国家安全教育专题学习',
];
const TASK_CONTENT = `请认真阅读指定学习材料，结合个人学习与生活实际，撰写不少于 80 字的学习心得。要求观点正确、内容真实、条理清晰。`;

// ===================== 任务模板定义 =====================
interface TemplateDefinition {
  title: string;
  description: string;
  content: string;
  category: '学习' | '实践' | '活动' | '会议' | '阅读';
  tags: string[];
  guidingQuestions: string[];
  checkinType: 'text' | 'image' | 'video' | 'mixed';
  requireText: boolean;
  requireImage: boolean;
  requireVideo: boolean;
  minTextLength: number | null;
  maxImages: number | null;
  requireLocation: boolean;
  requireFace: boolean;
  status: 'draft' | 'published' | 'delisted';
}

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    title: '习近平新时代中国特色社会主义思想专题学习',
    description: '深入学习习近平新时代中国特色社会主义思想，撰写心得体会。',
    content:
      '请认真学习《习近平新时代中国特色社会主义思想学习纲要》，结合专业学习与个人成长，撰写不少于 150 字的学习心得，要求观点鲜明、联系实际。',
    category: '学习',
    tags: ['思政', '理论学习', '心得体会'],
    guidingQuestions: ['你最认同本章哪个观点？', '如何在学习生活中贯彻落实？'],
    checkinType: 'text',
    requireText: true,
    requireImage: false,
    requireVideo: false,
    minTextLength: 150,
    maxImages: null,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '党的二十大精神学习心得',
    description: '学习党的二十大报告，分享学习感悟。',
    content:
      '请观看党的二十大报告解读视频或阅读原文，围绕“中国式现代化”“青年使命”等关键词，提交不少于 120 字的心得体会。',
    category: '学习',
    tags: ['二十大', '青年使命', '心得'],
    guidingQuestions: ['中国式现代化对你意味着什么？', '新时代青年应如何担当作为？'],
    checkinType: 'text',
    requireText: true,
    requireImage: false,
    requireVideo: false,
    minTextLength: 120,
    maxImages: null,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '红色经典影片观影打卡',
    description: '观看一部红色经典影片并提交观后感截图。',
    content:
      '请从《觉醒年代》《长津湖》《建党伟业》等影片中任选一部观看，拍摄观影照片或平台观看记录截图，并撰写不少于 80 字的观后感。',
    category: '活动',
    tags: ['红色观影', '观后感', '爱国主义'],
    guidingQuestions: ['影片中最触动你的情节是什么？', '革命先辈的精神对你有何启发？'],
    checkinType: 'mixed',
    requireText: true,
    requireImage: true,
    requireVideo: false,
    minTextLength: 80,
    maxImages: 3,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '志愿服务活动记录',
    description: '参与志愿服务，记录服务瞬间与心得。',
    content:
      '请参加一次志愿服务活动（社区服务、环保公益、支教等），上传 1-3 张活动现场照片，并说明服务内容、时长及收获。',
    category: '实践',
    tags: ['志愿服务', '社会实践', '公益'],
    guidingQuestions: ['你参与了什么服务内容？', '这次经历带给你哪些成长？'],
    checkinType: 'image',
    requireText: false,
    requireImage: true,
    requireVideo: false,
    minTextLength: null,
    maxImages: 3,
    requireLocation: true,
    requireFace: false,
    status: 'published',
  },
  {
    title: '国家安全教育专题学习',
    description: '学习国家安全知识，增强安全意识。',
    content:
      '请学习总体国家安全观相关内容，从政治安全、网络安全、文化安全等角度，谈谈大学生如何维护国家安全。',
    category: '学习',
    tags: ['国家安全', '总体国家安全观', '教育'],
    guidingQuestions: ['你身边存在哪些安全风险？', '大学生应如何提升安全防范意识？'],
    checkinType: 'text',
    requireText: true,
    requireImage: false,
    requireVideo: false,
    minTextLength: 100,
    maxImages: null,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '经典文献研读报告',
    description: '阅读马克思主义经典文献，撰写研读报告。',
    content:
      '请阅读《共产党宣言》《习近平谈治国理政》等经典文献中的一篇，提炼核心观点，结合现实问题撰写不少于 200 字的研读报告。',
    category: '阅读',
    tags: ['经典阅读', '马克思主义', '研读报告'],
    guidingQuestions: ['本文的核心论点是什么？', '如何运用其中观点分析现实问题？'],
    checkinType: 'text',
    requireText: true,
    requireImage: false,
    requireVideo: false,
    minTextLength: 200,
    maxImages: null,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '主题班会视频分享',
    description: '录制主题班会学习分享短视频。',
    content:
      '请以班级为单位召开一次主题班会，围绕“诚信考试”“学风建设”等主题，录制 30-60 秒分享视频并上传。',
    category: '会议',
    tags: ['主题班会', '学风建设', '诚信'],
    guidingQuestions: ['班会讨论了哪些内容？', '同学们达成了哪些共识？'],
    checkinType: 'video',
    requireText: false,
    requireImage: false,
    requireVideo: true,
    minTextLength: null,
    maxImages: null,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '暑期社会实践调研',
    description: '开展暑期社会实践并提交调研材料。',
    content:
      '请利用暑期开展社会调研或实践，提交调研报告、实践照片及相关证明材料，字数不少于 300 字。',
    category: '实践',
    tags: ['暑期实践', '社会调研', '实践报告'],
    guidingQuestions: ['调研主题是什么？', '你发现了哪些值得思考的问题？'],
    checkinType: 'mixed',
    requireText: true,
    requireImage: true,
    requireVideo: false,
    minTextLength: 300,
    maxImages: 6,
    requireLocation: true,
    requireFace: false,
    status: 'published',
  },
  {
    title: '青年大学习网上主题团课',
    description: '完成青年大学习并提交学习截图。',
    content:
      '请完成当期“青年大学习”网上主题团课学习，上传完成页面截图，并简要写出 1-2 条学习感悟。',
    category: '学习',
    tags: ['青年大学习', '团课', '截图'],
    guidingQuestions: ['本期主题是什么？', '最令你印象深刻的内容是什么？'],
    checkinType: 'image',
    requireText: false,
    requireImage: true,
    requireVideo: false,
    minTextLength: null,
    maxImages: 2,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '校园文明行为随手拍',
    description: '记录校园文明行为，传递正能量。',
    content:
      '请在校园内发现并拍摄文明行为瞬间（礼让、助人、环保等），附简短文字说明，弘扬校园文明风尚。',
    category: '活动',
    tags: ['文明校园', '随手拍', '正能量'],
    guidingQuestions: ['你拍下了什么文明行为？', '这种行为对你和他人有什么影响？'],
    checkinType: 'image',
    requireText: false,
    requireImage: true,
    requireVideo: false,
    minTextLength: null,
    maxImages: 3,
    requireLocation: true,
    requireFace: false,
    status: 'published',
  },
  {
    title: '心理健康主题沙龙',
    description: '参加心理健康主题沙龙并分享感悟。',
    content:
      '请参加学校或学院组织的心理健康主题沙龙，围绕压力管理、情绪调节等话题，分享你的收获与行动计划。',
    category: '活动',
    tags: ['心理健康', '沙龙', '情绪管理'],
    guidingQuestions: ['沙龙中你学到了哪些减压方法？', '你将如何应用到日常生活中？'],
    checkinType: 'text',
    requireText: true,
    requireImage: false,
    requireVideo: false,
    minTextLength: 80,
    maxImages: null,
    requireLocation: false,
    requireFace: false,
    status: 'draft',
  },
  {
    title: '职业生涯规划访谈',
    description: '访谈一位从业者，撰写职业规划心得。',
    content:
      '请访谈一位本专业相关从业者或校友，了解行业发展与职业能力要求，撰写不少于 200 字的访谈心得。',
    category: '实践',
    tags: ['职业规划', '校友访谈', '就业'],
    guidingQuestions: ['访谈对象的职业发展路径是怎样的？', '你对自己的职业规划有什么新认识？'],
    checkinType: 'mixed',
    requireText: true,
    requireImage: true,
    requireVideo: false,
    minTextLength: 200,
    maxImages: 2,
    requireLocation: false,
    requireFace: false,
    status: 'draft',
  },
  {
    title: '党史知识竞赛备赛打卡',
    description: '每日党史知识学习打卡。',
    content:
      '请每天学习党史知识，记录学习内容与掌握情况，连续打卡 7 天，培养学习习惯。',
    category: '学习',
    tags: ['党史', '知识竞赛', '每日打卡'],
    guidingQuestions: ['今天学习了哪些党史知识？', '有哪些内容需要进一步巩固？'],
    checkinType: 'text',
    requireText: true,
    requireImage: false,
    requireVideo: false,
    minTextLength: 50,
    maxImages: null,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '校园安全演习签到',
    description: '参加消防/地震疏散演习并完成现场签到。',
    content:
      '请参加学校组织的消防或地震疏散演习，到达指定集合地点后完成人脸识别签到，并上传现场照片。',
    category: '活动',
    tags: ['安全演习', '消防', '签到'],
    guidingQuestions: ['你参加了哪项演习？', '演习中有哪些安全知识让你印象深刻？'],
    checkinType: 'mixed',
    requireText: true,
    requireImage: true,
    requireVideo: false,
    minTextLength: 50,
    maxImages: 2,
    requireLocation: true,
    requireFace: true,
    status: 'published',
  },
  {
    title: '读书会分享视频',
    description: '阅读一本好书并录制分享视频。',
    content:
      '请选择一本与专业相关或励志成长类书籍，阅读后录制 1-3 分钟分享视频，介绍书籍内容、阅读收获。',
    category: '阅读',
    tags: ['读书会', '分享', '视频'],
    guidingQuestions: ['这本书的主要观点是什么？', '它对你有什么启发或改变？'],
    checkinType: 'video',
    requireText: false,
    requireImage: false,
    requireVideo: true,
    minTextLength: null,
    maxImages: null,
    requireLocation: false,
    requireFace: false,
    status: 'delisted',
  },
  {
    title: '劳动教育实践记录',
    description: '参与劳动实践，记录劳动过程与体会。',
    content:
      '请参加一次劳动教育活动（宿舍整理、实验室清洁、校园绿化等），拍摄劳动过程照片并撰写劳动心得。',
    category: '实践',
    tags: ['劳动教育', '实践', '心得'],
    guidingQuestions: ['你参加了什么劳动项目？', '劳动教育对你的成长有何意义？'],
    checkinType: 'mixed',
    requireText: true,
    requireImage: true,
    requireVideo: false,
    minTextLength: 80,
    maxImages: 3,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '学术诚信承诺书签署',
    description: '签署学术诚信承诺书并上传。',
    content:
      '请认真阅读学术诚信承诺书，手写签名后拍照上传，并写下对学术诚信的理解与承诺。',
    category: '学习',
    tags: ['学术诚信', '承诺书', '签名'],
    guidingQuestions: ['学术不端有哪些表现形式？', '你将如何坚守学术诚信？'],
    checkinType: 'image',
    requireText: false,
    requireImage: true,
    requireVideo: false,
    minTextLength: null,
    maxImages: 1,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '新生入学教育学习',
    description: '完成新生入学教育系列课程学习。',
    content:
      '请完成校史校情、安全教育、心理健康等新生入学教育课程，提交学习笔记或心得。',
    category: '学习',
    tags: ['新生教育', '校史校情', '入学'],
    guidingQuestions: ['你对学校历史有哪些新认识？', '入学教育对你适应大学生活有何帮助？'],
    checkinType: 'text',
    requireText: true,
    requireImage: false,
    requireVideo: false,
    minTextLength: 100,
    maxImages: null,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
  {
    title: '科研训练项目周报',
    description: '记录科研训练项目每周进展。',
    content:
      '请总结本周科研训练项目进展，包括文献阅读、实验进展、问题与下周计划，不少于 150 字。',
    category: '实践',
    tags: ['科研训练', '周报', '创新'],
    guidingQuestions: ['本周完成了哪些工作？', '遇到了什么问题，如何解决？'],
    checkinType: 'text',
    requireText: true,
    requireImage: false,
    requireVideo: false,
    minTextLength: 150,
    maxImages: null,
    requireLocation: false,
    requireFace: false,
    status: 'draft',
  },
  {
    title: '传统文化体验活动',
    description: '参加传统文化体验并提交作品照片。',
    content:
      '请参加书法、国画、剪纸、茶艺等传统文化体验活动，上传作品或活动照片，并分享文化体验感悟。',
    category: '活动',
    tags: ['传统文化', '体验', '美育'],
    guidingQuestions: ['你体验了哪项传统文化？', '传统文化对当代大学生有何价值？'],
    checkinType: 'image',
    requireText: false,
    requireImage: true,
    requireVideo: false,
    minTextLength: null,
    maxImages: 4,
    requireLocation: false,
    requireFace: false,
    status: 'published',
  },
];

// 模板地理位置示例（学校操场/图书馆/报告厅等）
const TEMPLATE_LOCATIONS: Array<{
  address: string;
  lat: number;
  lng: number;
  radius: number;
}> = [
  { address: '学校图书馆正门广场', lat: 30.529, lng: 114.354, radius: 200 },
  { address: '学生活动中心报告厅', lat: 30.531, lng: 114.356, radius: 150 },
  { address: '第一教学楼前广场', lat: 30.527, lng: 114.352, radius: 100 },
  { address: '田径场主席台侧', lat: 30.533, lng: 114.358, radius: 250 },
];

const REFLECTIONS = [
  '通过学习，我更加深刻地理解了青年一代肩负的历史使命，坚定了理想信念。',
  '这次学习让我认识到理论与实践相结合的重要性，今后要将所学运用到实际中去。',
  '作为新时代大学生，我们要坚定理想信念，练就过硬本领，勇于创新创造。',
  '思政学习不仅是知识的积累，更是价值观的塑造，我将不断提升自身修养。',
  '我将以更加积极的态度投入到学习和实践中去，为实现中华民族伟大复兴贡献力量。',
  '通过学习，我深刻体会到中国共产党的初心和使命，增强了责任感和使命感。',
  '这次学习内容丰富、思想深刻，让我对国家政策有了更全面的认识。',
  '作为青年学生，我们要听党话、跟党走，在奋斗中释放青春激情。',
  '学习使我明白，个人理想只有融入国家发展大局，才能绽放更绚丽的光彩。',
  '我将牢记习近平总书记的嘱托，立志做有理想、敢担当、能吃苦、肯奋斗的新时代好青年。',
];

const REJECT_REASONS = [
  '内容与主题关联度不足',
  '心得字数不足，请补充至 80 字以上',
  '内容过于简单，缺乏个人思考',
  '未结合学习材料，请重新撰写',
  '存在抄袭嫌疑，请提交原创内容',
];

// ===================== 工具函数 =====================
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(): string {
  const surname = randomItem(SURNAMES);
  const givenName = randomItem(GIVEN_NAMES);
  return surname + givenName;
}

function hashPassword(password: string, cache: Map<string, string>): Promise<string> {
  const cached = cache.get(password);
  if (cached) return Promise.resolve(cached);
  return bcrypt.hash(password, 10).then((hash) => {
    cache.set(password, hash);
    return hash;
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function batchInsert(
  client: Client,
  table: string,
  columns: string[],
  rows: unknown[][],
  batchSize = CONFIG.batchSize
) {
  if (rows.length === 0) return;
  const colSql = columns.join(', ');
  let inserted = 0;
  for (const batch of chunk(rows, batchSize)) {
    const placeholders = batch
      .map(
        (_, rowIdx) =>
          `(${columns
            .map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`)
            .join(', ')})`
      )
      .join(', ');
    const values = batch.flat();
    await client.query(`INSERT INTO ${table} (${colSql}) VALUES ${placeholders}`, values);
    inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} rows into ${table}`);
}

// ===================== 主流程 =====================
async function seedMock() {
  const client = new Client({ connectionString: DATABASE_URL });
  const passwordCache = new Map<string, string>();

  try {
    await client.connect();
    console.log('Connected to database');

    // 1. 清空所有业务表
    console.log('\n[1/6] Clearing existing data...');
    await client.query(`
      TRUNCATE TABLE
        check_ins,
        point_records,
        reminders,
        ai_reviews,
        user_faces,
        audit_logs,
        tasks,
        task_templates,
        counselor_classes,
        users,
        classes,
        colleges,
        quotes,
        daily_quotes,
        geofences,
        learning_resources
      RESTART IDENTITY CASCADE
    `);
    console.log('  Database cleared');

    // 2. 生成学院
    console.log('\n[2/6] Generating colleges...');
    const colleges: { id: string; name: string }[] = [];
    for (let i = 0; i < CONFIG.colleges; i++) {
      const name = COLLEGE_NAMES[i % COLLEGE_NAMES.length];
      const result = await client.query(
        'INSERT INTO colleges (name) VALUES ($1) RETURNING id',
        [`${name}${i >= COLLEGE_NAMES.length ? `-${Math.floor(i / COLLEGE_NAMES.length) + 1}` : ''}`]
      );
      colleges.push({ id: result.rows[0].id, name: `${name}${i >= COLLEGE_NAMES.length ? `-${Math.floor(i / COLLEGE_NAMES.length) + 1}` : ''}` });
    }
    console.log(`  Created ${colleges.length} colleges`);

    // 3. 生成班级
    console.log('\n[3/6] Generating classes...');
    const classes: { id: string; collegeId: string; name: string }[] = [];
    const classRows: unknown[][] = [];
    for (const college of colleges) {
      for (let i = 1; i <= CONFIG.classesPerCollege; i++) {
        classRows.push([college.id, `${i}班`]);
      }
    }
    let classIdx = 0;
    for (const batch of chunk(classRows, CONFIG.batchSize)) {
      const placeholders = batch
        .map(
          (_, rowIdx) =>
            `($${rowIdx * 2 + 1}, $${rowIdx * 2 + 2})`
        )
        .join(', ');
      const values = batch.flat();
      const result = await client.query(
        `INSERT INTO classes (college_id, name) VALUES ${placeholders} RETURNING id, college_id`,
        values
      );
      for (let i = 0; i < result.rows.length; i++) {
        classes.push({
          id: result.rows[i].id,
          collegeId: result.rows[i].college_id,
          name: batch[i][1] as string,
        });
      }
      classIdx += batch.length;
    }
    console.log(`  Created ${classes.length} classes`);

    // 4. 生成用户：管理员、辅导员、学生
    console.log('\n[4/6] Generating users...');
    const admins: { id: string; schoolId: string; name: string }[] = [];
    const counselors: { id: string; schoolId: string; name: string; collegeId: string }[] = [];
    const students: { id: string; schoolId: string; name: string; classId: string; collegeId: string }[] = [];

    const userRows: unknown[][] = [];

    // 管理员
    for (let i = 1; i <= CONFIG.admins; i++) {
      const schoolId = `A${String(i).padStart(3, '0')}`;
      const password = await hashPassword(schoolId, passwordCache);
      userRows.push([schoolId, password, 'admin', null, null, generateName(), true, true]);
    }

    // 辅导员
    for (let c = 0; c < colleges.length; c++) {
      for (let i = 1; i <= CONFIG.counselorsPerCollege; i++) {
        const schoolId = `T${String(c + 1).padStart(2, '0')}${String(i).padStart(2, '0')}`;
        const password = await hashPassword(schoolId, passwordCache);
        userRows.push([schoolId, password, 'counselor', colleges[c].id, null, generateName(), true, true]);
      }
    }

    // 学生
    for (const cls of classes) {
      const collegeIndex = colleges.findIndex((c) => c.id === cls.collegeId) + 1;
      const classIndex = classes.filter((c) => c.collegeId === cls.collegeId).indexOf(cls) + 1;
      for (let i = 1; i <= CONFIG.studentsPerClass; i++) {
        const schoolId = `2024${String(collegeIndex).padStart(2, '0')}${String(classIndex).padStart(2, '0')}${String(i).padStart(2, '0')}`;
        const password = await hashPassword(schoolId.slice(-6), passwordCache);
        userRows.push([schoolId, password, 'student', cls.collegeId, cls.id, generateName(), true, true]);
      }
    }

    let userIdx = 0;
    for (const batch of chunk(userRows, CONFIG.batchSize)) {
      const placeholders = batch
        .map(
          (_, rowIdx) =>
            `($${rowIdx * 8 + 1}, $${rowIdx * 8 + 2}, $${rowIdx * 8 + 3}, $${rowIdx * 8 + 4}, $${rowIdx * 8 + 5}, $${rowIdx * 8 + 6}, $${rowIdx * 8 + 7}, $${rowIdx * 8 + 8})`
        )
        .join(', ');
      const values = batch.flat();
      const result = await client.query(
        `INSERT INTO users (school_id, password_hash, role, college_id, class_id, name, is_initial_password, is_enabled)
         VALUES ${placeholders}
         RETURNING id, school_id, role, college_id, class_id, name`,
        values
      );
      for (const row of result.rows) {
        if (row.role === 'admin') {
          admins.push({ id: row.id, schoolId: row.school_id, name: row.name });
        } else if (row.role === 'counselor') {
          counselors.push({ id: row.id, schoolId: row.school_id, name: row.name, collegeId: row.college_id });
        } else {
          students.push({
            id: row.id,
            schoolId: row.school_id,
            name: row.name,
            classId: row.class_id,
            collegeId: row.college_id,
          });
        }
      }
      userIdx += batch.length;
      if (userIdx % 5000 === 0) {
        console.log(`  Progress: ${userIdx}/${userRows.length} users`);
      }
    }
    console.log(`  Created ${admins.length} admins, ${counselors.length} counselors, ${students.length} students`);

    // 5. 生成任务模板库
    console.log('\n[5/7] Generating task templates...');
    const adminId = admins[0].id;
    const now = Date.now();

    function buildTemplateRows(count: number): unknown[][] {
      const rows: unknown[][] = [];
      for (let i = 0; i < count; i++) {
        const def = TEMPLATE_DEFINITIONS[i % TEMPLATE_DEFINITIONS.length];
        const location = def.requireLocation ? randomItem(TEMPLATE_LOCATIONS) : null;
        const startOffsetDays = randomInt(1, 30);
        const endOffsetDays = startOffsetDays + randomInt(7, 30);
        const startTime = new Date(now - startOffsetDays * 24 * 60 * 60 * 1000).toISOString();
        const endTime = new Date(now + endOffsetDays * 24 * 60 * 60 * 1000).toISOString();

        rows.push([
          def.title,
          def.description,
          def.content,
          null, // cover_image
          def.category,
          JSON.stringify(def.tags),
          JSON.stringify(def.guidingQuestions),
          null, // source_url
          null, // video_url
          null, // attachment_url
          def.checkinType,
          def.requireText,
          def.requireImage,
          def.requireVideo,
          def.minTextLength,
          def.maxImages,
          def.requireLocation,
          location?.lat ?? null,
          location?.lng ?? null,
          location?.radius ?? null,
          location?.address ?? null,
          def.requireFace,
          adminId,
          def.status,
          startTime,
          endTime,
        ]);
      }
      return rows;
    }

    const templateColumns = [
      'title', 'description', 'content', 'cover_image', 'category', 'tags',
      'guiding_questions', 'source_url', 'video_url', 'attachment_url',
      'checkin_type', 'require_text', 'require_image', 'require_video',
      'min_text_length', 'max_images', 'require_location', 'geo_lat', 'geo_lng',
      'geo_radius_meters', 'geo_address', 'require_face', 'created_by', 'status',
      'start_time', 'end_time',
    ];

    const templateRows = buildTemplateRows(CONFIG.templatesCount);
    const templates: { id: string; status: string; checkinType: string; title: string; content: string }[] = [];
    for (const batch of chunk(templateRows, 500)) {
      const placeholders = batch
        .map(
          (_, rowIdx) =>
            `(${templateColumns
              .map((__, colIdx) => `$${rowIdx * templateColumns.length + colIdx + 1}`)
              .join(', ')})`
        )
        .join(', ');
      const result = await client.query(
        `INSERT INTO task_templates (${templateColumns.join(', ')})
         VALUES ${placeholders}
         RETURNING id, status, checkin_type, title, content`,
        batch.flat()
      );
      for (const row of result.rows) {
        templates.push({
          id: row.id,
          status: row.status,
          checkinType: row.checkin_type,
          title: row.title,
          content: row.content,
        });
      }
    }
    const publishedTemplates = templates.filter((t) => t.status === 'published');
    console.log(`  Created ${templates.length} task templates (${publishedTemplates.length} published)`);

    // 6. 辅导员班级关联 + 任务
    console.log('\n[6/7] Generating counselor-class links and tasks...');

    // 辅导员班级关联：每位辅导员管理本院约 7 个班级
    const counselorClassRows: unknown[][] = [];
    for (const college of colleges) {
      const collegeCounselors = counselors.filter((c) => c.collegeId === college.id);
      const collegeClasses = classes.filter((c) => c.collegeId === college.id);
      collegeClasses.forEach((cls, idx) => {
        const counselor = collegeCounselors[idx % collegeCounselors.length];
        counselorClassRows.push([counselor.id, cls.id]);
      });
    }
    await batchInsert(client, 'counselor_classes', ['counselor_id', 'class_id'], counselorClassRows);

    // 任务：每班 2 个任务；部分班级任务由已发布模板派生
    const taskRows: unknown[][] = [];
    let dispatchedFromTemplateCount = 0;
    for (const cls of classes) {
      for (let i = 0; i < CONFIG.tasksPerClass; i++) {
        const useTemplate = publishedTemplates.length > 0 && Math.random() < CONFIG.templatesDispatchRate;
        const template = useTemplate ? randomItem(publishedTemplates) : null;
        const publishedAt = new Date(now - randomInt(1, 14) * 24 * 60 * 60 * 1000);
        const deadlineAt = new Date(publishedAt.getTime() + randomInt(7, 21) * 24 * 60 * 60 * 1000);

        if (template) {
          taskRows.push([
            template.title,
            template.content,
            'class',
            cls.id,
            cls.id,
            template.id,
            adminId,
            publishedAt.toISOString(),
            deadlineAt.toISOString(),
            'published',
          ]);
          dispatchedFromTemplateCount++;
        } else {
          const title = `${randomItem(TASK_TITLES)} - ${cls.name}`;
          taskRows.push([
            title,
            TASK_CONTENT,
            'class',
            cls.id,
            cls.id,
            null, // template_id
            adminId,
            publishedAt.toISOString(),
            deadlineAt.toISOString(),
            'published',
          ]);
        }
      }
    }

    const tasks: { id: string; classId: string; deadlineAt: Date }[] = [];
    for (const batch of chunk(taskRows, 500)) {
      const placeholders = batch
        .map(
          (_, rowIdx) =>
            `($${rowIdx * 10 + 1}, $${rowIdx * 10 + 2}, $${rowIdx * 10 + 3}, $${rowIdx * 10 + 4}, $${rowIdx * 10 + 5}, $${rowIdx * 10 + 6}, $${rowIdx * 10 + 7}, $${rowIdx * 10 + 8}, $${rowIdx * 10 + 9}, $${rowIdx * 10 + 10})`
        )
        .join(', ');
      const values = batch.flat();
      const result = await client.query(
        `INSERT INTO tasks (
          title, content, scope_type, scope_id, target_class_id, template_id, created_by,
          published_at, deadline_at, status
        ) VALUES ${placeholders}
        RETURNING id, target_class_id, deadline_at`,
        values
      );
      for (const row of result.rows) {
        tasks.push({ id: row.id, classId: row.target_class_id, deadlineAt: new Date(row.deadline_at) });
      }
    }
    console.log(`  Created ${tasks.length} tasks (${dispatchedFromTemplateCount} from templates)`);

    // 7. 生成打卡记录
    console.log('\n[7/7] Generating check-ins...');
    const classTaskMap = new Map<string, { id: string; deadlineAt: Date }[]>();
    for (const task of tasks) {
      if (!classTaskMap.has(task.classId)) classTaskMap.set(task.classId, []);
      classTaskMap.get(task.classId)!.push(task);
    }

    const statuses = ['approved', 'approved', 'approved', 'ai_approved', 'pending_manual_review', 'rejected'];
    const checkInRows: unknown[][] = [];

    for (const student of students) {
      const taskCount = randomInt(1, CONFIG.maxCheckInsPerStudent);
      const classTasks = classTaskMap.get(student.classId) || [];
      const selectedTasks = classTasks.sort(() => Math.random() - 0.5).slice(0, taskCount);

      for (const task of selectedTasks) {
        const status = randomItem(statuses);
        const reflection = status === 'rejected' ? null : randomItem(REFLECTIONS);
        const aiReviewReason = status === 'approved' ? null : status === 'rejected' ? randomItem(REJECT_REASONS) : '需人工复核';
        const checkedInAt = new Date(task.deadlineAt.getTime() - randomInt(1, 7) * 24 * 60 * 60 * 1000);

        checkInRows.push([
          student.id,
          task.id,
          status,
          reflection,
          aiReviewReason,
          checkedInAt.toISOString(),
        ]);
      }
    }

    await batchInsert(client, 'check_ins', ['user_id', 'task_id', 'status', 'reflection_content', 'ai_review_reason', 'checked_in_at'], checkInRows);

    // 完成
    console.log('\n========================================');
    console.log('Mock seed completed successfully');
    console.log('========================================');
    console.log(`Colleges:     ${colleges.length}`);
    console.log(`Classes:      ${classes.length}`);
    console.log(`Admins:       ${admins.length}`);
    console.log(`Counselors:   ${counselors.length}`);
    console.log(`Students:     ${students.length}`);
    console.log(`Templates:    ${templates.length}`);
    console.log(`Tasks:        ${tasks.length}`);
    console.log(`Check-ins:    ${checkInRows.length}`);
    console.log('----------------------------------------');
    console.log('Login examples:');
    console.log(`  Admin:     ${admins[0].schoolId} / ${admins[0].schoolId}`);
    console.log(`  Counselor: ${counselors[0].schoolId} / ${counselors[0].schoolId}`);
    console.log(`  Student:   ${students[0].schoolId} / ${students[0].schoolId.slice(-6)}`);
  } catch (error) {
    console.error('Mock seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedMock();
