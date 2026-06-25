import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  getClassLeaderboardController,
  getCollegeLeaderboardController,
  getSchoolLeaderboardController,
} from './leaderboard.controller.js';

const router = Router();

router.get('/class', authenticate, requireRoles('student'), getClassLeaderboardController);
router.get('/college', authenticate, requireRoles('student'), getCollegeLeaderboardController);
router.get('/school', authenticate, requireRoles('student'), getSchoolLeaderboardController);

export default router;
