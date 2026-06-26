import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as usersService from './users.service.js';
import { createFaceImportJob, getFaceImportJob } from './face-import-job.js';
import { AppError } from '../../middleware/error-handler.js';
import { isFaceServiceConfigured } from '../../lib/face-client.js';
import type { UserRole } from './users.types.js';

// 人脸图片上传：内存存储（不落盘，交给 service 处理），限 5MB，仅图片
const faceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpe?g|png|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 jpg/png/webp 图片'));
    }
  },
});

// 从 multipart 文件名解析扩展名
function getExt(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : 'jpg';
}

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

// ===== Face =====

/** 查询某用户注册照信息。 */
export async function getUserFaceController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await usersService.getUserFace(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/** 单张补录注册照（multipart: photo 字段）。 */
export const uploadUserFaceController = [
  faceUpload.single('photo'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!req.file) {
        throw new AppError('VALIDATION_ERROR', '请上传照片', 400);
      }
      const ext = getExt(req.file.originalname);
      const data = await usersService.uploadUserFace(id, req.file.buffer, ext);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
];

/** 删除注册照。 */
export async function deleteUserFaceController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const ok = await usersService.deleteUserFace(id);
    if (!ok) {
      next(new AppError('FACE_NOT_FOUND', '该用户未上传注册照', 404));
      return;
    }
    res.json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}

/**
 * 批量导入注册照（multipart: file 字段，zip 包）。
 * zip 内文件名用学号（如 2024001.jpg），按学号匹配用户。
 * 创建异步 job 立即返回 jobId，前端轮询进度。
 */
export const batchImportFacesController = [
  faceUpload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError('VALIDATION_ERROR', '请上传 zip 文件', 400);
      }

      // 动态加载 yauzl（仅批量导入用到，避免常驻依赖）
      const { parseZipFaces } = await import('./face-zip.js');
      const entries = await parseZipFaces(req.file.buffer);

      const jobId = createFaceImportJob(entries);
      res.status(202).json({ success: true, data: { jobId } });
    } catch (err) {
      next(err);
    }
  },
];

/** 查询批量注册照导入任务进度（轮询用）。 */
export async function getFaceImportJobController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
    const job = getFaceImportJob(jobId);
    if (!job) {
      next(new AppError('FACE_JOB_NOT_FOUND', '导入任务不存在或已过期', 404));
      return;
    }
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
}

/** 返回某用户的注册照图片（流式，仅管理员可见）。无注册照返回 404。 */
export async function getUserFacePhotoController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await usersService.getUserFacePhoto(id);
    if (!data) {
      next(new AppError('FACE_NOT_FOUND', '该用户未上传注册照', 404));
      return;
    }
    // 由扩展名推断 content-type；默认 jpeg
    const ext = data.photoPath.toLowerCase();
    const type = ext.endsWith('.png')
      ? 'image/png'
      : ext.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'private, no-cache');
    res.send(data.buffer);
  } catch (err) {
    next(err);
  }
}
