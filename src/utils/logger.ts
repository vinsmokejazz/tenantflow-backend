import winston from 'winston';
import { AppError, ErrorType } from './error';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
} as const;

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
} as const;

winston.addColors(logColors);

interface LogMetadata {
  timestamp: string;
  level: string;
  message: string;
  error?: {
    type: ErrorType;
    code: string;
    details?: Record<string, any>;
  };
  request?: {
    method: string;
    path: string;
    ip: string;
    userAgent?: string;
  };
  performance?: {
    duration: number;
    memory: number;
  };
}

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, error, request, performance } = info as any;
    let logMessage = `${timestamp} ${level}: ${message}`;

    if (error) {
      logMessage += `\nError: ${error.type} (${error.code})`;
      if (error.details) {
        logMessage += `\nDetails: ${JSON.stringify(error.details, null, 2)}`;
      }
    }

    if (request) {
      logMessage += `\nRequest: ${request.method} ${request.path} from ${request.ip}`;
      if (request.userAgent) {
        logMessage += ` (${request.userAgent})`;
      }
    }

    if (performance) {
      logMessage += `\nPerformance: ${performance.duration}ms, ${performance.memory}MB`;
    }

    return logMessage;
  })
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format
    )
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format
  }),
  new winston.transports.File({
    filename: 'logs/all.log',
    format
  })
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format,
  transports,
  defaultMeta: { service: 'tenantflow-backend' }
});

export const logError = (error: Error | AppError, req?: any): void => {
  const metadata: LogMetadata = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message
  };

  if (error instanceof AppError) {
    metadata.error = {
      type: error.type,
      code: error.code,
      details: error.details
    };
  }

  if (req) {
    metadata.request = {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
  }

  logger.error(metadata);
};

export const logRequest = (req: any, duration: number): void => {
  const metadata: LogMetadata = {
    timestamp: new Date().toISOString(),
    level: 'http',
    message: `${req.method} ${req.path}`,
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    },
    performance: {
      duration,
      memory: process.memoryUsage().heapUsed / 1024 / 1024
    }
  };

  logger.http(metadata);
}; 