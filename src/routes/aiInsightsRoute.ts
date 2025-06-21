import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../utils/error';

const aiInsightsRouter = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
aiInsightsRouter.use(authenticate);

// GET AI insights
aiInsightsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const businessId = req.user?.businessId;
  
  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }
  
  try {
    const insights = await generateAIInsights(businessId);
    res.json(insights);
  } catch (error) {
    next(error);
  }
});

// GET specific insight type
aiInsightsRouter.get('/:type', async (req: Request, res: Response, next: NextFunction) => {
  const { type } = req.params;
  const businessId = req.user?.businessId;

  if (!businessId) {
    next(AppError.AuthorizationError('Unauthorized: missing business ID'));
    return;
  }

  try {
    const insight = await generateSpecificInsight(type, businessId);
    if (!insight) {
      next(AppError.NotFoundError('Insight type not found'));
      return;
    }
    res.json(insight);
  } catch (error) {
    next(error);
  }
});

// Helper function to generate AI insights
async function generateAIInsights(businessId: string) {
  const [
    clientInsights,
    leadInsights,
    followUpInsights,
    performanceInsights
  ] = await Promise.all([
    generateClientInsights(businessId),
    generateLeadInsights(businessId),
    generateFollowUpInsights(businessId),
    generatePerformanceInsights(businessId)
  ]);

  return {
    clientInsights,
    leadInsights,
    followUpInsights,
    performanceInsights,
    recommendations: generateRecommendations(businessId)
  };
}

// Helper function to generate specific insight
async function generateSpecificInsight(type: string, businessId: string) {
  switch (type) {
    case 'clients':
      return await generateClientInsights(businessId);
    case 'leads':
      return await generateLeadInsights(businessId);
    case 'followups':
      return await generateFollowUpInsights(businessId);
    case 'performance':
      return await generatePerformanceInsights(businessId);
    default:
      return null;
  }
}

// Client insights
async function generateClientInsights(businessId: string) {
  const clients = await prisma.client.findMany({
    where: { businessId },
    include: {
      _count: {
        select: {
          leads: true,
          followUps: true
        }
      }
    }
  });

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c._count.leads > 0 || c._count.followUps > 0).length;
  const inactiveClients = totalClients - activeClients;

  return {
    type: 'client',
    totalClients,
    activeClients,
    inactiveClients,
    engagementRate: totalClients > 0 ? (activeClients / totalClients) * 100 : 0,
    insights: [
      `${activeClients} out of ${totalClients} clients are actively engaged`,
      inactiveClients > 0 ? `Consider re-engaging ${inactiveClients} inactive clients` : 'All clients are engaged',
      'Focus on converting leads to active clients'
    ]
  };
}

// Lead insights
async function generateLeadInsights(businessId: string) {
  const leads = await prisma.lead.findMany({
    where: { businessId },
    include: { client: true }
  });

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;

  return {
    type: 'lead',
    totalLeads,
    newLeads,
    qualifiedLeads,
    qualificationRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
    insights: [
      `${newLeads} new leads need qualification`,
      `${qualifiedLeads} leads are ready for conversion`,
      'Focus on qualifying new leads quickly'
    ]
  };
}

// Follow-up insights
async function generateFollowUpInsights(businessId: string) {
  const followUps = await prisma.followUp.findMany({
    where: { businessId },
    include: { client: true }
  });

  const totalFollowUps = followUps.length;
  const completed = followUps.filter(f => f.completed).length;
  const pending = followUps.filter(f => !f.completed).length;
  const overdue = followUps.filter(f => !f.completed && f.dueDate < new Date()).length;

  return {
    type: 'followup',
    totalFollowUps,
    completed,
    pending,
    overdue,
    completionRate: totalFollowUps > 0 ? (completed / totalFollowUps) * 100 : 0,
    insights: [
      `${overdue} follow-ups are overdue`,
      `${pending} follow-ups are pending`,
      overdue > 0 ? 'Prioritize overdue follow-ups' : 'All follow-ups are on track'
    ]
  };
}

// Performance insights
async function generatePerformanceInsights(businessId: string) {
  const [clients, leads, followUps] = await Promise.all([
    prisma.client.count({ where: { businessId } }),
    prisma.lead.count({ where: { businessId } }),
    prisma.followUp.count({ where: { businessId } })
  ]);

  const conversionRate = leads > 0 ? (clients / leads) * 100 : 0;
  const followUpRate = clients > 0 ? (followUps / clients) : 0;

  return {
    type: 'performance',
    totalClients: clients,
    totalLeads: leads,
    totalFollowUps: followUps,
    conversionRate,
    followUpRate,
    insights: [
      `Lead to client conversion rate: ${conversionRate.toFixed(1)}%`,
      `Average follow-ups per client: ${followUpRate.toFixed(1)}`,
      conversionRate < 20 ? 'Consider improving lead qualification process' : 'Good conversion rate',
      followUpRate < 2 ? 'Increase follow-up frequency' : 'Good follow-up engagement'
    ]
  };
}

// Generate recommendations
function generateRecommendations(businessId: string) {
  return [
    {
      category: 'Lead Management',
      recommendations: [
        'Implement lead scoring to prioritize high-value prospects',
        'Set up automated follow-up sequences',
        'Track lead source performance'
      ]
    },
    {
      category: 'Client Engagement',
      recommendations: [
        'Schedule regular check-ins with active clients',
        'Create personalized communication templates',
        'Monitor client satisfaction metrics'
      ]
    },
    {
      category: 'Process Optimization',
      recommendations: [
        'Standardize follow-up procedures',
        'Use CRM automation for repetitive tasks',
        'Regular team training on best practices'
      ]
    }
  ];
}

export default aiInsightsRouter; 