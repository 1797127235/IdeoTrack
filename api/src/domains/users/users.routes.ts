import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  listCollegesController,
  createCollegeController,
  updateCollegeController,
  deleteCollegeController,
  listClassesController,
  createClassController,
  updateClassController,
  deleteClassController,
  listUsersController,
  createUserController,
  updateUserController,
  deleteUserController,
  batchImportUsersController,
  listCounselorsController,
  getManagedClassesController,
  setManagedClassesController,
  getUserFaceController,
  uploadUserFaceController,
  deleteUserFaceController,
  getUserFacePhotoController,
  batchImportFacesController,
  getFaceImportJobController,
} from './users.controller.js';

const router = Router();

router.use(authenticate, requireRoles('admin'));

// Colleges
router.get('/colleges', listCollegesController);
router.post('/colleges', createCollegeController);
router.put('/colleges/:id', updateCollegeController);
router.delete('/colleges/:id', deleteCollegeController);

// Classes
router.get('/classes', listClassesController);
router.post('/classes', createClassController);
router.put('/classes/:id', updateClassController);
router.delete('/classes/:id', deleteClassController);

// Users
router.get('/', listUsersController);
router.post('/', createUserController);
// 批量注册照导入（multipart zip）——必须放在 /:id 之前，避免被参数路由吞掉
// POST 创建 job（202 + jobId），GET 查询进度（轮询）
router.post('/batch-face-import', batchImportFacesController);
router.get('/batch-face-import/:jobId', getFaceImportJobController);
router.post('/batch-import', batchImportUsersController);
router.put('/:id', updateUserController);
router.delete('/:id', deleteUserController);

// User face（注册照）
router.get('/:id/face', getUserFaceController);
router.post('/:id/face', uploadUserFaceController);
router.delete('/:id/face', deleteUserFaceController);
// 注册照图片预览（流式）——放在 /:id/face 之后，更具体的 /:id/face/photo 优先匹配
router.get('/:id/face/photo', getUserFacePhotoController);

// Counselor class assignments
router.get('/counselors', listCounselorsController);
router.get('/:id/managed-classes', getManagedClassesController);
router.put('/:id/managed-classes', setManagedClassesController);

export default router;
