import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { AnalyticsService } from '../services/analytics.service';
import { AppError } from '../utils/error';

const dealRouter = express.Router();
const prisma = new PrismaClient();
const analyticsService = new AnalyticsService();

// Apply authentication to all routes
dealRouter.use(authenticate);

// Helper function to update analytics after data changes
const updateAnalytics = async (businessId: string) => {
  try {
    await analyticsService.updateAnalyticsOnDataChange(businessId);
  } catch (error) {
    console.error('Failed to update analytics:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// GET all deals
dealRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    const where: any = { businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const deals = await prisma.deal.findMany({
      where,
      include: {
        client: true,
        lead: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(deals);
  } catch (error) {
    next(error);
  }
});

// GET deal by ID
dealRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    const where: any = { id, businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const deal = await prisma.deal.findFirst({
      where,
      include: {
        client: true,
        lead: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });
    if (!deal) {
      next(AppError.NotFoundError('Deal not found'));
      return;
    }
    res.json(deal);
  } catch (error) {
    next(error);
  }
});

// POST new deal
dealRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { title, value, stage, clientId, leadId, expectedCloseDate, description, assignedTo } = req.body;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }
  // Validate required fields
  if (!title || !stage) {
    next(AppError.ValidationError('Title and stage are required'));
    return;
  }
  // Validate and parse value
  let parsedValue = 0;
  if (value !== undefined && value !== null && value !== '') {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      next(AppError.ValidationError('Value must be a valid number'));
      return;
    }
    parsedValue = numValue;
  }
  // Validate and parse expectedCloseDate (optional)
  let parsedDate = null;
  if (expectedCloseDate && expectedCloseDate !== '') {
    const date = new Date(expectedCloseDate);
    if (isNaN(date.getTime())) {
      next(AppError.ValidationError('Expected close date must be a valid date'));
      return;
    }
    parsedDate = date;
  }
  // Handle optional fields
  const validClientId = (clientId && clientId !== '') ? clientId : null;
  const validLeadId = (leadId && leadId !== '') ? leadId : null;
  const validDescription = (description && description !== '') ? description : null;
  try {
    const data: any = {
      title,
      value: parsedValue,
      stage,
      clientId: validClientId,
      leadId: validLeadId,
      expectedCloseDate: parsedDate,
      description: validDescription,
      businessId
    };
    if (userRole === 'admin') {
      data.assignedTo = assignedTo || null;
    } else if (userRole === 'staff') {
      data.assignedTo = userId;
    }
    const deal = await prisma.deal.create({
      data,
      include: {
        client: true,
        lead: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });
    
    // Update analytics after creating deal
    await updateAnalytics(businessId);
    
    res.status(201).json(deal);
  } catch (error) {
    next(error);
  }
});

// PUT update deal
dealRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { title, value, stage, expectedCloseDate, description, assignedTo } = req.body;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    const where: any = { id, businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const existing = await prisma.deal.findFirst({ where });
    if (!existing) {
      next(AppError.NotFoundError('Deal not found or not authorized'));
      return;
    }
    const updateData: any = {
      title,
      value: value ? parseFloat(value) : undefined,
      stage,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      description
    };
    if (userRole === 'admin') {
      updateData.assignedTo = assignedTo || null;
    }
    const updated = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        lead: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });
    
    // Update analytics after updating deal
    await updateAnalytics(businessId);
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE deal
dealRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  try {
    const where: any = { id, businessId };
    if (userRole === 'staff') {
      where.assignedTo = userId;
    }
    const existing = await prisma.deal.findFirst({ where });
    if (!existing) {
      next(AppError.NotFoundError('Deal not found or not authorized'));
      return;
    }
    await prisma.deal.delete({ where: { id } });
    
    // Update analytics after deleting deal
    await updateAnalytics(businessId);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default dealRouter; 