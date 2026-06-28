import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  createTaskController,
  createTaskFromTemplateController,
  listTasksController,
  getTaskByIdController,
  updateTaskController,
  delistTaskController,
  getTaskStatsController,
  listMyTasksController,
  getMyTaskDetailController,
} from './task.controller.js';

const router = Router();

// 学生端：查看分配给自己的任务
router.get('/my', authenticate, requireRoles('student'), listMyTasksController);
router.get('/my/:id', authenticate, requireRoles('student'), getMyTaskDetailController);

// 管理员端：直接创建任务实例
router.post('/', authenticate, requireRoles('admin'), createTaskController);

// 管理员/辅导员：从任务模板发布任务实例
router.post('/from-template', authenticate, requireRoles('admin', 'counselor'), createTaskFromTemplateController);

// 管理员/辅导员端：任务实例管理
router.get('/', authenticate, requireRoles('admin', 'counselor'), listTasksController);
router.get('/:id', authenticate, requireRoles('admin', 'counselor'), getTaskByIdController);
router.put('/:id', authenticate, requireRoles('admin', 'counselor'), updateTaskController);
router.patch('/:id/delist', authenticate, requireRoles('admin', 'counselor'), delistTaskController);
router.get('/:id/stats', authenticate, requireRoles('admin', 'counselor'), getTaskStatsController);

export default router;
