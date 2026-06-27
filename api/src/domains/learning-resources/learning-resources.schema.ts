import { z } from 'zod';
import type { LearningResourceType, LearningResourceStatus } from './learning-resources.types.js';

const resourceTypeSchema = z.enum(['article', 'video', 'document', 'link'] as const) as z.ZodType<LearningResourceType>;
const resourceStatusSchema = z.enum(['draft', 'published'] as const) as z.ZodType<LearningResourceStatus>;

export const createLearningResourceSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过 200 字'),
  description: z.string().max(500, '简介不能超过 500 字').nullable().optional(),
  type: resourceTypeSchema,
  content: z.string().max(20000, '内容不能超过 20000 字').nullable().optional(),
  url: z.string().url('URL 格式无效').max(1000, 'URL 过长').nullable().optional(),
  category: z.string().max(50, '分类不能超过 50 字').nullable().optional(),
  tags: z.array(z.string().max(30, '单个标签不能超过 30 字')).max(10, '标签不能超过 10 个').nullable().optional(),
  status: resourceStatusSchema.optional(),
});

export const updateLearningResourceSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过 200 字').optional(),
  description: z.string().max(500, '简介不能超过 500 字').nullable().optional(),
  type: resourceTypeSchema.optional(),
  content: z.string().max(20000, '内容不能超过 20000 字').nullable().optional(),
  url: z.string().url('URL 格式无效').max(1000, 'URL 过长').nullable().optional(),
  category: z.string().max(50, '分类不能超过 50 字').nullable().optional(),
  tags: z.array(z.string().max(30, '单个标签不能超过 30 字')).max(10, '标签不能超过 10 个').nullable().optional(),
  status: resourceStatusSchema.optional(),
});

export const updateStatusSchema = z.object({
  status: resourceStatusSchema,
});
