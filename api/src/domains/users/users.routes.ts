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
router.post('/batch-import', batchImportUsersController);
router.put('/:id', updateUserController);
router.delete('/:id', deleteUserController);

// Counselor class assignments
router.get('/counselors', listCounselorsController);
router.get('/:id/managed-classes', getManagedClassesController);
router.put('/:id/managed-classes', setManagedClassesController);

export default router;
