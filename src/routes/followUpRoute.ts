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
  
  try {
    const followUps = await prisma.followUp.findMany({
      where: { businessId }
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

  try {
    const followUp = await prisma.followUp.findFirst({
      where: { 
        id,
        businessId
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
  const { notes, dueDate, clientId } = req.body;
  const businessId = req.user?.businessId;

  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }

  try {
    const followUp = await prisma.followUp.create({
      data: { 
        notes, 
        dueDate, 
        clientId, 
        businessId 
      },
    });
    res.status(201).json(followUp);
  } catch (error) {
    next(error);
  }
});

// PUT update follow-up - admin only
followUpRouter.put('/:id', requireAdmin, validateRequest(followUpValidation.updateFollowUp), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { notes, dueDate, completed } = req.body;
  const businessId = req.user?.businessId;

  try {
    const followUp = await prisma.followUp.updateMany({
      where: { 
        id,
        businessId
      },
      data: { 
        notes, 
        dueDate, 
        completed 
      }
    });

    if (followUp.count === 0) {
      next(AppError.NotFoundError('Follow-up not found or not authorized'));
      return;
    }

    res.json({ message: 'Follow-up updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE follow-up - admin only
followUpRouter.delete('/:id', requireAdmin, validateRequest(followUpValidation.deleteFollowUp), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  try {
    const deleted = await prisma.followUp.deleteMany({
      where: { 
        id,
        businessId
      }
    });

    if (deleted.count === 0) {
      next(AppError.NotFoundError('Follow-up not found or not authorized'));
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default followUpRouter; 