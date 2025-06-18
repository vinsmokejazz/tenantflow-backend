import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { prisma } from '../lib/prisma';
import { Prisma, User } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { signToken, JwtPayload } from '../utils/jwt';

const FREE_TIER_CLIENT_LIMIT = 10;

interface AuthRequest extends Request {
  user?: JwtPayload;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, business_name, role } = req.body;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw new AppError(400, authError.message);

    // Create business with user
    const business = await prisma.business.create({
      data: {
        name: business_name,
        users: {
          create: {
            supabase_id: authData.user!.id,
            email,
            name: name || '',
            role: role || 'admin',
            password: '', // Password is managed by Supabase
          }
        }
      },
      include: {
        users: true
      }
    });

    const user = business.users[0];
    if (!user) throw new AppError(500, 'User creation failed');

    // Generate JWT token
    const token = signToken({
      id: user.id,
      email: user.email || '',
      name: user.name || '',
      role: user.role || 'admin',
      businessId: user.businessId || ''
    });

    // Remove sensitive data
    const userWithoutSensitive = user ? { ...user } : {};
    if ('password' in userWithoutSensitive) delete userWithoutSensitive.password;

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: userWithoutSensitive,
        business
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw new AppError(401, 'Invalid email or password');

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { supabase_id: authData.user!.id }
    });

    if (!user) throw new AppError(404, 'User not found');

    // Generate JWT token
    const token = signToken({
      id: user.id,
      email: user.email || '',
      name: user.name || '',
      role: user.role || 'admin',
      businessId: user.businessId || ''
    });

    // Remove sensitive data
    const userWithoutSensitive = user ? { ...user } : {};
    if ('password' in userWithoutSensitive) delete userWithoutSensitive.password;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: userWithoutSensitive
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Send password reset email through Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) throw new AppError(400, error.message);

    res.status(200).json({
      status: 'success',
      message: 'Password reset email sent'
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    // Reset password through Supabase
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) throw new AppError(400, error.message);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful'
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) throw new AppError(401, 'User not authenticated');

    // Update password through Supabase
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw new AppError(400, error.message);

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
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
      res.status(400).json({ error: error.message });
      return;
    }

    // Create user in our database
    await prisma.user.create({
      data: {
        id: data.user.id,
        email,
        role: "admin",
        businessId: business.id,
      },
    });

    // Generate tokens
    const tokens = signToken({
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
      businessId: data.user.businessId,
    });

    res.status(201).json({
      message: "Business and admin user created successfully",
      businessId: business.id,
      ...tokens
    });
  } catch (error: any) {
    next(error);
  }
};

export const signIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: data.user.id },
      include: { business: true }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const tokens = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        businessName: user.business.name
      },
      ...tokens
    });
  } catch (error: any) {
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
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: "Email verified successfully" });
  } catch (error: any) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(401).json({ error: "Refresh token required" });
    return;
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    const tokens = signToken({
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      businessId: decoded.businessId,
    });
    res.json(tokens);
    return;
  } catch (error) {
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }
};

export const signupStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;
  const businessId = req.user?.business_id;

  if (!businessId) {
    res.status(403).json({ error: "Not authorized to create users" });
    return;
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
      res.status(400).json({
        error: error.message
      });
      return;
    }

    await prisma.user.create({
      data: {
        id: data.user.id,
        email,
        role: "staff",
        businessId,
      }
    });

    res.status(201).json({ message: "Staff user created successfully" });
  } catch (error: any) {
    next(error);
  }
};

export const checkClientLimit = async (businessId: string): Promise<boolean> => {
  const clientCount = await prisma.client.count({
    where: { businessId }
  });
  
  return clientCount < FREE_TIER_CLIENT_LIMIT;
};