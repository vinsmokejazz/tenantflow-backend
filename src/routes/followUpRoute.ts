import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/authMiddleware';

const FollowUpRouter = express.Router();
const prisma = new PrismaClient();

FollowUpRouter.use(cors());
FollowUpRouter.use(authenticateUser as RequestHandler);

// GET all follow-ups
FollowUpRouter.get('/', (async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.business_id;
  
  try {
    const followUps = await prisma.followUp.findMany({
      where: { businessId }
    });
    res.json(followUps);
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

FollowUpRouter.get('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.business_id;

  try {
    const followUp = await prisma.followUp.findFirst({
      where: { 
        id,
        businessId
      }
    });
    
    if (!followUp) {
      return res.status(404).json({ error: 'FollowUp not found' });
    }
    
    res.json(followUp);
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// POST new follow-up
FollowUpRouter.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { notes, dueDate, completed, clientId } = req.body;
  const businessId = req.user?.business_id;

  if (!businessId) {
    return res.status(403).json({ error: "Unauthorized: missing business ID" });
  }

  try {
    const followUp = await prisma.followUp.create({
      data: { 
        notes, 
        dueDate, 
        completed, 
        clientId, 
        businessId 
      },
    });
    res.status(201).json(followUp);
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// PUT update follow-up
FollowUpRouter.put('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { notes, dueDate, completed, clientId } = req.body;
  const businessId = req.user?.business_id;

  try {
    const followUp = await prisma.followUp.updateMany({
      where: { 
        id,
        businessId
      },
      data: { 
        notes, 
        dueDate, 
        completed, 
        clientId
      },
    });

    if (followUp.count === 0) {
      return res.status(404).json({ error: 'FollowUp not found or not authorized' });
    }

    res.json({ message: 'FollowUp updated successfully' });
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// DELETE follow-up
FollowUpRouter.delete('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.business_id;

  try {
    const deleted = await prisma.followUp.deleteMany({
      where: { 
        id,
        businessId
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'FollowUp not found or not authorized' });
    }

    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

export default FollowUpRouter; 