/**
 * 单独向数据库插入任务模板 mock 数据。
 *
 * 特点：只写入 task_templates 表，不会清空其他业务数据。
 * 运行方式：
 *   npm --prefix api run db:seed:templates
 *
 * 说明：
 * - 默认写入 20 个模板（覆盖多种分类、打卡类型、状态）
 * - 基于 api/src/scripts/seed-mock.ts 中的模板定义，保持数据一致
 * - 需要数据库中至少存在一个 admin 用户作为 created_by
 */
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

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

const TEMPLATE_LOCATIONS: Array<{ address: string; lat: number; lng: number; radius: number }> = [
  { address: '学校图书馆正门广场', lat: 30.529, lng: 114.354, radius: 200 },
  { address: '学生活动中心报告厅', lat: 30.531, lng: 114.356, radius: 150 },
  { address: '第一教学楼前广场', lat: 30.527, lng: 114.352, radius: 100 },
  { address: '田径场主席台侧', lat: 30.533, lng: 114.358, radius: 250 },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedTaskTemplates() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const adminResult = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const adminId = adminResult.rows[0]?.id;
    if (!adminId) {
      throw new Error('未找到 admin 用户，请先运行 npm run db:seed 创建基础账号');
    }

    const now = Date.now();
    const rows: unknown[][] = [];

    for (const def of TEMPLATE_DEFINITIONS) {
      const location = def.requireLocation ? randomItem(TEMPLATE_LOCATIONS) : null;
      const startOffsetDays = randomInt(1, 30);
      const endOffsetDays = startOffsetDays + randomInt(7, 30);

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
        new Date(now - startOffsetDays * 24 * 60 * 60 * 1000).toISOString(),
        new Date(now + endOffsetDays * 24 * 60 * 60 * 1000).toISOString(),
      ]);
    }

    const columns = [
      'title', 'description', 'content', 'cover_image', 'category', 'tags',
      'guiding_questions', 'source_url', 'video_url', 'attachment_url',
      'checkin_type', 'require_text', 'require_image', 'require_video',
      'min_text_length', 'max_images', 'require_location', 'geo_lat', 'geo_lng',
      'geo_radius_meters', 'geo_address', 'require_face', 'created_by', 'status',
      'start_time', 'end_time',
    ];

    const existingResult = await client.query(
      'SELECT title FROM task_templates WHERE title = ANY($1)',
      [TEMPLATE_DEFINITIONS.map((d) => d.title)]
    );
    const existingTitles = new Set(existingResult.rows.map((r) => r.title));

    const newRows = rows.filter((r) => !existingTitles.has(r[0] as string));
    if (newRows.length === 0) {
      console.log('所有任务模板已存在，无需插入');
      return;
    }

    const placeholders = newRows
      .map(
        (_, rowIdx) =>
          `(${columns.map((__, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`
      )
      .join(', ');

    await client.query(
      `INSERT INTO task_templates (${columns.join(', ')}) VALUES ${placeholders}`,
      newRows.flat()
    );

    console.log(`成功插入 ${newRows.length} 个任务模板`);
    if (existingTitles.size > 0) {
      console.log(`已跳过 ${existingTitles.size} 个已存在的模板`);
    }
    console.log(
      `状态分布：published=${newRows.filter((r) => r[23] === 'published').length}, ` +
        `draft=${newRows.filter((r) => r[23] === 'draft').length}, ` +
        `delisted=${newRows.filter((r) => r[23] === 'delisted').length}`
    );
  } catch (error) {
    console.error('任务模板 mock 数据插入失败:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedTaskTemplates();
