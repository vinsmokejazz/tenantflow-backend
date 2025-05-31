import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.use(cors());

// GET all businesses
router.get('/', async (req: Request, res: Response) => {
  const businesses = await prisma.business.findMany();
  res.json(businesses);
});

// GET business by ID
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  res.json(business);
});

// POST new business
router.post('/', async (req: Request, res: Response) => {
  const { name, subscription } = req.body;
  const business = await prisma.business.create({
    data: { name, subscription },
  });
  res.status(201).json(business);
});

// PUT update business
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, subscription } = req.body;
  const business = await prisma.business.update({
    where: { id },
    data: { name, subscription },
  });
  res.json(business);
});

// DELETE business
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.business.delete({ where: { id } });
  res.status(204).send();
});

export default router; 