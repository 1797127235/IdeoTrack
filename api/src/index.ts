import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './domains/auth/auth.routes.js';
import quoteRoutes from './domains/quotes/quote.routes.js';
import taskRoutes from './domains/tasks/task.routes.js';
import checkinRoutes from './domains/checkins/checkins.routes.js';
import reviewRoutes from './domains/reviews/reviews.routes.js';
import counselorRoutes from './domains/counselor/counselor.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { config } from './config/index.js';
import { logStartup } from './lib/logger.js';
import { verifyDownloadToken, resolveFilePath, deleteExportFile } from './lib/storage.js';
import { promises as fs } from 'node:fs';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl === '*' ? true : config.clientUrl.split(','),
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));

// 请求日志：记录每个请求的方法/路径/状态码/耗时/用户
app.use(requestLogger);

app.use('/api/auth', authRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/counselor', counselorRoutes);

// 导出文件下载端点（AD-7：签名 token 自校验，不经过 JWT authenticate）
app.get('/api/exports/:token', async (req, res, next) => {
  try {
    const payload = verifyDownloadToken(req.params.token);
    if (!payload) {
      res.status(410).json({
        success: false,
        error: { code: 'EXPORT_LINK_EXPIRED', message: '下载链接已过期或无效，请重新导出' },
      });
      return;
    }

    const filePath = resolveFilePath(payload.fileId);
    try {
      await fs.access(filePath);
    } catch {
      res.status(410).json({
        success: false,
        error: { code: 'EXPORT_LINK_EXPIRED', message: '下载链接已过期或无效，请重新导出' },
      });
      return;
    }

    res.download(filePath, '打卡记录.xlsx', async () => {
      // 下载完成后清理临时文件（best-effort）
      await deleteExportFile(payload.fileId);
    });
  } catch (err) {
    next(err);
  }
});

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: '请求的资源不存在' },
  });
});

app.use(errorHandler);

if (config.nodeEnv !== 'test') {
  app.listen(config.port, () => {
    logStartup(config.port);
  });
}

export default app;
