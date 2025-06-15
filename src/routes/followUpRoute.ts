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
    const followUp = await prisma.followUp.findFirst({ where: { id, businessId } });
    if (!followUp) {
      res.status(404).json({ error: 'Follow-up not found' });
      return;
    }
    res.json(followUp);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

// POST new follow-up
FollowUpRouter.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { notes, dueDate, clientId } = req.body;
  const businessId = req.user?.business_id;
  if (!businessId) {
    res.status(403).json({ error: "Unauthorized: missing business ID" });
    return;
  }
  try {
    const followUp = await prisma.followUp.create({
      data: { notes, dueDate, clientId, businessId },
    });
    res.status(201).json(followUp);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

// PUT update follow-up
FollowUpRouter.put('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { notes, dueDate, completed } = req.body;
  const businessId = req.user?.business_id;
  try {
    const followUp = await prisma.followUp.update({
      where: { id },
      data: { notes, dueDate, completed, businessId },
    });
    res.json(followUp);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

// DELETE follow-up
FollowUpRouter.delete('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    await prisma.followUp.delete({ where: { id } });
    res.status(204).send();
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

export default FollowUpRouter; 