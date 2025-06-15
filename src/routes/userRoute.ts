import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/authMiddleware';

const UserRouter = express.Router();
const prisma = new PrismaClient();

UserRouter.use(cors());
UserRouter.use(authenticateUser as RequestHandler);

// GET all users
UserRouter.get('/', (async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.business_id;
  
  try {
    const users = await prisma.user.findMany({
      where: { businessId }
    });
    res.json(users);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

UserRouter.get('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.business_id;

  try {
    const user = await prisma.user.findFirst({
      where: { 
        id,
        businessId
      }
    });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(user);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

// POST new user
UserRouter.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { email, role } = req.body;
  const businessId = req.user?.business_id;

  if (!businessId) {
    res.status(403).json({ error: "Unauthorized: missing business ID" });
    return;
  }

  try {
    const user = await prisma.user.create({
      data: { 
        email, 
        role, 
        businessId 
      },
    });
    res.status(201).json(user);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

// PUT update user
UserRouter.put('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { email, role } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { email, role },
    });
    res.json(user);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

// DELETE user
UserRouter.delete('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

export default UserRouter; 