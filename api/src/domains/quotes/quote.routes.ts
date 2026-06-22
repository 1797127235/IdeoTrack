import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  getDailyQuoteController,
  listQuotesController,
  createQuoteController,
  updateQuoteController,
  deleteQuoteController,
} from './quote.controller.js';

const router = Router();

// 学生每日名言（任意已登录用户）
router.get('/daily', authenticate, getDailyQuoteController);

// 管理员名言库 CRUD
router.get('/', authenticate, requireRoles('admin'), listQuotesController);
router.post('/', authenticate, requireRoles('admin'), createQuoteController);
router.put('/:id', authenticate, requireRoles('admin'), updateQuoteController);
router.delete('/:id', authenticate, requireRoles('admin'), deleteQuoteController);

export default router;
