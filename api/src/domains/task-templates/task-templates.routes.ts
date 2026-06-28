import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  listTaskTemplatesController,
  getTaskTemplateByIdController,
  createTaskTemplateController,
  updateTaskTemplateController,
  delistTaskTemplateController,
  deleteTaskTemplateController,
} from './task-templates.controller.js';

const router = Router();

// 管理员：任务模板库 CRUD
router.get('/', authenticate, requireRoles('admin'), listTaskTemplatesController);
router.post('/', authenticate, requireRoles('admin'), createTaskTemplateController);
router.get('/:id', authenticate, requireRoles('admin', 'counselor'), getTaskTemplateByIdController);
router.put('/:id', authenticate, requireRoles('admin'), updateTaskTemplateController);
router.patch('/:id/delist', authenticate, requireRoles('admin'), delistTaskTemplateController);
router.delete('/:id', authenticate, requireRoles('admin'), deleteTaskTemplateController);

export default router;
