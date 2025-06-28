import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { checkClientLimit } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { clientValidation } from '../validations/client.validation';
import { AnalyticsService } from '../services/analytics.service';

const clientRouter = express.Router();
const prisma = new PrismaClient();
const analyticsService = new AnalyticsService();

// Enable CORS for all routes
clientRouter.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Helper function to update analytics after data changes
const updateAnalytics = async (businessId: string) => {
  try {
    await analyticsService.updateAnalyticsOnDataChange(businessId);
  } catch (error) {
    console.error('Failed to update analytics:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// GET all clients for business
clientRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const businessId = req.user?.businessId;

  if (!businessId) {
    res.status(403).json({ error: "Unauthorized: missing business ID" });
    return;
  }

  try {
    const clients = await prisma.client.findMany({
      where: { businessId }
    });
    
    res.json(clients);
  } catch (error: any) {
    next(error);
  }
});

// GET client details with leads, follow-ups, and deals
clientRouter.get('/:id/details', validate(clientValidation.getClient), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  try {
    const client = await prisma.client.findFirst({
      where: { id, businessId },
      include: {
        leads: {
          select: {
            id: true,
            status: true,
            notes: true,
            createdAt: true,
            assignedTo: true
          },
          orderBy: { createdAt: 'desc' }
        },
        followUps: {
          select: {
            id: true,
            notes: true,
            dueDate: true,
            completed: true,
            createdAt: true,
            assignedTo: true
          },
          orderBy: { dueDate: 'asc' }
        },
        deals: {
          select: {
            id: true,
            title: true,
            value: true,
            stage: true,
            expectedCloseDate: true,
            createdAt: true,
            assignedTo: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    
    res.json(client);
  } catch (error) {
    next(error);
  }
});

// GET client limit info
clientRouter.get('/limit/info', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const businessId = req.user?.businessId;

  if (!businessId) {
    res.status(403).json({ error: "Unauthorized: missing business ID" });
    return;
  }

  try {
    const clientCount = await prisma.client.count({
      where: { businessId }
    });
    
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { subscription: true }
    });

    const limits = {
      free: 10,
      pro: 100,
      enterprise: 1000
    };

    const limit = limits[business?.subscription as keyof typeof limits] || limits.free;
    const canAddMore = clientCount < limit;
    const remainingSlots = Math.max(0, limit - clientCount);
    const usagePercentage = Math.round((clientCount / limit) * 100);

    res.json({
      currentCount: clientCount,
      limit,
      subscription: business?.subscription || 'free',
      canAddMore,
      remainingSlots,
      usagePercentage,
      isApproachingLimit: usagePercentage >= 80,
      isAtLimit: !canAddMore
    });
  } catch (error: any) {
    next(error);
  }
});

// POST create client
clientRouter.post('/', authenticate, checkClientLimit, validate(clientValidation.createClient), async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, phone } = req.body;
  const businessId = req.user?.businessId;
  const limitInfo = req.clientLimitInfo;

  try {
    // Check if we can add more clients
    if (!limitInfo?.canAddMore) {
      return res.status(403).json({
        error: 'Client limit reached',
        details: {
          currentCount: limitInfo?.currentCount,
          limit: limitInfo?.limit,
          subscription: limitInfo?.subscription,
          message: `You have reached the maximum of ${limitInfo?.limit} clients for your ${limitInfo?.subscription} subscription. Please upgrade to add more clients.`
        }
      });
    }

    // Check if approaching limit
    if (limitInfo?.isApproachingLimit) {
      console.log(`Warning: Business ${businessId} is approaching client limit (${limitInfo.currentCount}/${limitInfo.limit})`);
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        businessId: businessId!
      }
    });

    // Update analytics after creating client
    await updateAnalytics(businessId!);

    res.status(201).json({
      ...client,
      limitInfo: {
        currentCount: limitInfo?.currentCount + 1,
        limit: limitInfo?.limit,
        remainingSlots: limitInfo?.remainingSlots - 1,
        usagePercentage: Math.round(((limitInfo?.currentCount + 1) / limitInfo?.limit) * 100)
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT update client
clientRouter.put('/:id', authenticate, validate(clientValidation.updateClient), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  const businessId = req.user?.businessId;

  if (!businessId) {
    res.status(403).json({ error: "Unauthorized: missing business ID" });
    return;
  }

  try {
    const existingClient = await prisma.client.findFirst({
      where: { id, businessId }
    });

    if (!existingClient) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: { name, email, phone }
    });

    // Update analytics after updating client
    await updateAnalytics(businessId);

    res.json(updatedClient);
  } catch (error) {
    next(error);
  }
});

// DELETE client
clientRouter.delete('/:id', authenticate, validate(clientValidation.deleteClient), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  if (!businessId) {
    res.status(403).json({ error: "Unauthorized: missing business ID" });
    return;
  }

  try {
    const existingClient = await prisma.client.findFirst({
      where: { id, businessId }
    });

    if (!existingClient) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    await prisma.client.delete({
      where: { id }
    });

    // Update analytics after deleting client
    await updateAnalytics(businessId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default clientRouter;
