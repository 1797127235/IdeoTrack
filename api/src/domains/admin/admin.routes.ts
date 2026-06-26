import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { authenticate } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { config } from '../../config/index.js';

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

export default router;
