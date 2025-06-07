import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";


export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  //destructured access
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const role = user?.user_metadata?.role || "staff";
  const business_id = user?.user_metadata?.business_id;

  req.user = {
    id: user.id,
    email: user.email!,
    role,
    business_id,
  }
  next();
};
