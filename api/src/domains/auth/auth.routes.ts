import { Router } from 'express';
import { loginController, changePasswordController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.post('/login', loginController);
router.post('/change-password', authenticate, changePasswordController);

export default router;
