import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImage, verifySize } from '../middleware/upload.js';
import { updateProfileSchema } from '../utils/validators.js';

export const userRoutes = Router();

userRoutes.use(requireAuth);

userRoutes.get('/search', ctrl.searchUsers);
userRoutes.get('/suggested', ctrl.suggestedUsers);
userRoutes.patch('/me', validate(updateProfileSchema), ctrl.updateMe);
userRoutes.post('/me/avatar', uploadImage, verifySize, ctrl.uploadAvatar);
userRoutes.get('/me/friends', ctrl.listFriends);
userRoutes.delete('/me/friends/:userId', ctrl.unfriend);

// Last: a bare segment must not shadow the /me and /search routes above.
userRoutes.get('/:username', ctrl.getProfile);
