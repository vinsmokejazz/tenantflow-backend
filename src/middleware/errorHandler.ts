import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';

interface ErrorResponse {
  status: 'fail' | 'error';
  message: string;
  errors?: Array<{
    path?: string;
    message: string;
    code?: string;
  }>;
  stack?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response): void => {
  let errorResponse: ErrorResponse = {
    status: 'error',
    message: 'Internal server error'
  };

  // Handle AppError instances
  if (err instanceof AppError) {
    errorResponse = {
      status: err.statusCode === 400 ? 'fail' : 'error',
      message: err.message,
      errors: err.details ? [{
        message: err.message,
        ...err.details
      }] : undefined
    };
  }
  // Handle Zod validation errors
  else if (err instanceof ZodError) {
    errorResponse = {
      status: 'fail',
      message: 'Validation failed',
      errors: err.errors.map(error => ({
        path: error.path.join('.'),
        message: error.message,
        code: error.code
      }))
    };
  }
  // Handle Prisma errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        errorResponse = {
          status: 'fail',
          message: 'Unique constraint violation',
          errors: [{
            path: err.meta?.target as string,
            message: 'A record with this value already exists'
          }]
        };
        break;
      case 'P2025':
        errorResponse = {
          status: 'fail',
          message: 'Record not found',
          errors: [{
            message: 'The requested record does not exist'
          }]
        };
        break;
      default:
        errorResponse = {
          status: 'error',
          message: 'Database operation failed',
          errors: [{
            message: err.message
          }]
        };
    }
  }
  // Handle Prisma validation errors
  else if (err instanceof Prisma.PrismaClientValidationError) {
    errorResponse = {
      status: 'fail',
      message: 'Validation failed',
      errors: [{
        message: err.message
      }]
    };
  }

  // Log the error with appropriate level
  if (errorResponse.status === 'fail') {
    logger.warn('Request failed:', {
      path: req.path,
      method: req.method,
      error: errorResponse
    });
  } else {
    logger.error('Server error:', {
      path: req.path,
      method: req.method,
      error: errorResponse,
      stack: err.stack
    });
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(errorResponse.status === 'fail' ? 400 : 500).json(errorResponse);
}; 

export { AppError };
