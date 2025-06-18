import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';

interface ValidationError {
  path: string;
  message: string;
  code: string;
}

interface ValidationResult {
  body?: Record<string, any>;
  query?: Record<string, any>;
  params?: Record<string, any>;
}

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as ValidationResult;

      // Update request with validated data
      if (result.body) req.body = result.body;
      if (result.query) req.query = result.query;
      if (result.params) req.params = result.params;

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationError[] = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        logger.warn('Validation error:', {
          path: req.path,
          method: req.method,
          errors: validationErrors,
        });

        res.status(400).json({
          status: 'fail',
          message: 'Validation failed',
          errors: validationErrors
        });
        return;
      }

      logger.error('Unexpected validation error:', error);
      next(AppError.InternalError('Error during request validation'));
    }
  };
}; 