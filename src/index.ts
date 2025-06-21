import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { logger } from './utils/logger';
import { config } from './config/config';
import { getRateLimitConfig } from './config/rateLimit';
import { prisma } from './config/prisma';

// Route imports
import authRouter from './routes/authRoute';
import clientRouter from './routes/clientRoute';
import businessRouter from './routes/businessRoute';
import userRouter from './routes/userRoute';
import followUpRouter from './routes/followUpRoute';
import leadRouter from './routes/leadRoute';
import analyticsRouter from './routes/analyticsRoute';
import dealRouter from './routes/dealRoute';
import reportRouter from './routes/reportRoute';
import aiInsightsRouter from './routes/aiInsightsRoute';
import subscriptionRouter from './routes/subscriptionRoute';

// Create Express app
export const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: config.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Rate limiting - environment-specific configuration
const rateLimitConfig = getRateLimitConfig();
const limiter = rateLimit({
  ...rateLimitConfig,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000), // seconds
    });
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API versioning
const API_VERSION = 'v1';

// Routes
app.use(`/api/${API_VERSION}/auth`, authRouter);
app.use(`/api/${API_VERSION}/clients`, clientRouter);
app.use(`/api/${API_VERSION}/business`, businessRouter);
app.use(`/api/${API_VERSION}/user`, userRouter);
app.use(`/api/${API_VERSION}/follow-ups`, followUpRouter);
app.use(`/api/${API_VERSION}/leads`, leadRouter);
app.use(`/api/${API_VERSION}/analytics`, analyticsRouter);
app.use(`/api/${API_VERSION}/deals`, dealRouter);
app.use(`/api/${API_VERSION}/reports`, reportRouter);
app.use(`/api/${API_VERSION}/ai-insights`, aiInsightsRouter);
app.use(`/api/${API_VERSION}/subscription`, subscriptionRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version,
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close Prisma connection
    await prisma.$disconnect();
    logger.info('Database connection closed');
    
    // Close server
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Server start
async function main(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connection established');
    
    app.listen(config.PORT, () => {
      logger.info(`Server is running at http://localhost:${config.PORT}`);
      logger.info(`API version: ${API_VERSION}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Replace main() call with conditional
if (process.env.NODE_ENV !== 'test') {
  main();
}



