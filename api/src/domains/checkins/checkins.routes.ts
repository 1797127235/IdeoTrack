import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { createCheckIn } from './checkins.controller.js';

const router = Router();

router.post('/', authenticate, requireRoles('student'), createCheckIn);

export default router;
