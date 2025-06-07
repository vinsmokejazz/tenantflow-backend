import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const FollowUpRouter = express.Router();
const prisma = new PrismaClient();

FollowUpRouter.use(cors());

// GET all follow-ups
FollowUpRouter.get('/', async (req: Request, res: Response) => {
  const followUps = await prisma.followUp.findMany();
  res.json(followUps);
});


FollowUpRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const followUp = await prisma.followUp.findUnique({ where: { id } });
  if (!followUp) 
     res.status(404).json({ error: 'FollowUp not found' });
  res.json(followUp);
});

// POST new follow-up
FollowUpRouter.post('/', async (req: Request, res: Response) => {
  const { notes, dueDate, completed, clientId, businessId } = req.body;
  const followUp = await prisma.followUp.create({
    data: { notes, dueDate, completed, clientId, businessId },
  });
  res.status(201).json(followUp);
});

// PUT update follow-up
FollowUpRouter.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes, dueDate, completed, clientId, businessId } = req.body;
  const followUp = await prisma.followUp.update({
    where: { id },
    data: { notes, dueDate, completed, clientId, businessId },
  });
  res.json(followUp);
});

// DELETE follow-up
FollowUpRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.followUp.delete({ where: { id } });
  res.status(204).send();
});

export default FollowUpRouter; 