import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import jwt from 'jsonwebtoken';

const prismaClient = new PrismaClient();

const FREE_TIER_CLIENT_LIMIT = 10;

// Helper function to generate tokens
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

export const signUpBusiness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password, businessName, subscription = 'free' } = req.body;
  
  try {
    // Create business first
    const business = await prismaClient.business.create({
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
      await prismaClient.business.delete({
        where: { id: business.id }
      });
      res.status(400).json({ error: error.message });
      return;
    }

    // Create user in our database
    await prismaClient.user.create({
      data: {
        id: data.user.id,
        email,
        role: "admin",
        businessId: business.id,
      },
    });

    // Generate tokens
    const tokens = generateTokens(data.user.id);

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

    const user = await prismaClient.user.findUnique({
      where: { id: data.user.id },
      include: { business: true }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const tokens = generateTokens(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
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

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email } = req.body;

  try {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: "Password reset email sent" });
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
    const tokens = generateTokens(decoded.userId);
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

    await prismaClient.user.create({
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
  const clientCount = await prismaClient.client.count({
    where: { businessId }
  });
  
  return clientCount < FREE_TIER_CLIENT_LIMIT;
};