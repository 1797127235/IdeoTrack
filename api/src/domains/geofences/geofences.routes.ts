import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  listGeofencesController,
  createGeofenceController,
  updateGeofenceController,
  deleteGeofenceController,
} from './geofences.controller.js';

const router = Router();

router.use(authenticate, requireRoles('admin'));

router.get('/', listGeofencesController);
router.post('/', createGeofenceController);
router.put('/:id', updateGeofenceController);
router.delete('/:id', deleteGeofenceController);

export default router;
