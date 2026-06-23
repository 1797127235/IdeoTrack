import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { getClassStudentsController, getDashboardController } from './counselor.controller.js';

const router = Router();

router.get('/dashboard', authenticate, requireRoles('counselor'), getDashboardController);
router.get('/classes/:id/students', authenticate, requireRoles('counselor'), getClassStudentsController);

export default router;
