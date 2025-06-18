import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';
import { prisma } from '../config/prisma';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config';
import { Prisma } from '@prisma/client';

// Initialize Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

// Define AuthRequest interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    businessId: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        businessId: string;
      };
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

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw AppError.AuthenticationError('Invalid token');
    }

    // Verify user still exists in our database
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true
      }
    });

    if (!dbUser) {
      throw AppError.AuthenticationError('User no longer exists');
    }

    // Attach user to request
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      businessId: dbUser.businessId
    };

    logger.info('User authenticated:', {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      businessId: dbUser.businessId
    });

    next();
  } catch (error) {
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