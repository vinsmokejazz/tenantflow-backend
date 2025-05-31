import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.use(cors());

// GET all users
router.get('/', async (req: Request, res: Response) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

//@ts-ignore
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST new user
router.post('/', async (req: Request, res: Response) => {
  const { email, role, businessId } = req.body;
  const user = await prisma.user.create({
    data: { email, role, businessId },
  });
  res.status(201).json(user);
});

// PUT update user
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, role, businessId } = req.body;
  const user = await prisma.user.update({
    where: { id },
    data: { email, role, businessId },
  });
  res.json(user);
});

// DELETE user
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  res.status(204).send();
});

export default router; 