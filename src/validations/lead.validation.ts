import { z } from 'zod';

export const leadValidation = {
  getLeads: z.object({
    query: z.object({
      status: z.enum(['new', 'contacted', 'qualified', 'lost']).optional(),
      clientId: z.string().uuid().optional()
    }).optional()
  }),

  getLead: z.object({
    params: z.object({
      id: z.string().uuid()
    })
  }),

  createLead: z.object({
    body: z.object({
      status: z.enum(['new', 'contacted', 'qualified', 'lost']).default('new'),
      notes: z.string().optional(),
      clientId: z.string().uuid()
    })
  }),

  updateLead: z.object({
    params: z.object({
      id: z.string().uuid()
    }),
    body: z.object({
      status: z.enum(['new', 'contacted', 'qualified', 'lost']).optional(),
      notes: z.string().optional()
    })
  }),

  deleteLead: z.object({
    params: z.object({
      id: z.string().uuid()
    })
  })
}; 