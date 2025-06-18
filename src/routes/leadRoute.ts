import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/authRoles';
import { validateRequest } from '../middleware/validationMiddleware';
import { leadValidation } from '../validations/lead.validation';
import { AppError } from '../utils/error';

const leadRouter = express.Router();
const prisma = new PrismaClient();

leadRouter.use(cors());

// Apply authentication to all routes
leadRouter.use(authenticate);

// GET all leads
leadRouter.get('/', validateRequest(leadValidation.getLeads), async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.businessId;
  
  try {
    const leads = await prisma.lead.findMany({
      where: { businessId }
    });
    res.json(leads);
  } catch (error) {
    next(error);
  }
});

// GET lead by ID
leadRouter.get('/:id', validateRequest(leadValidation.getLead), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  try {
    const lead = await prisma.lead.findFirst({
      where: { 
        id,
        businessId
      }
    });
    
    if (!lead) {
      next(AppError.NotFoundError('Lead not found'));
      return;
    }
    
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

// POST new lead
leadRouter.post('/', validateRequest(leadValidation.createLead), async (req: Request, res: Response, next: NextFunction) => {
  const { status, notes, clientId } = req.body;
  const businessId = req.user?.businessId;

  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
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
  } catch (error) {
    next(error);
  }
});

// PUT update lead - admin only
leadRouter.put('/:id', requireAdmin, validateRequest(leadValidation.updateLead), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const businessId = req.user?.businessId;

  try {
    const lead = await prisma.lead.updateMany({
      where: { 
        id,
        businessId
      },
      data: { 
        status, 
        notes 
      }
    });

    if (lead.count === 0) {
      next(AppError.NotFoundError('Lead not found or not authorized'));
      return;
    }

    res.json({ message: 'Lead updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE lead - admin only
leadRouter.delete('/:id', requireAdmin, validateRequest(leadValidation.deleteLead), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  try {
    const deleted = await prisma.lead.deleteMany({
      where: { 
        id,
        businessId
      }
    });

    if (deleted.count === 0) {
      next(AppError.NotFoundError('Lead not found or not authorized'));
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default leadRouter; 