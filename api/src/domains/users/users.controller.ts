import type { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service.js';
import { AppError } from '../../middleware/error-handler.js';

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

export async function listUsersController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await usersService.listUsers();
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
