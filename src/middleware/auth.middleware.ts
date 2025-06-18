import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/error';
import { config } from '../config/config';
import { logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    businessId: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError(401, 'No token provided');
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      throw new AppError(401, 'Invalid token');
    }

    // Add user to request
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'User not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action'));
    }

    next();
  };
};

export const validateBusinessAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const requestedBusinessId = req.params.businessId;
    if (!requestedBusinessId) {
      throw new AppError(400, 'Business ID is required');
    }

    if (req.user.businessId !== requestedBusinessId) {
      throw new AppError(403, 'You do not have access to this business');
    }

    next();
  } catch (error) {
    next(error);
  }
}; 