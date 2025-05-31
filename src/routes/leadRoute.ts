import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.use(cors());

// GET all leads
router.get('/', async (req: Request, res: Response) => {
  const leads = await prisma.lead.findMany();
  res.json(leads);
});

//@ts-ignore
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

// POST new lead
router.post('/', async (req: Request, res: Response) => {
  const { status, notes, clientId, businessId } = req.body;
  const lead = await prisma.lead.create({
    data: { status, notes, clientId, businessId },
  });
  res.status(201).json(lead);
});

// PUT update lead
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes, clientId, businessId } = req.body;
  const lead = await prisma.lead.update({
    where: { id },
    data: { status, notes, clientId, businessId },
  });
  res.json(lead);
});

// DELETE lead
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.lead.delete({ where: { id } });
  res.status(204).send();
});

export default router; 