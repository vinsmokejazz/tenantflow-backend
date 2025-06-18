import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/authRoles';
import { validateRequest } from '../middleware/validationMiddleware';
import { userValidation } from '../validations/user.validation';
import { AppError } from '../utils/error';
import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  businessId: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const userRouter = express.Router();

userRouter.use(cors());

// Apply authentication to all routes
userRouter.use(authenticate);

// GET all users
userRouter.get('/', requireAdmin, validateRequest(userValidation.getUsers), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
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
      throw new AppError('Unauthorized', 401);
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
      throw new AppError('User not found', 404);
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
      throw new AppError('Unauthorized', 401);
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
      throw new AppError('User already exists', 400);
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
      throw new AppError('Unauthorized', 401);
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
      throw new AppError('User not found', 404);
    }

    // Only admin can update roles
    if (role && req.user.role !== 'admin') {
      throw new AppError('Only admin can update user roles', 403);
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
      throw new AppError('Unauthorized', 401);
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
      throw new AppError('User not found', 404);
    }

    // Prevent self-deletion
    if (id === req.user.id) {
      throw new AppError('Cannot delete your own account', 400);
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