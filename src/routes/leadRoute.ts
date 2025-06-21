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
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    const where: any = { businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const leads = await prisma.lead.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
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
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    const where: any = { id, businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const lead = await prisma.lead.findFirst({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        assignedUser: {
          select: { id: true, name: true, email: true }
        }
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
  const { status, notes, clientId, assignedTo } = req.body;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }
  try {
    const data: any = { status, notes, clientId, businessId };
    // Only admin can assign to others or unassign; staff can only assign to self
    if (userRole === 'admin') {
      data.assignedTo = assignedTo || null;
    } else if (userRole === 'staff') {
      data.assignedTo = userId;
    }
    console.log('LEAD CREATE: data =', data);
    const lead = await prisma.lead.create({
      data,
      include: {
        client: { select: { id: true, name: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });
    console.log('LEAD CREATE: lead =', lead);
    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
});

// PUT update lead
leadRouter.put('/:id', validateRequest(leadValidation.updateLead), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, notes, assignedTo } = req.body;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    // Only allow update if admin or assigned staff
    const where: any = { id, businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const existingLead = await prisma.lead.findFirst({ where });
    if (!existingLead) {
      next(AppError.NotFoundError('Lead not found or not authorized'));
      return;
    }
    const updateData: any = { status, notes };
    // Only admin can reassign or unassign
    if (userRole === 'admin') {
      updateData.assignedTo = assignedTo || null;
    }
    console.log('LEAD UPDATE: updateData =', updateData);
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });
    console.log('LEAD UPDATE: updatedLead =', updatedLead);
    res.json(updatedLead);
  } catch (error) {
    next(error);
  }
});

// DELETE lead
leadRouter.delete('/:id', validateRequest(leadValidation.deleteLead), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    // Only allow delete if admin or assigned staff
    const where: any = { id, businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const existingLead = await prisma.lead.findFirst({ where });
    if (!existingLead) {
      next(AppError.NotFoundError('Lead not found or not authorized'));
      return;
    }
    await prisma.lead.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default leadRouter; 