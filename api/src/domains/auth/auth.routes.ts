import { Router } from 'express';
import {
  loginController,
  changePasswordController,
  meController,
  wechatLoginController,
  wechatBindController,
} from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';

const router = Router();

router.post('/login', loginController);
router.post('/wechat/login', wechatLoginController);
router.post('/wechat/bind', wechatBindController);
router.post('/change-password', authenticate, changePasswordController);
router.get('/me', authenticate, meController);

// Placeholder role-restricted routes for RBAC validation
router.get(
  '/admin-only',
  authenticate,
  requireRoles('admin'),
  (_req, res) => {
    res.json({ success: true, data: { message: 'admin-only resource' } });
  }
);

export default router;
