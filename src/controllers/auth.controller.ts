import { Prisma, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";

const prismaClient = new PrismaClient();


const signUpBusiness = async (req: Request, res: Response) => {
  const { email, password, businessName } = req.body;

  try {
    // creating busineess and storing in db
    const business = await prismaClient.business.create({
      data: {
        name: businessName,
      }
    });

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        role: "admin",
        business_id: business.id,
      }
    })

    if (error) return res.status(400).json({ error: error.message });


    await prismaClient.user.create({
      data: {
        id: data.user.id,
        email,
        role: "admin",
        businessId: business.id,
      },
    });
    res.status(201).json({
      mssg: "Business and user created "
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
}

