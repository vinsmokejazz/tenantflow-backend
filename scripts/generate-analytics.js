const { PrismaClient } = require('@prisma/client');
const { AnalyticsService } = require('../src/services/analytics.service');

const prisma = new PrismaClient();
const analyticsService = new AnalyticsService();

async function generateAnalyticsForAllBusinesses() {
  try {
    console.log('Starting analytics generation for all businesses...');
    
    // Get all businesses
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`Found ${businesses.length} businesses`);
    
    for (const business of businesses) {
      try {
        console.log(`Generating analytics for business: ${business.name} (${business.id})`);
        
        // Generate analytics for the last 30 days
        await analyticsService.generateHistoricalAnalytics(business.id, 30);
        
        console.log(`✓ Analytics generated for business: ${business.name}`);
      } catch (error) {
        console.error(`✗ Failed to generate analytics for business ${business.name}:`, error.message);
      }
    }
    
    console.log('Analytics generation completed!');
  } catch (error) {
    console.error('Error generating analytics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateAnalyticsForAllBusinesses(); 