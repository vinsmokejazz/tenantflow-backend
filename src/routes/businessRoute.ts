import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/authMiddleware';

const businessRouter = express.Router();
const prisma = new PrismaClient();

businessRouter.use(cors());
businessRouter.use(authenticateUser as RequestHandler);

businessRouter.get('/', (async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.business_id;
  
  try {
    const business = await prisma.business.findFirst({
      where: { id: businessId }
    });
    
    if (!business) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    
    res.json(business);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

businessRouter.get('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.business_id;

  if (id !== businessId) {
    res.status(403).json({ error: 'Not authorized to access this business' });
    return;
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id }
    });
    
    if (!business) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    
    res.json(business);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

businessRouter.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { name, subscription } = req.body;
  const businessId = req.user?.business_id;

  if (!businessId) {
    res.status(403).json({ error: "Unauthorized: missing business ID" });
    return;
  }

  try {
    const business = await prisma.business.create({
      data: {
        id: businessId,
        name,
        subscription,
      },
    });
    res.status(201).json(business);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

//PUT update business
businessRouter.put('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, subscription } = req.body;
  const businessId = req.user?.business_id;

  if (id !== businessId) {
    res.status(403).json({ error: 'Not authorized to update this business' });
    return;
  }

  try {
    const business = await prisma.business.update({
      where: { id },
      data: {
        name,
        subscription
      }
    });
    res.json(business);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

businessRouter.delete('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.business_id;

  if (id !== businessId) {
    res.status(403).json({ error: 'Not authorized to delete this business' });
    return;
  }

  try {
    await prisma.business.delete({
      where: { id }
    });
    res.status(204).send();
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

export default businessRouter;