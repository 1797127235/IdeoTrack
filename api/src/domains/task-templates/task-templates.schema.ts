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
const descriptionSchema = z.string().trim().max(500, '任务说明不能超过 500 字').nullable().optional();
const coverImageSchema = z.string().url('封面图 URL 格式无效').nullable().optional();
const categorySchema = z.enum(['学习', '实践', '活动', '会议', '阅读']).nullable().optional();
const tagsSchema = z.array(z.string().trim().min(1, '标签不能为空').max(20, '单个标签不能超过 20 字')).nullable().optional();
const checkinTypeSchema = z.enum(['text', 'image', 'video', 'mixed']).optional();
const statusSchema = z.enum(['draft', 'published', 'delisted']).optional();
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/, '时间格式无效')
  .nullable()
  .optional();

const baseFields = {
  title: titleSchema,
  description: descriptionSchema,
  content: contentSchema,
  cover_image: coverImageSchema,
  category: categorySchema,
  tags: tagsSchema,
  guiding_questions: z.array(z.string().trim().min(1, '思考题不能为空')).nullable().optional(),
  source_url: z.string().url('外部链接格式无效').nullable().optional(),
  video_url: z.string().url('视频 URL 格式无效').nullable().optional(),
  checkin_type: checkinTypeSchema,
  require_text: z.boolean().optional(),
  require_image: z.boolean().optional(),
  require_video: z.boolean().optional(),
  min_text_length: z.number().int().min(0).nullable().optional(),
  max_images: z.number().int().min(1).max(9).nullable().optional(),
  require_location: z.boolean().optional(),
  geo_lat: z.number().min(-90).max(90).nullable().optional(),
  geo_lng: z.number().min(-180).max(180).nullable().optional(),
  geo_radius_meters: z.number().int().min(50).max(1000).nullable().optional(),
  geo_address: z.string().trim().max(200).nullable().optional(),
  require_face: z.boolean().optional(),
  status: statusSchema,
  start_time: isoDateSchema,
  end_time: isoDateSchema,
};

const refineGeofence = (data: {
  require_location?: boolean;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_meters?: number | null;
}) => {
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
};

const refineCheckinType = (data: {
  checkin_type?: 'text' | 'image' | 'video' | 'mixed';
  require_text?: boolean;
  require_image?: boolean;
  require_video?: boolean;
}) => {
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
};

const refineEndTime = (data: { start_time?: string | null; end_time?: string | null }) => {
  if (data.start_time && data.end_time) {
    return new Date(data.end_time) > new Date(data.start_time);
  }
  return true;
};

export const createTaskTemplateSchema = z
  .object(baseFields)
  .refine(refineGeofence, {
    message: '开启定位签到后，必须提供纬度、经度和半径',
    path: ['geo_radius_meters'],
  })
  .refine(refineCheckinType, {
    message: '打卡类型与必填内容不匹配',
    path: ['checkin_type'],
  })
  .refine(refineEndTime, {
    message: '结束时间必须晚于开始时间',
    path: ['end_time'],
  });

export type CreateTaskTemplateInput = z.infer<typeof createTaskTemplateSchema>;

export const updateTaskTemplateSchema = z
  .object(baseFields)
  .refine(refineGeofence, {
    message: '开启定位签到后，必须提供纬度、经度和半径',
    path: ['geo_radius_meters'],
  })
  .refine(refineCheckinType, {
    message: '打卡类型与必填内容不匹配',
    path: ['checkin_type'],
  })
  .refine(refineEndTime, {
    message: '结束时间必须晚于开始时间',
    path: ['end_time'],
  });

export type UpdateTaskTemplateInput = z.infer<typeof updateTaskTemplateSchema>;
