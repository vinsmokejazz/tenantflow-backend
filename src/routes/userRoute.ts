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

// GET current user
userRouter.get('/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.AuthenticationError('Unauthorized');

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessId: true,
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
    const { email, name, role } = req.body;

    // Check if user already exists in our database
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        businessId: req.user.businessId
      }
    });

    if (existingUser) {
      throw AppError.ConflictError('User with this email already exists in your business');
    }

    // Check if user exists in Supabase
    const { data: supabaseUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw AppError.ValidationError('Failed to check existing users: ' + listError.message);
    }

    const existingSupabaseUser = supabaseUsers.users.find(user => user.email === email);
    
    if (existingSupabaseUser) {
      // User exists in Supabase but not in our database
      // Create them in our database and link to existing Supabase account
      const user = await prisma.user.create({
        data: {
          email,
          name,
          role,
          supabase_id: existingSupabaseUser.id,
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

      console.log(`User linked to existing Supabase account: ${email} for role ${role}`);

      res.status(201).json({
        ...user,
        message: `User account linked for ${email}`
      });
      return;
    }

    // User doesn't exist in either place, create new user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role,
        business_id: req.user.businessId
      }
    });

    if (error || !data?.user) {
      throw AppError.ValidationError('Supabase user creation failed: ' + error?.message);
    }

    // Create user in our database
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

    // Send invitation email (in a real implementation, you would send an actual email)
    // For now, we'll just log it
    console.log(`Invitation sent to ${email} for role ${role}`);

    res.status(201).json({
      ...user,
      message: `Invitation sent to ${email}`
    });
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

// GET audit log
userRouter.get('/audit-log', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.AuthenticationError('Unauthorized');

    // Get all users with their activity
    const users = await prisma.user.findMany({
      where: {
        businessId: req.user.businessId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Generate audit log entries
    const auditLog = users.map(user => ({
      id: user.id,
      action: 'user_created',
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      timestamp: user.createdAt,
      details: `User ${user.name} (${user.email}) was created with role ${user.role}`
    }));

    res.json({
      auditLog,
      totalEntries: auditLog.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// POST resend invite
userRouter.post('/:id/resend-invite', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.AuthenticationError('Unauthorized');
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id,
        businessId: req.user.businessId
      }
    });

    if (!user) throw AppError.NotFoundError('User not found');

    // In a real implementation, you would send an email invite here
    // For now, we'll just return a success message
    res.json({
      message: 'Invite resent successfully',
      userId: id,
      email: user.email
    });
  } catch (error) {
    next(error);
  }
});

export default userRouter;
