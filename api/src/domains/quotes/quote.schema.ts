import { z } from 'zod';

export const createQuoteSchema = z.object({
  content: z.string().min(1, '名言内容不能为空').max(200, '名言内容不能超过 200 字'),
  author: z.string().max(50, '作者不能超过 50 字').nullable().optional(),
  source: z.string().max(100, '出处不能超过 100 字').nullable().optional(),
  is_enabled: z.boolean().optional(),
  display_order: z.number().int().min(0, '排序不能为负数').optional(),
});

export const updateQuoteSchema = z.object({
  content: z.string().min(1, '名言内容不能为空').max(200, '名言内容不能超过 200 字').optional(),
  author: z.string().max(50, '作者不能超过 50 字').nullable().optional(),
  source: z.string().max(100, '出处不能超过 100 字').nullable().optional(),
  is_enabled: z.boolean().optional(),
  display_order: z.number().int().min(0, '排序不能为负数').optional(),
});
