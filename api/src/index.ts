import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './domains/auth/auth.routes.js';
import quoteRoutes from './domains/quotes/quote.routes.js';
import taskRoutes from './domains/tasks/task.routes.js';
import checkinRoutes from './domains/checkins/checkins.routes.js';
import reviewRoutes from './domains/reviews/reviews.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { config } from './config/index.js';
import { logStartup } from './lib/logger.js';

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
