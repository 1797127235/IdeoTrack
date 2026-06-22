import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './domains/auth/auth.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { config } from './config/index.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use(errorHandler);

if (config.nodeEnv !== 'test') {
  app.listen(config.port, () => {
    console.log(`API server running on port ${config.port}`);
  });
}

export default app;
