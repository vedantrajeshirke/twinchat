import { Router } from 'express';
import { interestRoutes } from './interest.routes.js';
import { authRoutes } from './auth.routes.js';
import { userRoutes } from './user.routes.js';
import { connectionRoutes } from './connection.routes.js';
import { groupRoutes } from './group.routes.js';

export const apiRouter = Router();

apiRouter.use('/interests', interestRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/requests', connectionRoutes);
apiRouter.use('/groups', groupRoutes);
