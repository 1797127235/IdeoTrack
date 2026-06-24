import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  exportCheckInsController,
  getClassRemindersController,
  getClassStudentsController,
  getDashboardController,
  sendRemindersController,
} from './counselor.controller.js';

const router = Router();

router.get('/dashboard', authenticate, requireRoles('counselor'), getDashboardController);
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
