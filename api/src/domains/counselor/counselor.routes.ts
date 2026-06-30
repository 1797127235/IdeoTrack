import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  exportCheckInsController,
  exportReportController,
  exportTaskCheckInsController,
  getCheckInTrendController,
  getClassDetailController,
  getClassRankingController,
  getClassRemindersController,
  getClassStudentsController,
  getCounselorClassesController,
  getDashboardController,
  getHighRiskStudentsController,
  getTaskCheckInDetailController,
  getTaskClassesController,
  sendRemindersController,
} from './counselor.controller.js';

const router = Router();

router.get('/dashboard', authenticate, requireRoles('counselor'), getDashboardController);
router.post('/reports/export', authenticate, requireRoles('counselor'), exportReportController);
router.get('/checkin-trend', authenticate, requireRoles('counselor'), getCheckInTrendController);
router.get('/classes', authenticate, requireRoles('counselor'), getCounselorClassesController);
router.get('/classes/:id/detail', authenticate, requireRoles('counselor'), getClassDetailController);
router.get('/high-risk-students', authenticate, requireRoles('counselor'), getHighRiskStudentsController);
router.get('/ranking', authenticate, requireRoles('counselor'), getClassRankingController);
router.get('/tasks/:id/classes', authenticate, requireRoles('counselor'), getTaskClassesController);
router.get('/tasks/:id/checkins', authenticate, requireRoles('counselor'), getTaskCheckInDetailController);
router.get('/tasks/:id/checkins/export', authenticate, requireRoles('counselor'), exportTaskCheckInsController);
router.get('/classes/:id/students', authenticate, requireRoles('counselor'), getClassStudentsController);
router.post(
  '/classes/:id/reminders',
  authenticate,
  requireRoles('counselor'),
  sendRemindersController
);
router.get(
  '/classes/:id/reminders',
  authenticate,
  requireRoles('counselor'),
  getClassRemindersController
);
router.post('/exports', authenticate, requireRoles('counselor'), exportCheckInsController);

export default router;
