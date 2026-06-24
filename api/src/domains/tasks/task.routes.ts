import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  createTaskController,
  dispatchTaskController,
  listTasksController,
  listTaskPoolController,
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

// 管理员端：创建任务到任务池或直接发布
router.post('/', authenticate, requireRoles('admin'), createTaskController);

// 辅导员端：从任务池派发任务到班级
router.post('/dispatch', authenticate, requireRoles('counselor'), dispatchTaskController);

// 辅导员端：查询任务池
router.get('/pool', authenticate, requireRoles('counselor'), listTaskPoolController);

// 管理员/辅导员端：任务管理
router.get('/', authenticate, requireRoles('admin', 'counselor'), listTasksController);
// P2: 获取单个任务详情
router.get('/:id', authenticate, requireRoles('admin', 'counselor'), getTaskByIdController);
router.put('/:id', authenticate, requireRoles('admin', 'counselor'), updateTaskController);
// P1: 独立下架端点，admin 可下架任意任务，发布人可下架自己的
router.patch('/:id/delist', authenticate, requireRoles('admin', 'counselor'), delistTaskController);
// AC-5: 任务统计端点
router.get('/:id/stats', authenticate, requireRoles('admin', 'counselor'), getTaskStatsController);

export default router;
