import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  getDashboardStatsController,
  getMultiDimStatsController,
  exportReportController,
} from './reports.controller.js';

const router = Router();

router.use(authenticate, requireRoles('admin'));

router.get('/dashboard', getDashboardStatsController);
router.get('/stats', getMultiDimStatsController);
router.post('/exports', exportReportController);

export default router;
