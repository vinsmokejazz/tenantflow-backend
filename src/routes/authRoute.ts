import express from 'express';
import { 
  register,
  login,
  forgotPassword,
  resetPassword,
  updatePassword
} from '../controllers/auth.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { 
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} from '../validations/auth.validation';

const authRouter = express.Router();

// Public routes
authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);

// Protected routes
authRouter.post('/change-password',
  protect,
  validate(changePasswordSchema),
  updatePassword
);

export default authRouter;