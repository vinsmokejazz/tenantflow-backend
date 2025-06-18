import { z } from 'zod';

export const followUpValidation = {
  getFollowUps: z.object({
    query: z.object({
      clientId: z.string().uuid().optional(),
      completed: z.boolean().optional(),
      dueDate: z.string().datetime().optional()
    }).optional()
  }),

  getFollowUp: z.object({
    params: z.object({
      id: z.string().uuid()
    })
  }),

  createFollowUp: z.object({
    body: z.object({
      notes: z.string().min(1, 'Notes are required'),
      dueDate: z.string().datetime(),
      clientId: z.string().uuid()
    })
  }),

  updateFollowUp: z.object({
    params: z.object({
      id: z.string().uuid()
    }),
    body: z.object({
      notes: z.string().min(1, 'Notes are required').optional(),
      dueDate: z.string().datetime().optional(),
      completed: z.boolean().optional()
    })
  }),

  deleteFollowUp: z.object({
    params: z.object({
      id: z.string().uuid()
    })
  })
}; 