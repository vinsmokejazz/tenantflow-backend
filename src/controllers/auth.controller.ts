import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import { AppError } from '../utils/error';
import { prisma } from '../config/prisma';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const FREE_TIER_CLIENT_LIMIT = 10;

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    businessId: string;
  };
}

// Initialize Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Starting registration process');
    const { email, password, name, business_name } = req.body;

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw AppError.ConflictError('User with this email already exists');
    }

    logger.info('Attempting Supabase signup...');
    // Create user in Supabase
    const { data: { user }, error: supabaseError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (supabaseError || !user) {
      logger.error('Supabase signup failed:', supabaseError);
      throw AppError.ValidationError(supabaseError?.message || 'Failed to create user');
    }

    logger.info('Supabase user created:', { supabaseId: user.id });

    // Create business
    const business = await prisma.business.create({
      data: {
        name: business_name,
      },
    });
    logger.info('Business created:', { businessId: business.id });

    // Create user in our database
    const dbUser = await prisma.user.create({
      data: {
        email,
        name,
        role: 'admin',
        supabase_id: user.id,
        businessId: business.id,
      },
    });
    logger.info('Database user created:', { userId: dbUser.id });

    logger.info('User registration completed successfully:', {
      userId: dbUser.id,
      email: dbUser.email,
      businessId: business.id,
    });

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        businessId: business.id,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    logger.info('Login attempt:', { email });

    // Authenticate with Supabase
    const { data: { session }, error: supabaseError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (supabaseError || !session) {
      logger.warn('Login failed - Supabase auth error:', { email, error: supabaseError?.message });
      throw AppError.AuthenticationError(supabaseError?.message || 'Invalid credentials');
    }

    // Get user from our database
    let user = await prisma.user.findUnique({
      where: { supabase_id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true,
      },
    });

    // If user doesn't exist in our database but exists in Supabase, create them
    if (!user) {
      logger.info('User exists in Supabase but not in local database, creating...', { 
        supabaseId: session.user.id,
        email: session.user.email 
      });

      // Create a default business for the user
      const business = await prisma.business.create({
        data: {
          name: `${session.user.email?.split('@')[0]}'s Business`,
        },
      });

      // Create user in our database
      user = await prisma.user.create({
        data: {
          email: session.user.email || email,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          role: session.user.user_metadata?.role || 'admin',
          supabase_id: session.user.id,
          businessId: business.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          businessId: true,
        },
      });

      logger.info('User created in local database:', { 
        userId: user.id,
        email: user.email,
        businessId: business.id 
      });
    }

    logger.info('User logged in successfully:', {
      userId: user.id,
      email: user.email,
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${config.CORS_ORIGIN}/reset-password`,
    });

    if (error) {
      throw AppError.ValidationError(error.message);
    }

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw AppError.ValidationError(error.message);
    }

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw AppError.AuthenticationError('User not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.NotFoundError('User not found');
    }

    // Update password in Supabase
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw AppError.ValidationError(error.message);
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const signUpBusiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password, businessName, subscription = 'free' } = req.body;
  
  try {
    // Step 1: Create business first
    const business = await prisma.business.create({
      data: {
        name: businessName,
        subscription,
      }
    });

    // Step 2: Create user in Supabase with initial metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: email.split('@')[0], // Default name from email
        role: "admin"
      }
    });

    if (error) {
      // Rollback business creation if user creation fails
      await prisma.business.delete({
        where: { id: business.id }
      });
      throw AppError.ValidationError(error.message);
    }

    if (!data.user?.email) {
      throw AppError.ValidationError('User email is required');
    }

    const defaultName = email.split('@')[0];

    // Step 3: Create user in our database
    const dbUser = await prisma.user.create({
      data: {
        email,
        role: "admin",
        businessId: business.id,
        supabase_id: data.user.id,
        name: defaultName,
      },
    });

    // Step 4: Update Supabase user metadata with business_id (required for RLS)
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      user_metadata: {
        name: defaultName,
        role: "admin",
        business_id: business.id
      }
    });

    if (metadataError) {
      // Log the error but don't fail the request since user is already created
      logger.error('Failed to update Supabase user metadata:', {
        error: metadataError,
        userId: data.user.id,
        businessId: business.id
      });
    }

    res.status(201).json({
      message: "Business and admin user created successfully",
      businessId: business.id,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        businessId: business.id,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const signIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;

  try {
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !session) {
      throw AppError.AuthenticationError(error?.message || 'Invalid credentials');
    }

    const user = await prisma.user.findUnique({
      where: { supabase_id: session.user.id },
      include: { business: true }
    });

    if (!user) {
      throw AppError.NotFoundError('User not found');
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        businessName: user.business?.name || null
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { token } = req.body;

  try {
    const { error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) {
      throw AppError.ValidationError(error.message);
    }

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    throw AppError.AuthenticationError('Refresh token required');
  }

  try {
    const { data: { session }, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error || !session) {
      throw AppError.AuthenticationError(error?.message || 'Invalid refresh token');
    }

    res.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  } catch (error) {
    next(error);
  }
};

export const signupStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;
  const businessId = req.user?.businessId;

  if (!businessId) {
    throw AppError.AuthorizationError('Not authorized to create users');
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "staff",
        business_id: businessId,
      }
    });

    if (error) {
      throw AppError.ValidationError(error.message);
    }

    if (!data.user?.email) {
      throw AppError.ValidationError('User email is required');
    }

    const defaultName = email.split('@')[0];

    const dbUser = await prisma.user.create({
      data: {
        email: data.user.email,
        role: "staff",
        businessId,
        supabase_id: data.user.id,
        name: defaultName
      }
    });

    res.status(201).json({
      message: "Staff user created successfully",
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        businessId: dbUser.businessId
      }
    });
  } catch (error) {
    next(error);
  }
};

export const checkClientLimit = async (businessId: string): Promise<boolean> => {
  const clientCount = await prisma.client.count({
    where: { businessId }
  });
  
  return clientCount < FREE_TIER_CLIENT_LIMIT;
};

export const syncSupabaseUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Starting Supabase user sync...');

    // Get all users from Supabase
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw AppError.InternalError('Failed to fetch Supabase users');
    }

    let syncedCount = 0;
    let skippedCount = 0;

    for (const supabaseUser of users) {
      // Check if user already exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { supabase_id: supabaseUser.id }
      });

      if (existingUser) {
        skippedCount++;
        continue;
      }

      // Create a default business for the user
      const business = await prisma.business.create({
        data: {
          name: `${supabaseUser.email?.split('@')[0]}'s Business`,
        },
      });

      // Create user in our database
      await prisma.user.create({
        data: {
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
          role: supabaseUser.user_metadata?.role || 'admin',
          supabase_id: supabaseUser.id,
          businessId: business.id,
        },
      });

      syncedCount++;
      logger.info('Synced user:', { email: supabaseUser.email, supabaseId: supabaseUser.id });
    }

    logger.info('Supabase user sync completed:', { synced: syncedCount, skipped: skippedCount });

    res.json({
      message: 'User sync completed',
      synced: syncedCount,
      skipped: skippedCount,
      total: users.length
    });
  } catch (error) {
    logger.error('User sync error:', error);
    next(error);
  }
};