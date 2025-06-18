export type ErrorType = 'VALIDATION' | 'AUTHENTICATION' | 'AUTHORIZATION' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';

export interface ErrorDetails {
  type: ErrorType;
  code: string;
  message: string;
  details?: Record<string, any>;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly status: 'fail' | 'error';
  readonly isOperational: boolean;
  readonly type: ErrorType;
  readonly code: string;
  readonly details?: Record<string, any>;

  constructor(statusCode: number, message: string, type: ErrorType = 'INTERNAL', details?: Record<string, any>) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.type = type;
    this.code = this.generateErrorCode(type);
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  private generateErrorCode(type: ErrorType): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${type.slice(0, 3)}-${timestamp}-${random}`;
  }

  static ValidationError(message: string, details?: Record<string, any>): AppError {
    return new AppError(400, message, 'VALIDATION', details);
  }

  static AuthenticationError(message: string = 'Authentication failed'): AppError {
    return new AppError(401, message, 'AUTHENTICATION');
  }

  static AuthorizationError(message: string = 'Not authorized'): AppError {
    return new AppError(403, message, 'AUTHORIZATION');
  }

  static NotFoundError(message: string = 'Resource not found'): AppError {
    return new AppError(404, message, 'NOT_FOUND');
  }

  static ConflictError(message: string, details?: Record<string, any>): AppError {
    return new AppError(409, message, 'CONFLICT', details);
  }

  static InternalError(message: string = 'Internal server error'): AppError {
    return new AppError(500, message, 'INTERNAL');
  }
} 