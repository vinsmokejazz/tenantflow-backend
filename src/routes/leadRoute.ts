import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/authMiddleware';

const LeadRouter = express.Router();
const prisma = new PrismaClient();

LeadRouter.use(cors());
LeadRouter.use(authenticateUser as RequestHandler);

// GET all leads
LeadRouter.get('/', (async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.business_id;
  
  try {
    const leads = await prisma.lead.findMany({
      where: { businessId }
    });
    res.json(leads);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

LeadRouter.get('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.business_id;

  try {
    const lead = await prisma.lead.findFirst({
      where: { 
        id,
        businessId
      }
    });
    
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    
    res.json(lead);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

// POST new lead
LeadRouter.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { status, notes, clientId } = req.body;
  const businessId = req.user?.business_id;

  if (!businessId) {
    res.status(403).json({ error: "Unauthorized: missing business ID" });
    return;
  }

  try {
    const lead = await prisma.lead.create({
      data: { 
        status, 
        notes, 
        clientId, 
        businessId 
      },
    });
    res.status(201).json(lead);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

// PUT update lead
LeadRouter.put('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { status, notes },
    });
    res.json(lead);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

// DELETE lead
LeadRouter.delete('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    await prisma.lead.delete({ where: { id } });
    res.status(204).send();
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

export default LeadRouter; 