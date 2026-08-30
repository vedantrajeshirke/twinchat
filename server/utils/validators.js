import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[a-zA-Z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(24, 'Username must be 24 characters or fewer')
  .regex(/^[a-z0-9_]+$/, 'Use only letters, numbers and underscores');

export const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(50),
    lastName: z.string().trim().min(1, 'Last name is required').max(50),
    username: usernameSchema,
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    password,
    confirmPassword: z.string(),
    interests: z.array(z.string().trim()).min(3, 'Pick at least 3 interests'),
    bio: z.string().trim().max(300).optional().default(''),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or username'),
  password: z.string().min(1, 'Enter your password'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  bio: z.string().trim().max(300).optional(),
  interests: z.array(z.string().trim()).min(3, 'Keep at least 3 interests').optional(),
  theme: z.string().trim().optional(),
  mode: z.enum(['light', 'dark']).optional(),
});
