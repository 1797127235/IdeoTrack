import { z } from 'zod';

export const createCheckInSchema = z.object({
  task_id: z.string().uuid('任务 ID 格式无效'),
  latitude: z.number().min(-90).max(90, '纬度必须在 -90 到 90 之间').default(0),
  longitude: z.number().min(-180).max(180, '经度必须在 -180 到 180 之间').default(0),
  address: z.string().trim().max(500, '地址描述不能超过 500 字').optional(),
  reflection_content: z.string().trim().min(10, '心得内容不能少于 10 字').max(500, '心得内容不能超过 500 字').optional(),
});

export type CreateCheckInSchema = z.infer<typeof createCheckInSchema>;

export const submitReflectionSchema = z.object({
  check_in_id: z.string().uuid('打卡记录 ID 无效'),
  content: z.string().trim().min(10, '心得内容不能少于 10 字').max(500, '心得内容不能超过 500 字'),
});

export type SubmitReflectionSchema = z.infer<typeof submitReflectionSchema>;
