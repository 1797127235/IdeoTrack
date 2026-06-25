import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  createCheckIn,
  getCheckInResultController,
  getStudentCalendarController,
  submitReflectionController,
  getStudyRecordsController,
} from './checkins.controller.js';

const router = Router();

router.post('/', authenticate, requireRoles('student'), createCheckIn);
router.post('/:id/reflection', authenticate, requireRoles('student'), submitReflectionController);
router.get('/:id/result', authenticate, requireRoles('student'), getCheckInResultController);
router.get('/calendar', authenticate, requireRoles('student'), getStudentCalendarController);
router.get('/study-records', authenticate, requireRoles('student'), getStudyRecordsController);

export default router;
