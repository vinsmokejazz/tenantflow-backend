import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { checkClientLimit } from '../controllers/auth.controller';

const clientRouter = express.Router();
const prisma = new PrismaClient();

// Enable CORS for all routes
clientRouter.use(cors());

// Protect all routes with authentication
clientRouter.use(authenticate);

// GET all clients - accessible by both admin and staff
clientRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const businessId = req.user?.businessId;
  
  try {
    const clients = await prisma.client.findMany({
      where: { businessId }
    });
    res.json(clients);
  } catch (error: any) {
    next(error);
  }
});

// GET single client - accessible by both admin and staff
clientRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  try {
    const client = await prisma.client.findFirst({
      where: { 
        id,
        businessId
      }
    });
    
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    
    res.json(client);
  } catch (error: any) {
    next(error);
  }
});

// POST new client - admin only
clientRouter.post('/', authorize('admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, email, phone } = req.body;
  const businessId = req.user?.businessId;

  if (!businessId) {
    res.status(403).json({ error: "Unauthorized: missing business ID" });
    return;
  }

  try {
    // Check client limit for free tier
    const canAddClient = await checkClientLimit(businessId);
    if (!canAddClient) {
      res.status(403).json({ 
        error: "Client limit reached. Please upgrade your subscription to add more clients." 
      });
      return;
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        businessId,
      },
    });

    res.status(201).json(client);
  } catch (error: any) {
    next(error);
  }
});

// PUT update client - admin only
clientRouter.put('/:id', authorize('admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  const businessId = req.user?.businessId;

  try {
    const client = await prisma.client.updateMany({
      where: { 
        id,
        businessId
      },
      data: { 
        name,
        email,
        phone
      },
    });

    if (client.count === 0) {
      res.status(404).json({ error: 'Client not found or not authorized' });
      return;
    }

    res.json({ message: 'Client updated successfully' });
  } catch (error: any) {
    next(error);
  }
});

// DELETE client - admin only
clientRouter.delete('/:id', authorize('admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  try {
    const deleted = await prisma.client.deleteMany({
      where: { 
        id,
        businessId
      }
    });

    if (deleted.count === 0) {
      res.status(404).json({ error: 'Client not found or not authorized' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
});

export default clientRouter;
