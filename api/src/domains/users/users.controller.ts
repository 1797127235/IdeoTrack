import type { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service.js';
import { AppError } from '../../middleware/error-handler.js';
import type { UserRole } from './users.types.js';

// ===== Colleges =====

export async function listCollegesController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.listColleges();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createCollegeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.createCollege(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateCollegeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.updateCollege(req.params.id as string, req.body);
    if (!data) {
      next(new AppError('COLLEGE_NOT_FOUND', '学院不存在', 404));
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteCollegeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ok = await usersService.deleteCollege(req.params.id as string);
    if (!ok) {
      next(new AppError('COLLEGE_NOT_FOUND', '学院不存在', 404));
      return;
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
}

// ===== Classes =====

export async function listClassesController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.listClasses();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createClassController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.createClass(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateClassController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.updateClass(req.params.id as string, req.body);
    if (!data) {
      next(new AppError('CLASS_NOT_FOUND', '班级不存在', 404));
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteClassController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ok = await usersService.deleteClass(req.params.id as string);
    if (!ok) {
      next(new AppError('CLASS_NOT_FOUND', '班级不存在', 404));
      return;
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
}

// ===== Users =====

export async function listUsersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters: { keyword?: string; role?: UserRole; classId?: string; collegeId?: string; isEnabled?: boolean } = {};

    if (typeof req.query.keyword === 'string' && req.query.keyword.trim()) {
      filters.keyword = req.query.keyword.trim();
    }
    if (req.query.role === 'student' || req.query.role === 'counselor' || req.query.role === 'admin') {
      filters.role = req.query.role;
    }
    if (typeof req.query.class_id === 'string' && req.query.class_id) {
      filters.classId = req.query.class_id;
    }
    if (typeof req.query.college_id === 'string' && req.query.college_id) {
      filters.collegeId = req.query.college_id;
    }
    if (req.query.is_enabled === 'true') {
      filters.isEnabled = true;
    } else if (req.query.is_enabled === 'false') {
      filters.isEnabled = false;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const data = await usersService.listUsers(filters, page, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.createUser(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.updateUser(req.params.id as string, req.body);
    if (!data) {
      next(new AppError('USER_NOT_FOUND', '用户不存在', 404));
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ok = await usersService.deleteUser(req.params.id as string);
    if (!ok) {
      next(new AppError('USER_NOT_FOUND', '用户不存在', 404));
      return;
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
}

export async function batchImportUsersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.batchImportUsers(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listCounselorsController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.listCounselors();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getManagedClassesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await usersService.getManagedClasses(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function setManagedClassesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!req.body || !Array.isArray(req.body.classIds)) {
      throw new AppError('VALIDATION_ERROR', 'classIds 必须是数组', 400);
    }
    const data = await usersService.setManagedClasses(id, { classIds: req.body.classIds });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
