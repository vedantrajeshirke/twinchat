import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { hasCloudinary } from './config/cloudinary.js';
import { usingMemoryDB } from './config/db.js';
import { apiRouter } from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    cors({
      origin: env.clientUrl.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!env.isProd) app.use(morgan('dev'));

  // Local upload fallback when Cloudinary keys are absent.
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      service: 'twinchat-api',
      env: env.nodeEnv,
      storage: hasCloudinary ? 'cloudinary' : 'local-disk',
      database: usingMemoryDB() ? 'in-memory' : 'mongodb',
      time: new Date().toISOString(),
    });
  });

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
