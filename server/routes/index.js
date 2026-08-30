import { Router } from 'express';
import { interestRoutes } from './interest.routes.js';

export const apiRouter = Router();

apiRouter.use('/interests', interestRoutes);
