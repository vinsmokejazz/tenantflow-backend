import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/authMiddleware';

const clientRouter = express.Router();
const prisma = new PrismaClient();

// Enable CORS for all routes
clientRouter.use(cors());

// Protect all routes with authentication
clientRouter.use(authenticateUser as RequestHandler);

// GET all clients for the authenticated business
clientRouter.get('/', (async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.business_id;

  try {
    const clients = await prisma.client.findMany({
      where: { businessId },
    });
    res.json(clients);
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// GET single client by ID (only if it belongs to user's business)
clientRouter.get('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.business_id;

  try {
    const client = await prisma.client.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// POST new client
clientRouter.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, phone } = req.body;
  const businessId = req.user?.business_id;

  if (!businessId) {
    return res.status(403).json({ error: "Unauthorized: missing business ID" });
  }

  try {
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
}) as RequestHandler);

// PUT update client
clientRouter.put('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  const businessId = req.user?.business_id;

  try {
    const client = await prisma.client.updateMany({
      where: {
        id,
        businessId,
      },
      data: {
        name,
        email,
        phone,
      },
    });

    if (client.count === 0) {
      return res.status(404).json({ error: 'Client not found or not authorized' });
    }

    res.json({ message: 'Client updated successfully' });
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// DELETE client
clientRouter.delete('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.business_id;

  try {
    const deleted = await prisma.client.deleteMany({
      where: {
        id,
        businessId,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Client not found or not authorized' });
    }

    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

export default clientRouter;
