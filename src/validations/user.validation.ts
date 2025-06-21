import { z } from 'zod';

export const userValidation = {
  getUsers: z.object({
    query: z.object({
      role: z.enum(['admin', 'staff']).optional()
    }).optional()
  }),

  getUser: z.object({
    params: z.object({
      id: z.string().uuid()
    })
  }),

  createUser: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      name: z.string().min(1, 'Name is required'),
      role: z.enum(['admin', 'staff']).default('staff'),
      password: z.string().optional()
    })
  }),

  updateUser: z.object({
    params: z.object({
      id: z.string().uuid()
    }),
    body: z.object({
      email: z.string().email('Invalid email address').optional(),
      name: z.string().min(1, 'Name is required').optional(),
      role: z.enum(['admin', 'staff']).optional()
    })
  }),

  deleteUser: z.object({
    params: z.object({
      id: z.string().uuid()
    })
  })
}; 