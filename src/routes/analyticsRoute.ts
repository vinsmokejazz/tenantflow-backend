import express from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, validateBusinessAccess } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { analyticsValidation } from '../validations/analytics.validation';

const router = express.Router();
const analyticsController = new AnalyticsController();

// Apply authentication middleware to all routes
router.use(authenticate);

// Dashboard metrics
router.get(
  '/dashboard/:businessId',
  validateBusinessAccess,
  validateRequest(analyticsValidation.getDashboardMetrics),
  analyticsController.getDashboardMetrics.bind(analyticsController)
);

// Sales pipeline analytics
router.get(
  '/pipeline/:businessId',
  validateBusinessAccess,
  validateRequest(analyticsValidation.getSalesPipeline),
  analyticsController.getSalesPipeline.bind(analyticsController)
);

// Lead conversion analytics
router.get(
  '/conversion/:businessId',
  validateBusinessAccess,
  validateRequest(analyticsValidation.getLeadConversion),
  analyticsController.getLeadConversion.bind(analyticsController)
);

// AI predictions
router.get(
  '/predictions/:businessId',
  validateBusinessAccess,
  validateRequest(analyticsValidation.getPredictions),
  analyticsController.getPredictions.bind(analyticsController)
);

export default router; 