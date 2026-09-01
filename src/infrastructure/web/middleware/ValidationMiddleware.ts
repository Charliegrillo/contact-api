import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export class ValidationMiddleware {
  static validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        schema.parse(req.body);
        next();
      } catch (error: any) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      }
    };
  }
}