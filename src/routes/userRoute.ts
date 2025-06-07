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
  } catch (error: any) {
    next(error);
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
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// POST new user
UserRouter.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { email, role } = req.body;
  const businessId = req.user?.business_id;

  if (!businessId) {
    return res.status(403).json({ error: "Unauthorized: missing business ID" });
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
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// PUT update user
UserRouter.put('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { email, role } = req.body;
  const businessId = req.user?.business_id;

  try {
    const user = await prisma.user.updateMany({
      where: { 
        id,
        businessId
      },
      data: { 
        email, 
        role
      },
    });

    if (user.count === 0) {
      return res.status(404).json({ error: 'User not found or not authorized' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// DELETE user
UserRouter.delete('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.business_id;

  try {
    const deleted = await prisma.user.deleteMany({
      where: { 
        id,
        businessId
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'User not found or not authorized' });
    }

    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

export default UserRouter; 