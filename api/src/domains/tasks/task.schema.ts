import { z } from 'zod';

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
  published_at: z.string().datetime({ message: '发布时间格式无效' }),
  deadline_at: z.string().datetime({ message: '截止时间格式无效' }),
}).refine(
  (data) => {
    // 如果 scope_type 不是 pool，则 scope_id 必填
    if (data.scope_type !== 'pool' && !data.scope_id) {
      return false;
    }
    return true;
  },
  {
    message: '发布范围为 school/college/class 时必须指定 scope_id',
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
);

export const dispatchTaskSchema = z.object({
  source_task_id: z.string().uuid('源任务 ID 格式无效'),  // AD-21: 必填
  target_class_id: z.string().uuid('班级 ID 格式无效'),  // AD-21: 必填
  deadline_at: z.string().datetime({ message: '截止时间格式无效' }),
});

export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
  guiding_questions: z.array(z.string().trim().min(1, '思考题不能为空')).nullable().optional(),
  source_url: z.string().url('外部链接格式无效').nullable().optional(),
  video_url: z.string().url('视频 URL 格式无效').nullable().optional(),
  scope_type: z.enum(['school', 'college', 'class', 'pool']).optional(),
  scope_id: z.string().uuid('范围 ID 格式无效').nullable().optional(),
  published_at: z.string().datetime({ message: '发布时间格式无效' }).optional(),
  deadline_at: z.string().datetime({ message: '截止时间格式无效' }).optional(),
  // P1: status 字段保留以兼容前端类型，但 controller 会拒绝通过 update 修改 status
  status: z.enum(['published', 'delisted']).optional(),
}).refine(
  (data) => {
    // P5: 如果同时提供了 scope_type 和 scope_id，校验一致性
    if (data.scope_type && data.scope_type !== 'pool' && data.scope_id === null) {
      return false;
    }
    return true;
  },
  {
    message: '发布范围为 school/college/class 时 scope_id 不能为 null',
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
);
