import { z } from 'zod';

export const registerUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  role: z.enum(['admin', 'user']).optional()
});

export const loginUserSchema = z.object({
  email: z.string()
    .email('Invalid email address'),
  password: z.string()
    .min(1, 'Password is required')
});