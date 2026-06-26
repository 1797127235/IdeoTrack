import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { config } from '../../config/index.js';
import { query } from '../../lib/db.js';
import { auditLog } from '../../lib/audit.js';
import { getServicesHealth, getRuntimeInfo, getErrorStats } from './admin.service.js';
import { getSystemResources } from './resources.service.js';
import { createDatabaseBackup, cleanupExports, cleanupTempFiles } from './tools.service.js';

const router = Router();

router.use(authenticate, requireRoles('admin'));

/**
 * 获取服务器应用日志（仅管理员）。
 * 生产环境日志默认写入 LOG_FILE_DIR/app.log，本地开发同理。
 */
router.get('/logs', (_req, res, next) => {
  try {
    const logDir = config.logFileDir || path.resolve(process.cwd(), 'logs');
    const logPath = path.join(logDir, 'app.log');

    if (!fs.existsSync(logPath)) {
      res.json({ success: true, data: [] });
      return;
    }

    const stats = fs.statSync(logPath);
    const maxBytes = 256 * 1024; // 最多读最后 256KB
    const start = Math.max(0, stats.size - maxBytes);
    const fd = fs.openSync(logPath, 'r');
    const buffer = Buffer.alloc(stats.size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    fs.closeSync(fd);

    // 如果不是从文件头开始，去掉第一行（可能不完整）
    let raw = buffer.toString('utf-8');
    if (start > 0) {
      const firstNewline = raw.indexOf('\n');
      if (firstNewline !== -1) {
        raw = raw.slice(firstNewline + 1);
      }
    }

    const lines = raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .slice(-200)
      .reverse();

    res.json({ success: true, data: lines });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取运维大盘数据：服务健康、运行时信息、异常聚合。
 */
router.get('/status', async (_req, res, next) => {
  try {
    const [services, runtime, errors] = await Promise.all([
      getServicesHealth(),
      Promise.resolve(getRuntimeInfo()),
      Promise.resolve(getErrorStats()),
    ]);

    res.json({
      success: true,
      data: {
        services,
        runtime,
        errors,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取系统资源使用情况。
 */
router.get('/resources', async (_req, res, next) => {
  try {
    const resources = await getSystemResources();
    res.json({ success: true, data: resources });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取审计日志（安全审计）。
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const category = req.query.category as string | undefined;
    const action = req.query.action as string | undefined;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (action) {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);
    const sql = `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length}`;

    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * 运维工具：数据库备份。
 */
router.post('/backup', (req, res, next) => {
  try {
    const result = createDatabaseBackup();
    void auditLog({
      action: 'backup',
      category: 'system',
      actorId: req.user?.userId,
      actorRole: req.user?.role,
      targetType: 'system',
      details: { fileName: result.fileName, sizeBytes: result.sizeBytes },
      ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * 运维工具：清理过期导出文件。
 */
router.post('/cleanup/exports', (req, res, next) => {
  try {
    const result = cleanupExports();
    void auditLog({
      action: 'cleanup_exports',
      category: 'system',
      actorId: req.user?.userId,
      actorRole: req.user?.role,
      targetType: 'system',
      details: { deletedCount: result.deletedFiles.length, freedBytes: result.freedBytes },
      ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * 运维工具：清理临时文件。
 */
router.post('/cleanup/temp', (req, res, next) => {
  try {
    const result = cleanupTempFiles();
    void auditLog({
      action: 'cleanup_temp',
      category: 'system',
      actorId: req.user?.userId,
      actorRole: req.user?.role,
      targetType: 'system',
      details: { deletedCount: result.deletedFiles.length, freedBytes: result.freedBytes },
      ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
