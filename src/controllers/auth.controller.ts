import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";

const prismaClient = new PrismaClient();

const FREE_TIER_CLIENT_LIMIT = 10;

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

    res.status(201).json({
      message: "Business and admin user created successfully",
      businessId: business.id
    });
  } catch (error: any) {
    next(error);
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