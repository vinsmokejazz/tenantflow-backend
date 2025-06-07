import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const clientRouter = express.Router();
const prisma = new PrismaClient();

// Enable CORS for all routes
clientRouter.use(cors());

// GET all clients
clientRouter.get('/', async (req: Request, res: Response) => {
  const clients = await prisma.client.findMany();
  res.json(clients);
});

// GET client by ID
clientRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) 
    res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

// POST new client
clientRouter.post('/', async (req: Request, res: Response) => {
  const { name, email, phone, businessId } = req.body;
  const client = await prisma.client.create({
    data: { name, email, phone, businessId },
  });
  res.status(201).json(client);
});

// PUT update client
clientRouter.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, businessId } = req.body;
  const client = await prisma.client.update({
    where: { id },
    data: { name, email, phone, businessId },
  });
  res.json(client);
});

// DELETE client
clientRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.client.delete({ where: { id } });
  res.status(204).send();
});

export default clientRouter;
