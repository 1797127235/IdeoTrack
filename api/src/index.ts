import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './domains/auth/auth.routes.js';
import quoteRoutes from './domains/quotes/quote.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { config } from './config/index.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl === '*' ? true : config.clientUrl.split(','),
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/quotes', quoteRoutes);

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
    console.log(`API server running on port ${config.port}`);
  });
}

export default app;
