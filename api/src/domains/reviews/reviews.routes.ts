import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  listPendingReviewsController,
  getPendingReviewDetailController,
  reviewCheckInController,
} from './reviews.controller.js';

const router = Router();

router.get('/pending', authenticate, requireRoles('counselor'), listPendingReviewsController);
router.get('/pending/:id', authenticate, requireRoles('counselor'), getPendingReviewDetailController);
router.post('/:id/decision', authenticate, requireRoles('counselor'), reviewCheckInController);

export default router;
