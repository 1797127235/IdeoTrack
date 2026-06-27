import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  listLearningResourcesController,
  getLearningResourceByIdController,
  createLearningResourceController,
  updateLearningResourceController,
  updateLearningResourceStatusController,
  deleteLearningResourceController,
  serveCoverController,
  uploadCoverMiddleware,
} from './learning-resources.controller.js';

const router = Router();

// 公开读取（已登录用户）
router.get('/', authenticate, listLearningResourcesController);
router.get('/:id', authenticate, getLearningResourceByIdController);

// 封面图公开访问：小程序 <image> 组件请求不带 JWT
router.get('/:id/cover', serveCoverController);

// 管理员维护
router.post('/', authenticate, requireRoles('admin'), uploadCoverMiddleware, createLearningResourceController);
router.patch('/:id/status', authenticate, requireRoles('admin'), updateLearningResourceStatusController);
router.delete('/:id', authenticate, requireRoles('admin'), deleteLearningResourceController);
router.put('/:id', authenticate, requireRoles('admin'), uploadCoverMiddleware, updateLearningResourceController);

export default router;
