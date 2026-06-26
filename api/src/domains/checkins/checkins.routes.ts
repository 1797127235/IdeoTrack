import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  createCheckIn,
  checkinUpload,
  getCheckInResultController,
  getStudentCalendarController,
  submitReflectionController,
  getStudyRecordsController,
  reverseGeocodeController,
} from './checkins.controller.js';

const router = Router();

router.get('/reverse-geocode', authenticate, requireRoles('student'), reverseGeocodeController);
router.post('/', authenticate, requireRoles('student'), checkinUpload.single('photo'), createCheckIn);
router.post('/:id/reflection', authenticate, requireRoles('student'), submitReflectionController);
router.get('/:id/result', authenticate, requireRoles('student'), getCheckInResultController);
router.get('/calendar', authenticate, requireRoles('student'), getStudentCalendarController);
router.get('/study-records', authenticate, requireRoles('student'), getStudyRecordsController);

export default router;
