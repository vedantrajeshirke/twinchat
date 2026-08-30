import { Router } from 'express';
import * as ctrl from '../controllers/group.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage, verifySize } from '../middleware/upload.js';

export const groupRoutes = Router();

groupRoutes.use(requireAuth);

groupRoutes.get('/search', ctrl.searchGroups);
groupRoutes.get('/suggested', ctrl.suggestedGroups);
groupRoutes.get('/mine', ctrl.myGroups);
groupRoutes.post('/', uploadImage, verifySize, ctrl.createGroup);
groupRoutes.get('/:id', ctrl.getGroup);
groupRoutes.patch('/:id', uploadImage, verifySize, ctrl.updateGroup);
groupRoutes.post('/:id/join', ctrl.joinGroup);
groupRoutes.post('/:id/leave', ctrl.leaveGroup);
groupRoutes.delete('/:id', ctrl.deleteGroup);
