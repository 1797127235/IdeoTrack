import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  createCheckIn,
  getCheckInResultController,
  submitReflectionController,
} from './checkins.controller.js';

const router = Router();

router.post('/', authenticate, requireRoles('student'), createCheckIn);
router.post('/:id/reflection', authenticate, requireRoles('student'), submitReflectionController);
router.get('/:id/result', authenticate, requireRoles('student'), getCheckInResultController);

export default router;
