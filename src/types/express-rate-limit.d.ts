declare module 'express-rate-limit' {
  import { Request, Response, NextFunction } from 'express';

  interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: string | object;
    statusCode?: number;
    headers?: boolean;
    keyGenerator?: (req: Request) => string;
    handler?: (req: Request, res: Response, next: NextFunction) => void;
    skip?: (req: Request) => boolean;
    store?: any;
  }

  function rateLimit(options?: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => void;

  export = rateLimit;
} 