import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  uploadCoverController,
  serveCoverController,
  uploadCoverMiddleware,
  uploadAttachmentController,
  serveAttachmentController,
  uploadAttachmentMiddleware,
} from './upload.controller.js';

const router = Router();

// 上传任务/模板封面图（管理员/辅导员）
router.post('/cover', authenticate, requireRoles('admin', 'counselor'), uploadCoverMiddleware, uploadCoverController);

// 公开读取封面图（小程序 <image> 不带 JWT）
router.get('/cover', serveCoverController);

// 上传通用附件（管理员/辅导员）
router.post('/attachment', authenticate, requireRoles('admin', 'counselor'), uploadAttachmentMiddleware, uploadAttachmentController);

// 读取附件（公开，任务/模板中的附件学生也可查看）
router.get('/attachment', serveAttachmentController);

export default router;
