import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';
import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';
import { JwtPayload } from '../utils/jwt';

// Define AuthRequest interface
interface AuthRequest extends Request {
  user?: JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
      throw AppError.InternalError('JWT secret is not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true
      }
    });

    if (!user) {
      throw AppError.AuthenticationError('User no longer exists');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role,
      businessId: user.businessId
    };

    logger.info('User authenticated:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(AppError.AuthenticationError('Invalid token'));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(AppError.AuthenticationError('Token expired'));
      return;
    }
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.AuthenticationError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt:', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method
      });
      next(AppError.AuthorizationError('Insufficient permissions'));
      return;
    }

    next();
  };
};

export const validateBusinessAccess = (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw AppError.AuthenticationError('User not authenticated');
    }

    const requestedBusinessId = req.params.businessId;
    if (!requestedBusinessId) {
      throw AppError.ValidationError('Business ID is required');
    }

    if (req.user.businessId !== requestedBusinessId) {
      throw AppError.AuthorizationError('You do not have access to this business');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Update the analytics tracking to include businessId
export const trackAnalytics = async (req: AuthRequest, data: Record<string, unknown>) => {
  try {
    if (!req.user?.businessId) {
      throw AppError.ValidationError('Business ID is required for analytics');
    }

    const analytics = await prisma.analytics.create({
      data: {
        businessId: req.user.businessId,
        date: new Date(),
        metrics: data as Prisma.InputJsonValue,
        aiInsights: Prisma.JsonNull
      }
    });

    return analytics;
  } catch (error) {
    logger.error('Error tracking analytics:', error);
    throw error;
  }
}; 