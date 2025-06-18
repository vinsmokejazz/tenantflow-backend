import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Authorization token required" });
    return;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const role = user?.user_metadata?.role || "staff";
  const business_id = user?.user_metadata?.business_id;
  const name = user?.user_metadata?.name || user.email?.split('@')[0] || 'User';

  req.user = {
    id: user.id,
    email: user.email!,
    name,
    role,
    businessId: business_id,
  };
  next();
};

export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
};
