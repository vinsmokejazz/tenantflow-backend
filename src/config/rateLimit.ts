import { config } from './config';

// Environment-specific rate limiting configuration
export const getRateLimitConfig = () => {
  const isDevelopment = config.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return {
      windowMs: 60000, // 1 minute
      max: 1000, // 1000 requests per minute
      message: 'Too many requests from this IP, please try again later.',
      skip: (req: any) => req.path === '/health',
    };
  }
  
  // Production settings
  return {
    windowMs: 900000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
    skip: (req: any) => req.path === '/health',
  };
}; 