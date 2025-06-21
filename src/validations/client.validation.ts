import { z } from 'zod';

export const clientValidation = {
  createClient: z.object({
    body: z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email format').optional().or(z.literal('')),
      phone: z.string().optional().or(z.literal(''))
    })
  }),

  updateClient: z.object({
    params: z.object({
      id: z.string().uuid('Invalid client ID')
    }),
    body: z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email format').optional().or(z.literal('')),
      phone: z.string().optional().or(z.literal(''))
    })
  }),

  getClient: z.object({
    params: z.object({
      id: z.string().uuid('Invalid client ID')
    })
  }),

  deleteClient: z.object({
    params: z.object({
      id: z.string().uuid('Invalid client ID')
    })
  })
}; 