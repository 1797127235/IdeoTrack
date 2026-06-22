import { z } from 'zod';

export const createCheckInSchema = z.object({
  task_id: z.string().uuid('任务 ID 格式无效'),
  latitude: z.number().min(-90).max(90, '纬度必须在 -90 到 90 之间'),
  longitude: z.number().min(-180).max(180, '经度必须在 -180 到 180 之间'),
  address: z.string().trim().max(500, '地址描述不能超过 500 字').optional(),
});

export type CreateCheckInSchema = z.infer<typeof createCheckInSchema>;
