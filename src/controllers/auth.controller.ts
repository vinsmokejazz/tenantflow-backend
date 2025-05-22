import { Prisma, PrismaClient } from "@prisma/client";
import { Request } from "express";
import { supabaseAdmin } from "../config/supabase";

const prismaClient = new PrismaClient();

const signUpBusiness = async () => {

  const { email, password, businessName } = req.body;

  const business = await prismaClient.business.create({
    data: {
      name: businessName,
    }
  });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
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

}

