import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/authRoles';
import { validateRequest } from '../middleware/validationMiddleware';
import { userValidation } from '../validations/user.validation';
import { AppError } from '../utils/error';
import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

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

// Apply authentication to all routes
userRouter.use(authenticate);

// GET all users
userRouter.get('/', requireAdmin, validateRequest(userValidation.getUsers), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw AppError.AuthenticationError('Unauthorized');
    }

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

// GET user by ID
userRouter.get('/:id', requireAdmin, validateRequest(userValidation.getUser), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw AppError.AuthenticationError('Unauthorized');
    }

    const id = req.params.id as string;
    const user = await prisma.user.findFirst({
      where: {
        id,
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

    if (!user) {
      throw AppError.NotFoundError('User not found');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// POST new user - admin only
userRouter.post('/', requireAdmin, validateRequest(userValidation.createUser), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw AppError.AuthenticationError('Unauthorized');
    }

    const { email, name, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        businessId: req.user.businessId
      }
    });

    if (existingUser) {
      throw AppError.ValidationError('User already exists');
    }

    const userData: Prisma.UserCreateInput = {
      email,
      name,
      role,
      business: {
        connect: {
          id: req.user.businessId
        }
      },
      supabase_id: email // Using email as supabase_id for now
    };

    const user = await prisma.user.create({
      data: userData,
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

// PUT update user - admin only
userRouter.put('/:id', requireAdmin, validateRequest(userValidation.updateUser), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw AppError.AuthenticationError('Unauthorized');
    }

    const id = req.params.id as string;
    const { email, name, role } = req.body;

    // Check if user exists and belongs to the same business
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        businessId: req.user.businessId
      }
    });

    if (!existingUser) {
      throw AppError.NotFoundError('User not found');
    }

    // Only admin can update roles
    if (role && req.user?.role !== 'admin') {
      throw AppError.AuthorizationError('Only admin can update user roles');
    }

    const userData: Prisma.UserUpdateInput = {
      email,
      name,
      role
    };

    const user = await prisma.user.update({
      where: {
        id
      },
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// DELETE user - admin only
userRouter.delete('/:id', requireAdmin, validateRequest(userValidation.deleteUser), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw AppError.AuthenticationError('Unauthorized');
    }

    const id = req.params.id as string;
    // Check if user exists and belongs to the same business
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        businessId: req.user.businessId
      }
    });

    if (!existingUser) {
      throw AppError.NotFoundError('User not found');
    }

    // Prevent self-deletion
    if (id === req.user.id) {
      throw AppError.ValidationError('Cannot delete your own account');
    }

    await prisma.user.delete({
      where: {
        id
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default userRouter; 