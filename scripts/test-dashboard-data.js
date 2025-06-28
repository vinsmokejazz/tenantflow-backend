const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDashboardData() {
  try {
    console.log('🧪 Testing Dashboard Data Generation...\n');

    // Get all businesses
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`📊 Found ${businesses.length} businesses:\n`);
    
    for (const business of businesses) {
      console.log(`\n🏢 Testing business: ${business.name} (ID: ${business.id})\n`);
      
      // Get deals for this business
      const deals = await prisma.deal.findMany({
        where: { businessId: business.id },
        select: {
          id: true,
          title: true,
          value: true,
          stage: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      });

      console.log(`📈 Found ${deals.length} deals for this business:`);
      deals.forEach(deal => {
        console.log(`  - ${deal.title} (${deal.stage}) - $${deal.value} - ${deal.createdAt.toLocaleDateString()}`);
      });

      if (deals.length === 0) {
        console.log('  No deals found for this business.');
        continue;
      }

      // Test 2: Simulate the monthly revenue data generation
      console.log('\n🔄 Simulating monthly revenue data generation...');
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const monthlyData = [];

      // Initialize data for last 12 months (including current month)
      for (let i = 11; i >= 0; i--) {
        const targetMonth = currentMonth - i;
        const targetYear = currentYear + Math.floor(targetMonth / 12);
        const adjustedMonth = ((targetMonth % 12) + 12) % 12; // Handle negative months
        const monthKey = months[adjustedMonth];
        
        monthlyData.push({
          month: monthKey,
          revenue: 0,
          deals: 0,
          conversionRate: 0
        });
      }

      console.log('📅 Initialized months:', monthlyData.map(d => d.month));

      // Calculate revenue and deals for each month
      deals.forEach(deal => {
        const dealDate = new Date(deal.createdAt);
        const dealYear = dealDate.getFullYear();
        const dealMonth = dealDate.getMonth();
        
        // Find the corresponding month in our data
        const monthIndex = monthlyData.findIndex((item, index) => {
          const targetMonth = currentMonth - (11 - index);
          const targetYear = currentYear + Math.floor(targetMonth / 12);
          const adjustedMonth = ((targetMonth % 12) + 12) % 12;
          
          return dealYear === targetYear && dealMonth === adjustedMonth;
        });

        if (monthIndex !== -1) {
          // Count all deals
          monthlyData[monthIndex].deals += 1;
          
          // Add revenue for closed deals
          if (deal.stage === 'closed_won' || deal.stage === 'closed' || deal.stage === 'won' || deal.stage === 'completed') {
            monthlyData[monthIndex].revenue += deal.value || 0;
          }
          
          console.log(`  ✅ Deal "${deal.title}" assigned to ${monthlyData[monthIndex].month}`);
        } else {
          console.log(`  ❌ Deal "${deal.title}" from ${dealDate.toLocaleDateString()} not assigned to any month`);
        }
      });

      // Calculate conversion rates
      monthlyData.forEach((month, index) => {
        if (index > 0) {
          const previousMonth = monthlyData[index - 1];
          const totalDeals = month.deals + previousMonth.deals;
          month.conversionRate = totalDeals > 0 ? Math.round((month.deals / totalDeals) * 100) : 0;
        } else {
          month.conversionRate = month.deals > 0 ? 100 : 0;
        }
      });

      // Test 3: Verify results
      console.log('\n📊 Final Monthly Data:');
      console.log('Month\tRevenue\tDeals\tConversion Rate');
      console.log('-----\t-------\t-----\t---------------');
      monthlyData.forEach(month => {
        console.log(`${month.month}\t$${month.revenue}\t${month.deals}\t${month.conversionRate}%`);
      });

      // Test 4: Validation
      console.log('\n✅ Validation Results:');
      console.log(`  - Total months returned: ${monthlyData.length} ${monthlyData.length === 12 ? '✅' : '❌'}`);
      console.log(`  - Expected: 12 months`);
      
      const totalRevenue = monthlyData.reduce((sum, month) => sum + month.revenue, 0);
      const totalDeals = monthlyData.reduce((sum, month) => sum + month.deals, 0);
      
      console.log(`  - Total revenue across all months: $${totalRevenue}`);
      console.log(`  - Total deals across all months: ${totalDeals}`);
      
      const closedDeals = deals.filter(deal => 
        deal.stage === 'closed_won' || 
        deal.stage === 'closed' || 
        deal.stage === 'won' || 
        deal.stage === 'completed'
      );
      const expectedRevenue = closedDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
      
      console.log(`  - Expected revenue from closed deals: $${expectedRevenue}`);
      console.log(`  - Revenue calculation ${totalRevenue === expectedRevenue ? '✅' : '❌'}`);
      
      const allZero = monthlyData.every(month => month.revenue === 0 && month.deals === 0);
      console.log(`  - All months have zero data: ${allZero ? 'Yes' : 'No'}`);
      
      if (allZero) {
        console.log('\n💡 Recommendations:');
        console.log('  - Create deals with different stages to see revenue data');
        console.log('  - Change deal stages to closed_won, closed, won, or completed to see revenue');
        console.log('  - Add deals from different months to see historical data');
      }

      console.log('\n' + '='.repeat(60));
    }

  } catch (error) {
    console.error('❌ Error testing dashboard data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDashboardData(); 