import type { Request, Response, NextFunction } from 'express';
import * as quoteService from './quote.service.js';

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
