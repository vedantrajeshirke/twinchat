import { Router } from 'express';
import * as ctrl from '../controllers/conversation.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadAttachment, verifySize } from '../middleware/upload.js';

export const conversationRoutes = Router();

conversationRoutes.use(requireAuth);

conversationRoutes.get('/', ctrl.listConversations);
conversationRoutes.post('/direct', ctrl.openDirect);
conversationRoutes.get('/:id/messages', ctrl.listMessages);
conversationRoutes.post('/:id/messages', uploadAttachment, verifySize, ctrl.sendMessage);
conversationRoutes.post('/:id/read', ctrl.markRead);
