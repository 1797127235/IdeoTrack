import type { Request, Response, NextFunction } from 'express';
import * as geofenceService from './geofences.service.js';
import { AppError } from '../../middleware/error-handler.js';

export async function listGeofencesController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await geofenceService.listGeofences();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createGeofenceController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await geofenceService.createGeofence(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateGeofenceController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await geofenceService.updateGeofence(req.params.id as string, req.body);
    if (!data) {
      next(new AppError('GEOFENCE_NOT_FOUND', '围栏不存在', 404));
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteGeofenceController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ok = await geofenceService.deleteGeofence(req.params.id as string);
    if (!ok) {
      next(new AppError('GEOFENCE_NOT_FOUND', '围栏不存在', 404));
      return;
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
}
