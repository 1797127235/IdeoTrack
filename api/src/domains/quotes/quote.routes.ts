import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getDailyQuoteController } from './quote.controller.js';

const router = Router();

router.get('/daily', authenticate, getDailyQuoteController);

export default router;
