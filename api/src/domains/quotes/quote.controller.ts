import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import * as quoteService from './quote.service.js';
import { createQuoteSchema, updateQuoteSchema } from './quote.schema.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isFutureDate(dateStr: string): boolean {
  const input = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  input.setHours(0, 0, 0, 0);
  return input.getTime() > today.getTime();
}

export async function getDailyQuoteController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dateParam = req.query.date;
    const date =
      typeof dateParam === 'string' && dateParam.length > 0
        ? dateParam
        : new Date().toISOString().split('T')[0];

    if (!isValidDateString(date)) {
      throw new AppError('VALIDATION_ERROR', '日期格式无效，应为 YYYY-MM-DD', 400);
    }

    if (isFutureDate(date)) {
      throw new AppError('VALIDATION_ERROR', '不能查看未来日期的名言', 400);
    }

    const quote = await quoteService.getDailyQuote(date);
    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
}

export async function listQuotesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const isEnabledQuery = req.query.is_enabled;
    const filters: { is_enabled?: boolean } = {};

    if (isEnabledQuery === 'true') filters.is_enabled = true;
    if (isEnabledQuery === 'false') filters.is_enabled = false;

    const quotes = await quoteService.listQuotes(filters);
    res.json({ success: true, data: quotes });
  } catch (error) {
    next(error);
  }
}

export async function createQuoteController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = createQuoteSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        400
      );
    }

    const quote = await quoteService.createQuote(parseResult.data);
    res.status(201).json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
}

export async function updateQuoteController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = updateQuoteSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        400
      );
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const quote = await quoteService.updateQuote(id, parseResult.data);
    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuoteController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await quoteService.deleteQuote(id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}
