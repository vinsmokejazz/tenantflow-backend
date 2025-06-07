import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const LeadRouter = express.Router();
const prisma = new PrismaClient();

LeadRouter.use(cors());

// GET all leads
LeadRouter.get('/', async (req: Request, res: Response) => {
  const leads = await prisma.lead.findMany();
  res.json(leads);
});


LeadRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) 
    res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

// POST new lead
LeadRouter.post('/', async (req: Request, res: Response) => {
  const { status, notes, clientId, businessId } = req.body;
  const lead = await prisma.lead.create({
    data: { status, notes, clientId, businessId },
  });
  res.status(201).json(lead);
});

// PUT update lead
LeadRouter.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes, clientId, businessId } = req.body;
  const lead = await prisma.lead.update({
    where: { id },
    data: { status, notes, clientId, businessId },
  });
  res.json(lead);
});

// DELETE lead
LeadRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.lead.delete({ where: { id } });
  res.status(204).send();
});

export default LeadRouter; 