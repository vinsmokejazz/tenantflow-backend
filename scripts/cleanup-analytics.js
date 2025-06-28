const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicateAnalytics() {
  try {
    console.log('Starting cleanup of duplicate analytics records...');
    
    // Get all businesses
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`Found ${businesses.length} businesses`);
    
    for (const business of businesses) {
      try {
        console.log(`Cleaning up analytics for business: ${business.name} (${business.id})`);
        
        // Get all analytics records for this business
        const analytics = await prisma.analytics.findMany({
          where: { businessId: business.id },
          orderBy: { date: 'desc' }
        });
        
        console.log(`Found ${analytics.length} analytics records`);
        
        // Group by date (day only, ignoring time)
        const groupedByDate = {};
        analytics.forEach(record => {
          const dateKey = new Date(record.date.getFullYear(), record.date.getMonth(), record.date.getDate()).toISOString();
          if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
          }
          groupedByDate[dateKey].push(record);
        });
        
        // Remove duplicates, keeping only the most recent one for each date
        let deletedCount = 0;
        for (const [dateKey, records] of Object.entries(groupedByDate)) {
          if (records.length > 1) {
            // Sort by updatedAt to get the most recent
            records.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            
            // Keep the first (most recent) one, delete the rest
            const toDelete = records.slice(1);
            for (const record of toDelete) {
              await prisma.analytics.delete({
                where: { id: record.id }
              });
              deletedCount++;
            }
          }
        }
        
        console.log(`✓ Cleaned up ${deletedCount} duplicate records for business: ${business.name}`);
      } catch (error) {
        console.error(`✗ Failed to clean up analytics for business ${business.name}:`, error.message);
      }
    }
    
    console.log('Analytics cleanup completed!');
  } catch (error) {
    console.error('Error cleaning up analytics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
cleanupDuplicateAnalytics(); 