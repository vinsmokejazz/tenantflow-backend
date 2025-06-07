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
  } catch (error: any) {
    next(error);
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
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json(lead);
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// POST new lead
LeadRouter.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  const { status, notes, clientId } = req.body;
  const businessId = req.user?.business_id;

  if (!businessId) {
    return res.status(403).json({ error: "Unauthorized: missing business ID" });
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
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// PUT update lead
LeadRouter.put('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, notes, clientId } = req.body;
  const businessId = req.user?.business_id;

  try {
    const lead = await prisma.lead.updateMany({
      where: { 
        id,
        businessId
      },
      data: { 
        status, 
        notes, 
        clientId
      },
    });

    if (lead.count === 0) {
      return res.status(404).json({ error: 'Lead not found or not authorized' });
    }

    res.json({ message: 'Lead updated successfully' });
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

// DELETE lead
LeadRouter.delete('/:id', (async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.business_id;

  try {
    const deleted = await prisma.lead.deleteMany({
      where: { 
        id,
        businessId
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Lead not found or not authorized' });
    }

    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
}) as RequestHandler);

export default LeadRouter; 