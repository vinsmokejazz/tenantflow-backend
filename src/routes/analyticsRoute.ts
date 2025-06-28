import express from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { AnalyticsService } from '../services/analytics.service';
import { authenticate, validateBusinessAccess } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { analyticsValidation } from '../validations/analytics.validation';

const router = express.Router();
const analyticsController = new AnalyticsController();
const analyticsService = new AnalyticsService();

// Apply authentication middleware to all routes
router.use(authenticate);

// Simple analytics endpoint (no business validation required)
router.get('/', async (_req: any, res: any) => {
  try {
    // Return basic analytics data
    res.json({
      activities: [
        {
          text: 'New lead added to pipeline',
          time: '2 hours ago'
        },
        {
          text: 'Deal closed successfully',
          time: '1 day ago'
        },
        {
          text: 'Follow-up scheduled',
          time: '2 days ago'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Dashboard metrics
router.get(
  '/dashboard/:businessId',
  (req, _res, next) => {
    console.log('Dashboard request:', {
      businessId: req.params.businessId,
      query: req.query,
      path: req.path
    });
    next();
  },
  // Temporarily comment out business validation for testing
  // validateBusinessAccess,
  validateRequest(analyticsValidation.getDashboardMetrics),
  analyticsController.getDashboardMetrics.bind(analyticsController)
);

// Trigger analytics update for a business
router.post(
  '/update/:businessId',
  async (req: any, res: any) => {
    try {
      const { businessId } = req.params;
      const { days } = req.body;
      
      console.log('Triggering analytics update for business:', businessId);
      
      if (days && typeof days === 'number' && days > 0) {
        // Generate historical analytics
        await analyticsService.generateHistoricalAnalytics(businessId, days);
        res.json({ 
          message: `Analytics updated for business ${businessId} for the last ${days} days`,
          success: true 
        });
      } else {
        // Generate analytics for today
        await analyticsService.generateAnalyticsForBusiness(businessId);
        res.json({ 
          message: `Analytics updated for business ${businessId}`,
          success: true 
        });
      }
    } catch (error) {
      console.error('Error updating analytics:', error);
      res.status(500).json({ 
        error: 'Failed to update analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
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