import express, { RequestHandler } from 'express';
import { signUpBusiness,signupStaff } from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/authMiddleware';

const authRouter= express.Router();

authRouter.post('/signup/business',signUpBusiness);
authRouter.post('/signup/staff',authenticateUser as RequestHandler
  ,signupStaff as RequestHandler);

export default authRouter;