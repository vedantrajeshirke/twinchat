import { Router } from 'express';
import { interestRoutes } from './interest.routes.js';
import { authRoutes } from './auth.routes.js';

export const apiRouter = Router();

apiRouter.use('/interests', interestRoutes);
apiRouter.use('/auth', authRoutes);
