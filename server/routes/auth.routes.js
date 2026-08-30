import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { signupSchema, loginSchema, changePasswordSchema } from '../utils/validators.js';
import { env } from '../config/env.js';

export const authRoutes = Router();

// Rate-limit credential endpoints (PROJECT_PLAN §9). Disabled in dev so
// iterating on the signup form doesn't lock you out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
  skip: () => !env.isProd,
});

authRoutes.post('/signup', authLimiter, validate(signupSchema), ctrl.signup);
authRoutes.post('/login', authLimiter, validate(loginSchema), ctrl.login);
authRoutes.get('/check-username', ctrl.checkUsername);
authRoutes.get('/me', requireAuth, ctrl.me);
authRoutes.patch('/password', requireAuth, validate(changePasswordSchema), ctrl.changePassword);
