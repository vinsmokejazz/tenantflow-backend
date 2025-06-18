import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    logger.warn('Unauthorized admin access attempt:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      path: req.path,
      method: req.method
    });
    next(AppError.AuthorizationError('Admin access required'));
    return;
  }
  next();
};

export const requireStaff = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'staff') {
    logger.warn('Unauthorized staff access attempt:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      path: req.path,
      method: req.method
    });
    next(AppError.AuthorizationError('Staff access required'));
    return;
  }
  next();
}; 