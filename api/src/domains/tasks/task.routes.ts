import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  createTaskController,
  listTasksController,
  updateTaskController,
  delistTaskController,
  listMyTasksController,
  getMyTaskDetailController,
} from './task.controller.js';

const router = Router();

// 学生端：查看分配给自己的任务
router.get('/my', authenticate, requireRoles('student'), listMyTasksController);
router.get('/my/:id', authenticate, requireRoles('student'), getMyTaskDetailController);

// 管理员/辅导员端：任务发布与管理
router.get('/', authenticate, requireRoles('admin', 'counselor'), listTasksController);
router.post('/', authenticate, requireRoles('admin', 'counselor'), createTaskController);
router.put('/:id', authenticate, requireRoles('admin', 'counselor'), updateTaskController);
// P1: 独立下架端点，admin 可下架任意任务，发布人可下架自己的
router.patch('/:id/delist', authenticate, requireRoles('admin', 'counselor'), delistTaskController);

export default router;
