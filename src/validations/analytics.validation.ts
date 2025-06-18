import { z } from 'zod';

export const analyticsValidation = {
  getDashboardMetrics: z.object({
    params: z.object({
      businessId: z.string().min(1)
    }),
    query: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional()
    })
  }),

  getSalesPipeline: z.object({
    params: z.object({
      businessId: z.string().min(1)
    }),
    query: z.object({
      period: z.enum(['week', 'month', 'quarter', 'year']).default('month')
    })
  }),

  getLeadConversion: z.object({
    params: z.object({
      businessId: z.string().min(1)
    }),
    query: z.object({
      period: z.enum(['week', 'month', 'quarter', 'year']).default('month')
    })
  }),

  getPredictions: z.object({
    params: z.object({
      businessId: z.string().min(1)
    })
  })
}; 