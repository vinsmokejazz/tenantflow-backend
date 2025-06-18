import { z } from 'zod';

export const businessValidation = {
  getBusiness: z.object({
    params: z.object({
      id: z.string().uuid()
    })
  }),

  createBusiness: z.object({
    body: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      address: z.string().optional(),
      website: z.string().url().optional()
    })
  }),

  updateBusiness: z.object({
    params: z.object({
      id: z.string().uuid()
    }),
    body: z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      website: z.string().url().optional()
    })
  }),

  deleteBusiness: z.object({
    params: z.object({
      id: z.string().uuid()
    })
  })
}; 