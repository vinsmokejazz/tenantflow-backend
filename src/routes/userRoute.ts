import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/authRoles';
import { validateRequest } from '../middleware/validationMiddleware';
import { userValidation } from '../validations/user.validation';
import { AppError } from '../utils/error';
import { prisma } from '../config/prisma';
import { supabaseAdmin } from '../config/supabase';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    businessId: string;
  };
}

const userRouter = express.Router();

userRouter.use(cors());
userRouter.use(authenticate);

// GET all users
userRouter.get('/', requireAdmin, validateRequest(userValidation.getUsers), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.AuthenticationError('Unauthorized');

    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const users = await prisma.user.findMany({
      where: {
        businessId: req.user.businessId,
        ...(role && { role })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// GET single user
userRouter.get('/:id', requireAdmin, validateRequest(userValidation.getUser), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.AuthenticationError('Unauthorized');

    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) throw AppError.NotFoundError('User not found');
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// POST create user
userRouter.post('/', requireAdmin, validateRequest(userValidation.createUser), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.AuthenticationError('Unauthorized');
    const { email, password, name, role } = req.body;

    // Supabase user creation
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role,
        business_id: req.user.businessId
      }
    });

    if (error || !data?.user) {
      throw AppError.ValidationError('Supabase user creation failed: ' + error?.message);
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        supabase_id: data.user.id,
        business: {
          connect: { id: req.user.businessId }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// PUT update user
userRouter.put('/:id', requireAdmin, validateRequest(userValidation.updateUser), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.AuthenticationError('Unauthorized');

    const { email, name, role } = req.body;
    const userToUpdate = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId
      }
    });

    if (!userToUpdate) throw AppError.NotFoundError('User not found');

    if (role && req.user.role !== 'admin') {
      throw AppError.AuthorizationError('Only admin can update user roles');
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { email, name, role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE user
userRouter.delete('/:id', requireAdmin, validateRequest(userValidation.deleteUser), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.AuthenticationError('Unauthorized');
    const { id } = req.params;

    if (id === req.user.id) throw AppError.ValidationError('Cannot delete your own account');

    const user = await prisma.user.findFirst({
      where: {
        id,
        businessId: req.user.businessId
      }
    });

    if (!user) throw AppError.NotFoundError('User not found');

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default userRouter;
