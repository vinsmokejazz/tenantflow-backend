import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../utils/error';

const reportRouter = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
reportRouter.use(authenticate);

// GET all reports
reportRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.businessId;
  
  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }
  
  try {
    const reports = await prisma.report.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    next(error);
  }
});

// GET report by ID
reportRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }

  try {
    const report = await prisma.report.findFirst({
      where: { 
        id,
        businessId
      }
    });
    
    if (!report) {
      next(AppError.NotFoundError('Report not found'));
      return;
    }
    res.json(report);
  } catch (error) {
    next(error);
  }
});

// POST new report
reportRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { name, type, date } = req.body;
  const businessId = req.user?.businessId;

  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }

  if (!name || !type || !date) {
    next(AppError.ValidationError('Name, type, and date are required'));
    return;
  }

  try {
    // Generate report data based on type
    const reportData = await generateReportData(type, businessId);
    
    const report = await prisma.report.create({
      data: {
        name,
        type,
        data: reportData,
        businessId
      }
    });
    
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
});

// PUT update report
reportRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, type, date } = req.body;
  const businessId = req.user?.businessId;

  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }

  try {
    // First check if report exists
    const existingReport = await prisma.report.findFirst({
      where: { 
        id,
        businessId
      }
    });

    if (!existingReport) {
      next(AppError.NotFoundError('Report not found or not authorized'));
      return;
    }

    // Update the report
    const updatedReport = await prisma.report.update({
      where: { id },
      data: { 
        name,
        type
      }
    });

    res.json(updatedReport);
  } catch (error) {
    next(error);
  }
});

// GET report data (for viewing detailed report)
reportRouter.get('/:id/data', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }

  try {
    const report = await prisma.report.findFirst({
      where: { 
        id,
        businessId
      }
    });
    
    if (!report) {
      next(AppError.NotFoundError('Report not found'));
      return;
    }

    // Return the report data
    res.json({
      id: report.id,
      name: report.name,
      type: report.type,
      data: report.data,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

// DELETE report
reportRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }

  try {
    const deleted = await prisma.report.deleteMany({
      where: { 
        id,
        businessId
      }
    });

    if (deleted.count === 0) {
      next(AppError.NotFoundError('Report not found or not authorized'));
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Helper function to generate report data based on type
async function generateReportData(type: string, businessId: string) {
  switch (type.toLowerCase()) {
    case 'leads':
      return await generateLeadsReport(businessId);
    case 'clients':
      return await generateClientsReport(businessId);
    case 'followups':
      return await generateFollowUpsReport(businessId);
    case 'sales':
      return await generateSalesReport(businessId);
    default:
      return { message: 'Report type not supported' };
  }
}

// Helper functions for specific report types
async function generateLeadsReport(businessId: string) {
  const leads = await prisma.lead.findMany({
    where: { businessId },
    include: { client: true }
  });

  const leadsByStatus = await prisma.lead.groupBy({
    by: ['status'],
    where: { businessId },
    _count: { status: true }
  });

  return {
    type: 'leads',
    totalLeads: leads.length,
    leadsByStatus,
    recentLeads: leads.slice(0, 10),
    conversionRate: await calculateConversionRate(businessId)
  };
}

async function generateClientsReport(businessId: string) {
  const clients = await prisma.client.findMany({
    where: { businessId },
    include: {
      _count: {
        select: {
          leads: true,
          followUps: true,
          deals: true
        }
      }
    }
  });

  return {
    type: 'clients',
    totalClients: clients.length,
    clientsWithLeads: clients.filter(c => c._count.leads > 0).length,
    clientsWithDeals: clients.filter(c => c._count.deals > 0).length,
    topClients: clients
      .sort((a, b) => b._count.leads - a._count.leads)
      .slice(0, 5)
  };
}

async function generateFollowUpsReport(businessId: string) {
  const followUps = await prisma.followUp.findMany({
    where: { businessId },
    include: { client: true }
  });

  const completed = followUps.filter(f => f.completed);
  const pending = followUps.filter(f => !f.completed);
  const overdue = pending.filter(f => f.dueDate < new Date());

  return {
    type: 'followups',
    totalFollowUps: followUps.length,
    completed: completed.length,
    pending: pending.length,
    overdue: overdue.length,
    completionRate: followUps.length > 0 ? (completed.length / followUps.length) * 100 : 0
  };
}

async function generateSalesReport(businessId: string) {
  const deals = await prisma.deal.findMany({
    where: { businessId },
    include: { client: true }
  });

  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const dealsByStage = await prisma.deal.groupBy({
    by: ['stage'],
    where: { businessId },
    _sum: { value: true },
    _count: { stage: true }
  });

  return {
    type: 'sales',
    totalDeals: deals.length,
    totalValue,
    dealsByStage,
    averageDealValue: deals.length > 0 ? totalValue / deals.length : 0
  };
}

async function calculateConversionRate(businessId: string) {
  const [leads, deals] = await Promise.all([
    prisma.lead.count({ where: { businessId } }),
    prisma.deal.count({ where: { businessId } })
  ]);
  return leads > 0 ? (deals / leads) * 100 : 0;
}

export default reportRouter; 