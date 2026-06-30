import { z } from 'zod';

const isoDatetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/;
const isoDatetimeMessage = '时间格式无效，需为 ISO 8601 格式';

// P7: 服务端 trim + 非空校验，防止纯空白字符串绕过
const titleSchema = z
  .string()
  .trim()
  .min(1, '任务标题不能为空')
  .max(100, '任务标题不能超过 100 字');
const contentSchema = z
  .string()
  .trim()
  .min(1, '任务内容不能为空')
  .max(2000, '任务内容不能超过 2000 字');

export const createTaskSchema = z.object({
  title: titleSchema,
  description: z.string().trim().max(500, '任务说明不能超过 500 字').nullable().optional(),
  content: contentSchema,
  cover_image: z.string().nullable().optional(),
  category: z.enum(['学习', '实践', '活动', '会议', '阅读']).nullable().optional(),
  tags: z.array(z.string().trim().min(1, '标签不能为空').max(20, '单个标签不能超过 20 字')).nullable().optional(),
  guiding_questions: z.array(z.string().trim().min(1, '思考题不能为空')).nullable().optional(),
  source_url: z.string().url('外部链接格式无效').nullable().optional(),
  video_url: z.string().url('视频 URL 格式无效').nullable().optional(),
  attachment_url: z.string().nullable().optional(),
  checkin_type: z.enum(['text', 'image', 'video', 'mixed']).optional(),
  require_text: z.boolean().optional(),
  require_image: z.boolean().optional(),
  require_video: z.boolean().optional(),
  min_text_length: z.number().int().min(0).nullable().optional(),
  max_images: z.number().int().min(1).max(9).nullable().optional(),
  require_location: z.boolean().optional(),
  scope_type: z.enum(['school', 'college', 'class'], {
    message: '发布范围必须是 school、college 或 class',
  }),
  scope_id: z.string().uuid('范围 ID 格式无效').nullable().optional(),
  published_at: z.string().regex(isoDatetimeRegex, isoDatetimeMessage),
  deadline_at: z.string().regex(isoDatetimeRegex, isoDatetimeMessage),
  geo_lat: z.number().min(-90).max(90).nullable().optional(),
  geo_lng: z.number().min(-180).max(180).nullable().optional(),
  geo_radius_meters: z.number().int().min(50).max(1000).nullable().optional(),
  geo_address: z.string().trim().max(200).nullable().optional(),
  require_face: z.boolean().optional(),
}).refine(
  (data) => {
    // school 不需要 scope_id；college/class 必须提供有效 scope_id
    if (data.scope_type === 'school' && data.scope_id) {
      return false;
    }
    if ((data.scope_type === 'college' || data.scope_type === 'class') && !data.scope_id) {
      return false;
    }
    return true;
  },
  {
    message: 'scope_id 与 scope_type 不匹配',
    path: ['scope_id'],
  }
).refine(
  (data) => {
    return new Date(data.deadline_at) > new Date(data.published_at);
  },
  {
    message: '截止时间必须晚于发布时间',
    path: ['deadline_at'],
  }
).refine(
  (data) => {
    if (data.require_location) {
      return (
        data.geo_lat !== undefined &&
        data.geo_lat !== null &&
        data.geo_lng !== undefined &&
        data.geo_lng !== null &&
        data.geo_radius_meters !== undefined &&
        data.geo_radius_meters !== null
      );
    }
    return true;
  },
  {
    message: '开启定位签到后，必须提供纬度、经度和半径',
    path: ['geo_radius_meters'],
  }
).refine(
  (data) => {
    if (data.checkin_type === 'text' && (data.require_image || data.require_video)) {
      return false;
    }
    if (data.checkin_type === 'image' && (data.require_text || data.require_video)) {
      return false;
    }
    if (data.checkin_type === 'video' && (data.require_text || data.require_image)) {
      return false;
    }
    return true;
  },
  {
    message: '打卡类型与必填内容不匹配',
    path: ['checkin_type'],
  }
);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const createTaskFromTemplateSchema = z.object({
  template_id: z.string().uuid('模板 ID 格式无效'),
  scope_type: z.enum(['school', 'college', 'class'], {
    message: '发布范围必须是 school、college 或 class',
  }),
  scope_id: z.string().uuid('范围 ID 格式无效').nullable().optional(),
  target_class_ids: z.array(z.string().uuid('班级 ID 格式无效')).min(1, '至少选择一个班级').optional(),
  published_at: z.string().regex(isoDatetimeRegex, isoDatetimeMessage),
  deadline_at: z.string().regex(isoDatetimeRegex, isoDatetimeMessage),
  geo_lat: z.number().min(-90).max(90).nullable().optional(),
  geo_lng: z.number().min(-180).max(180).nullable().optional(),
  geo_radius_meters: z.number().int().min(50).max(1000).nullable().optional(),
  geo_address: z.string().trim().max(200).nullable().optional(),
}).refine(
  (data) => {
    if (data.scope_type === 'school') {
      return !data.scope_id && (!data.target_class_ids || data.target_class_ids.length === 0);
    }
    if (data.scope_type === 'college') {
      return !!data.scope_id && (!data.target_class_ids || data.target_class_ids.length === 0);
    }
    if (data.scope_type === 'class') {
      return !!data.target_class_ids && data.target_class_ids.length > 0;
    }
    return false;
  },
  {
    message: 'scope_type 与 scope_id/target_class_ids 不匹配',
    path: ['scope_type'],
  }
).refine(
  (data) => {
    return new Date(data.deadline_at) > new Date(data.published_at);
  },
  {
    message: '截止时间必须晚于发布时间',
    path: ['deadline_at'],
  }
);

export type CreateTaskFromTemplateInput = z.infer<typeof createTaskFromTemplateSchema>;

export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  description: z.string().trim().max(500, '任务说明不能超过 500 字').nullable().optional(),
  content: contentSchema.optional(),
  cover_image: z.string().url('封面图 URL 格式无效').nullable().optional(),
  category: z.enum(['学习', '实践', '活动', '会议', '阅读']).nullable().optional(),
  tags: z.array(z.string().trim().min(1, '标签不能为空').max(20, '单个标签不能超过 20 字')).nullable().optional(),
  guiding_questions: z.array(z.string().trim().min(1, '思考题不能为空')).nullable().optional(),
  source_url: z.string().url('外部链接格式无效').nullable().optional(),
  video_url: z.string().url('视频 URL 格式无效').nullable().optional(),
  attachment_url: z.string().nullable().optional(),
  checkin_type: z.enum(['text', 'image', 'video', 'mixed']).optional(),
  require_text: z.boolean().optional(),
  require_image: z.boolean().optional(),
  require_video: z.boolean().optional(),
  min_text_length: z.number().int().min(0).nullable().optional(),
  max_images: z.number().int().min(1).max(9).nullable().optional(),
  require_location: z.boolean().optional(),
  scope_type: z.enum(['school', 'college', 'class']).optional(),
  scope_id: z.string().uuid('范围 ID 格式无效').nullable().optional(),
  published_at: z.string().regex(isoDatetimeRegex, isoDatetimeMessage).optional(),
  deadline_at: z.string().regex(isoDatetimeRegex, isoDatetimeMessage).optional(),
  geo_lat: z.number().min(-90).max(90).nullable().optional(),
  geo_lng: z.number().min(-180).max(180).nullable().optional(),
  geo_radius_meters: z.number().int().min(50).max(1000).nullable().optional(),
  geo_address: z.string().trim().max(200).nullable().optional(),
  require_face: z.boolean().optional(),
  // P1: status 字段保留以兼容前端类型，但 controller 会拒绝通过 update 修改 status
  status: z.enum(['published', 'delisted']).optional(),
}).refine(
  (data) => {
    if (data.scope_type === 'school' && data.scope_id) {
      return false;
    }
    if ((data.scope_type === 'college' || data.scope_type === 'class') && data.scope_id === null) {
      return false;
    }
    return true;
  },
  {
    message: 'scope_id 与 scope_type 不匹配',
    path: ['scope_id'],
  }
).refine(
  (data) => {
    if (data.published_at && data.deadline_at) {
      return new Date(data.deadline_at) > new Date(data.published_at);
    }
    return true;
  },
  {
    message: '截止时间必须晚于发布时间',
    path: ['deadline_at'],
  }
).refine(
  (data) => {
    if (data.require_location) {
      return (
        data.geo_lat !== undefined &&
        data.geo_lat !== null &&
        data.geo_lng !== undefined &&
        data.geo_lng !== null &&
        data.geo_radius_meters !== undefined &&
        data.geo_radius_meters !== null
      );
    }
    return true;
  },
  {
    message: '开启定位签到后，必须提供纬度、经度和半径',
    path: ['geo_radius_meters'],
  }
).refine(
  (data) => {
    if (data.checkin_type === 'text' && (data.require_image || data.require_video)) {
      return false;
    }
    if (data.checkin_type === 'image' && (data.require_text || data.require_video)) {
      return false;
    }
    if (data.checkin_type === 'video' && (data.require_text || data.require_image)) {
      return false;
    }
    return true;
  },
  {
    message: '打卡类型与必填内容不匹配',
    path: ['checkin_type'],
  }
);

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
