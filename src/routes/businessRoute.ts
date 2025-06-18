import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/authRoles';
import { validateRequest } from '../middleware/validationMiddleware';
import { businessValidation } from '../validations/business.validation';
import { AppError } from '../utils/error';

const businessRouter = express.Router();
const prisma = new PrismaClient();

businessRouter.use(cors());

// Apply authentication to all routes
businessRouter.use(authenticate);

businessRouter.get('/', (async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.business_id;
  
  try {
    const business = await prisma.business.findFirst({
      where: { id: businessId }
    });
    
    if (!business) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    
    res.json(business);
    return;
  } catch (error: any) {
    next(error); return;
  }
}) as RequestHandler);

// GET business by ID
businessRouter.get('/:id', validateRequest(businessValidation.getBusiness), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  if (id !== businessId) {
    next(AppError.AuthorizationError('Not authorized to access this business'));
    return;
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id }
    });
    
    if (!business) {
      next(AppError.NotFoundError('Business not found'));
      return;
    }
    
    res.json(business);
  } catch (error) {
    next(error);
  }
});

// POST create business - admin only
businessRouter.post('/', requireAdmin, validateRequest(businessValidation.createBusiness), async (req: Request, res: Response, next: NextFunction) => {
  const { name, subscription } = req.body;
  const businessId = req.user?.businessId;

  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }

  try {
    const business = await prisma.business.create({
      data: {
        id: businessId,
        name,
        subscription,
      },
    });
    res.status(201).json(business);
  } catch (error) {
    next(error);
  }
});

// PUT update business - admin only
businessRouter.put('/:id', requireAdmin, validateRequest(businessValidation.updateBusiness), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, subscription } = req.body;
  const businessId = req.user?.businessId;

  if (id !== businessId) {
    next(AppError.AuthorizationError('Not authorized to update this business'));
    return;
  }

  try {
    const business = await prisma.business.update({
      where: { id },
      data: {
        name,
        subscription
      }
    });
    res.json(business);
  } catch (error) {
    next(error);
  }
});

// DELETE business - admin only
businessRouter.delete('/:id', requireAdmin, validateRequest(businessValidation.deleteBusiness), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  if (id !== businessId) {
    next(AppError.AuthorizationError('Not authorized to delete this business'));
    return;
  }

  try {
    await prisma.business.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default businessRouter;