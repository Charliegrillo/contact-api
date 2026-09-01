import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .email('Invalid email address'),
  phone: z.string()
    .min(7, 'Phone must be at least 7 characters')
    .max(20, 'Phone must be less than 20 characters')
    .regex(/^[+]?[\d\s-()]+$/, 'Invalid phone number'),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be less than 2000 characters'),
  budget: z.number()
    .min(0, 'Budget must be positive')
    .max(1000000000, 'Budget too large'),
  company: z.string()
    .max(200, 'Company name too long')
    .optional()
});