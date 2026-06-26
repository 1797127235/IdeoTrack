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
  content: contentSchema,
  guiding_questions: z.array(z.string().trim().min(1, '思考题不能为空')).nullable().optional(),  // AD-22: JSONB 数组，可选
  source_url: z.string().url('外部链接格式无效').nullable().optional(),  // AD-22: 可选
  video_url: z.string().url('视频 URL 格式无效').nullable().optional(),  // AD-22: 可选
  scope_type: z.enum(['school', 'college', 'class', 'pool'], {
    message: '发布范围必须是 school、college、class 或 pool',
  }),
  scope_id: z.string().uuid('范围 ID 格式无效').nullable().optional(),  // AD-21: pool 时为 NULL
  published_at: z.string().regex(isoDatetimeRegex, isoDatetimeMessage),
  deadline_at: z.string().regex(isoDatetimeRegex, isoDatetimeMessage),
  geo_lat: z.number().min(-90).max(90).nullable().optional(),
  geo_lng: z.number().min(-180).max(180).nullable().optional(),
  geo_radius_meters: z.number().int().min(50).max(1000).nullable().optional(),
  geo_address: z.string().trim().max(200).nullable().optional(),
  require_face: z.boolean().optional(),
}).refine(
  (data) => {
    // AD-21: pool/school 不需要 scope_id；college/class 必须提供有效 scope_id
    if (data.scope_type === 'pool' && data.scope_id) {
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
    // P6: 校验截止时间必须晚于发布时间
    return new Date(data.deadline_at) > new Date(data.published_at);
  },
  {
    message: '截止时间必须晚于发布时间',
    path: ['deadline_at'],
  }
).refine(
  (data) => {
    // 如果提供了位置范围，经纬度和半径必须同时提供
    const hasLat = data.geo_lat !== undefined && data.geo_lat !== null;
    const hasLng = data.geo_lng !== undefined && data.geo_lng !== null;
    const hasRadius = data.geo_radius_meters !== undefined && data.geo_radius_meters !== null;
    const any = hasLat || hasLng || hasRadius || (data.geo_address && data.geo_address.trim().length > 0);
    if (!any) return true;
    return hasLat && hasLng && hasRadius;
  },
  {
    message: '位置范围的纬度、经度和半径必须同时提供',
    path: ['geo_radius_meters'],
  }
);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const dispatchTaskSchema = z.object({
  source_task_id: z.string().uuid('源任务 ID 格式无效'),  // AD-21: 必填
  target_class_id: z.string().uuid('班级 ID 格式无效'),  // AD-21: 必填
});

export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
  guiding_questions: z.array(z.string().trim().min(1, '思考题不能为空')).nullable().optional(),
  source_url: z.string().url('外部链接格式无效').nullable().optional(),
  video_url: z.string().url('视频 URL 格式无效').nullable().optional(),
  scope_type: z.enum(['school', 'college', 'class', 'pool']).optional(),
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
    // AD-21: pool/school 不需要 scope_id；college/class 切换时 scope_id 不能为 null
    if (data.scope_type === 'pool' && data.scope_id) {
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
    // 如果同时提供了发布时间和截止时间，校验时间顺序
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
    // 如果提供了位置范围，经纬度和半径必须同时提供
    const hasLat = data.geo_lat !== undefined && data.geo_lat !== null;
    const hasLng = data.geo_lng !== undefined && data.geo_lng !== null;
    const hasRadius = data.geo_radius_meters !== undefined && data.geo_radius_meters !== null;
    const any = hasLat || hasLng || hasRadius || (data.geo_address && data.geo_address.trim().length > 0);
    if (!any) return true;
    return hasLat && hasLng && hasRadius;
  },
  {
    message: '位置范围的纬度、经度和半径必须同时提供',
    path: ['geo_radius_meters'],
  }
);

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
