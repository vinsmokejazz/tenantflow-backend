import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';
import { prisma } from '../config/prisma';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config';
import { Prisma } from '@prisma/client';

// Initialize Supabase client with admin privileges
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

    console.log('Authentication attempt:', {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!authHeader,
      authHeaderStartsWithBearer: authHeader?.startsWith('Bearer '),
      tokenLength: authHeader?.split(' ')[1]?.length || 0
    });

    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    console.log('Supabase token verification:', {
      hasUser: !!user,
      userEmail: user?.email,
      error: error?.message
    });

    if (error || !user) {
      logger.warn('Invalid token provided:', { error: error?.message });
      throw AppError.AuthenticationError('Invalid token');
    }

    // Verify user exists in our database
    let dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true
      }
    });

    // If user doesn't exist in our database but exists in Supabase, create them
    if (!dbUser) {
      logger.info('User exists in Supabase but not in local database, creating...', { 
        supabaseId: user.id,
        email: user.email 
      });

      // Create a default business for the user
      const business = await prisma.business.create({
        data: {
          name: `${user.email?.split('@')[0]}'s Business`,
        },
      });

      // Create user in our database
      dbUser = await prisma.user.create({
        data: {
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: user.user_metadata?.role || 'admin',
          supabase_id: user.id,
          businessId: business.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          businessId: true
        }
      });

      // Update Supabase user metadata with business ID
      try {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            businessId: business.id,
            role: dbUser.role
          }
        });
        logger.info('Updated Supabase user metadata with business ID');
      } catch (updateError) {
        logger.warn('Failed to update Supabase user metadata:', updateError);
      }

      logger.info('User created in local database:', { 
        userId: dbUser.id,
        email: dbUser.email,
        businessId: business.id 
      });
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
    logger.error('Authentication error:', error);
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

    logger.info('Business access validation:', {
      requestedBusinessId,
      userBusinessId: req.user.businessId,
      match: req.user.businessId === requestedBusinessId
    });

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