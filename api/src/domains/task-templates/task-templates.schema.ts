import { z } from 'zod';

const titleSchema = z
  .string()
  .trim()
  .min(1, '模板标题不能为空')
  .max(100, '模板标题不能超过 100 字');
const contentSchema = z
  .string()
  .trim()
  .min(1, '模板内容不能为空')
  .max(2000, '模板内容不能超过 2000 字');

export const createTaskTemplateSchema = z.object({
  title: titleSchema,
  content: contentSchema,
  guiding_questions: z.array(z.string().trim().min(1, '思考题不能为空')).nullable().optional(),
  source_url: z.string().url('外部链接格式无效').nullable().optional(),
  video_url: z.string().url('视频 URL 格式无效').nullable().optional(),
  geo_lat: z.number().min(-90).max(90).nullable().optional(),
  geo_lng: z.number().min(-180).max(180).nullable().optional(),
  geo_radius_meters: z.number().int().min(50).max(1000).nullable().optional(),
  geo_address: z.string().trim().max(200).nullable().optional(),
  require_face: z.boolean().optional(),
}).refine(
  (data) => {
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

export type CreateTaskTemplateInput = z.infer<typeof createTaskTemplateSchema>;

export const updateTaskTemplateSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
  guiding_questions: z.array(z.string().trim().min(1, '思考题不能为空')).nullable().optional(),
  source_url: z.string().url('外部链接格式无效').nullable().optional(),
  video_url: z.string().url('视频 URL 格式无效').nullable().optional(),
  geo_lat: z.number().min(-90).max(90).nullable().optional(),
  geo_lng: z.number().min(-180).max(180).nullable().optional(),
  geo_radius_meters: z.number().int().min(50).max(1000).nullable().optional(),
  geo_address: z.string().trim().max(200).nullable().optional(),
  require_face: z.boolean().optional(),
  status: z.enum(['published', 'delisted']).optional(),
}).refine(
  (data) => {
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

export type UpdateTaskTemplateInput = z.infer<typeof updateTaskTemplateSchema>;
