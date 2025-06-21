import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        businessId: string;
      };
      clientLimitInfo?: {
        currentCount: number;
        limit: number;
        subscription: string;
        canAddMore: boolean;
        remainingSlots: number;
        usagePercentage: number;
        isApproachingLimit: boolean;
        isAtLimit: boolean;
      };
    }
  }
} 