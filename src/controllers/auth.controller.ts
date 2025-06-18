import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import { AppError } from '../utils/error';
import { prisma } from '../lib/prisma';
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
    const { email, password, name, businessName } = req.body;

    // Create user in Supabase
    const { data: { user }, error: supabaseError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (supabaseError || !user) {
      throw AppError.ValidationError(supabaseError?.message || 'Failed to create user');
    }

    // Create business
    const business = await prisma.business.create({
      data: {
        name: businessName,
      },
    });

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

    logger.info('User registered:', {
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
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Authenticate with Supabase
    const { data: { session }, error: supabaseError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (supabaseError || !session) {
      throw AppError.AuthenticationError(supabaseError?.message || 'Invalid credentials');
    }

    // Get user from our database
    const user = await prisma.user.findUnique({
      where: { supabase_id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true,
      },
    });

    if (!user) {
      throw AppError.AuthenticationError('User not found');
    }

    logger.info('User logged in:', {
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
    // Create business first
    const business = await prisma.business.create({
      data: {
        name: businessName,
        subscription,
      }
    });

    // Create user in Supabase with business metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        business_id: business.id,
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

    // Create user in our database
    const dbUser = await prisma.user.create({
      data: {
        email,
        role: "admin",
        businessId: business.id,
        supabase_id: data.user.id,
        name: defaultName,
      },
    });

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