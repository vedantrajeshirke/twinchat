import { Router } from 'express';
import * as ctrl from '../controllers/connection.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const connectionRoutes = Router();

connectionRoutes.use(requireAuth);

connectionRoutes.get('/', ctrl.listRequests);
connectionRoutes.post('/', ctrl.sendRequest);
connectionRoutes.patch('/:id/accept', ctrl.acceptRequest);
connectionRoutes.patch('/:id/decline', ctrl.declineRequest);
connectionRoutes.delete('/:id', ctrl.cancelRequest);
