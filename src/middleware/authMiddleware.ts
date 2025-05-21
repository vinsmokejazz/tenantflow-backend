import { Request, Response, NextFunction } from "express"
import { supabaseAdmin } from "../config/supabase";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const token = req.headers.authorization?.split(" ")[1];

  if(!token){
    res.status(401).json({
      error: "Authorization token required"
    });
    return;
  }

  //need implement verfying logic
  
}