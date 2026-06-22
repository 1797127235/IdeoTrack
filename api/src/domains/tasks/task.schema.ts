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
  scope_type: z.enum(['school', 'college', 'class'], {
    message: '发布范围必须是 school、college 或 class',
  }),
  target_college_id: z.string().uuid('学院 ID 格式无效').nullable().optional(),
  target_class_id: z.string().uuid('班级 ID 格式无效').nullable().optional(),
  published_at: z.string().datetime({ message: '发布时间格式无效' }),
  deadline_at: z.string().datetime({ message: '截止时间格式无效' }),
});

export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
  scope_type: z.enum(['school', 'college', 'class']).optional(),
  target_college_id: z.string().uuid('学院 ID 格式无效').nullable().optional(),
  target_class_id: z.string().uuid('班级 ID 格式无效').nullable().optional(),
  published_at: z.string().datetime({ message: '发布时间格式无效' }).optional(),
  deadline_at: z.string().datetime({ message: '截止时间格式无效' }).optional(),
  // P1: status 字段保留以兼容前端类型，但 controller 会拒绝通过 update 修改 status
  status: z.enum(['published', 'delisted']).optional(),
});
