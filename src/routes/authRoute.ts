import express from 'express';
import { signUpBusiness, signupStaff } from '../controllers/auth.controller';
import { authenticateUser, requireRole } from '../middleware/authMiddleware';

const authRouter = express.Router();

// Public routes
authRouter.post('/signup/business', signUpBusiness);

// Protected routes
authRouter.post('/signup/staff', 
  authenticateUser,
  requireRole(['admin']),
  signupStaff
);

export default authRouter;