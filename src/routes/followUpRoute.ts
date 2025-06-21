import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/authRoles';
import { validateRequest } from '../middleware/validationMiddleware';
import { followUpValidation } from '../validations/followUp.validation';
import { AppError } from '../utils/error';

const followUpRouter = express.Router();
const prisma = new PrismaClient();

followUpRouter.use(cors());

// Apply authentication to all routes
followUpRouter.use(authenticate);

// GET all follow-ups
followUpRouter.get('/', validateRequest(followUpValidation.getFollowUps), async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    const where: any = { businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        client: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(followUps);
  } catch (error) {
    next(error);
  }
});

// GET follow-up by ID
followUpRouter.get('/:id', validateRequest(followUpValidation.getFollowUp), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    const where: any = { id, businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const followUp = await prisma.followUp.findFirst({
      where,
      include: {
        client: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });
    if (!followUp) {
      next(AppError.NotFoundError('Follow-up not found'));
      return;
    }
    res.json(followUp);
  } catch (error) {
    next(error);
  }
});

// POST new follow-up
followUpRouter.post('/', validateRequest(followUpValidation.createFollowUp), async (req: Request, res: Response, next: NextFunction) => {
  const { notes, dueDate, clientId, assignedTo } = req.body;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }
  try {
    const data: any = { notes, dueDate, clientId, businessId };
    if (userRole === 'admin') {
      // Admin can assign or unassign (set to null)
      data.assignedTo = assignedTo || null;
    } else if (userRole === 'staff') {
      data.assignedTo = userId;
    }
    const followUp = await prisma.followUp.create({
      data,
      include: {
        client: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });
    res.status(201).json(followUp);
  } catch (error) {
    next(error);
  }
});

// PUT update follow-up
followUpRouter.put('/:id', validateRequest(followUpValidation.updateFollowUp), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { notes, dueDate, completed, assignedTo } = req.body;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    const where: any = { id, businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const existing = await prisma.followUp.findFirst({ where });
    if (!existing) {
      next(AppError.NotFoundError('Follow-up not found or not authorized'));
      return;
    }
    const updateData: any = { notes, dueDate, completed };
    if (userRole === 'admin') {
      // Admin can assign or unassign (set to null)
      updateData.assignedTo = assignedTo || null;
    }
    const updated = await prisma.followUp.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE follow-up
followUpRouter.delete('/:id', validateRequest(followUpValidation.deleteFollowUp), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    const where: any = { id, businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const existing = await prisma.followUp.findFirst({ where });
    if (!existing) {
      next(AppError.NotFoundError('Follow-up not found or not authorized'));
      return;
    }
    await prisma.followUp.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET upcoming tasks for dashboard
followUpRouter.get('/dashboard/tasks', async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  
  try {
    const where: any = { businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }

    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, email: true }
        },
        assignedUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overdue = followUps.filter(f => !f.completed && f.dueDate < today);
    const upcoming = followUps.filter(f => 
      !f.completed && f.dueDate >= today && f.dueDate <= nextWeek
    );

    res.json({
      overdue,
      upcoming,
      total: followUps.length
    });
  } catch (error) {
    next(error);
  }
});

export default followUpRouter; 