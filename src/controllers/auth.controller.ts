import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";

const prismaClient = new PrismaClient();


export const signUpBusiness = async (req: Request, res: Response) => {

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


export const signupStaff = async (req: Request, res: Response) => {

  const { email, password } = req.body;
  const business_id = req.user?.business_id;

  if (!business_id) {
    return res.status(403).json({ error: "not authorized to create users" });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: {
      role: "staff",
      business_id: business_id,
    }
  });

  if (error) {
    return res.status(400).json({
      error: error.message
    });
  }

  await prismaClient.user.create({
    data: {
      id: data.user.id,
      email,
      role:"staff",
    

    }
  });

  res.status(201).json({mssg:"Staff user created"});

};