import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.use(cors());

// GET all follow-ups
router.get('/', async (req: Request, res: Response) => {
  const followUps = await prisma.followUp.findMany();
  res.json(followUps);
});

 //@ts-ignore
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const followUp = await prisma.followUp.findUnique({ where: { id } });
  if (!followUp) return res.status(404).json({ error: 'FollowUp not found' });
  res.json(followUp);
});

// POST new follow-up
router.post('/', async (req: Request, res: Response) => {
  const { notes, dueDate, completed, clientId, businessId } = req.body;
  const followUp = await prisma.followUp.create({
    data: { notes, dueDate, completed, clientId, businessId },
  });
  res.status(201).json(followUp);
});

// PUT update follow-up
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes, dueDate, completed, clientId, businessId } = req.body;
  const followUp = await prisma.followUp.update({
    where: { id },
    data: { notes, dueDate, completed, clientId, businessId },
  });
  res.json(followUp);
});

// DELETE follow-up
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.followUp.delete({ where: { id } });
  res.status(204).send();
});

export default router; 