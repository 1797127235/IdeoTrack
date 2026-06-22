import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import * as quoteService from './quote.service.js';
import { createQuoteSchema, updateQuoteSchema } from './quote.schema.js';

export async function getDailyQuoteController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
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
      throw new AppError('VALIDATION_ERROR', '请求参数无效', 400);
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
      throw new AppError('VALIDATION_ERROR', '请求参数无效', 400);
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
