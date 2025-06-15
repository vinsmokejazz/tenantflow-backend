import express from 'express';
import { 
  signUpBusiness, 
  signupStaff, 
  signIn, 
  resetPassword,
  verifyEmail,
  refreshToken
} from '../controllers/auth.controller';
import { authenticateUser, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { 
  signUpSchema, 
  signInSchema, 
  resetPasswordSchema,
  verifyEmailSchema 
} from '../validations/auth.validation';

const authRouter = express.Router();

// Public routes
authRouter.post('/signup/business', validateRequest(signUpSchema), signUpBusiness);
authRouter.post('/signin', validateRequest(signInSchema), signIn);
authRouter.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);
authRouter.post('/verify-email', validateRequest(verifyEmailSchema), verifyEmail);
authRouter.post('/refresh-token', refreshToken);

// Protected routes
authRouter.post('/signup/staff', 
  authenticateUser,
  requireRole(['admin']),
  validateRequest(signUpSchema),
  signupStaff
);

export default authRouter;