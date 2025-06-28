const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDeals() {
  try {
    console.log('🔍 Checking all deals in database...\n');
    
    const deals = await prisma.deal.findMany({
      select: {
        id: true,
        title: true,
        value: true,
        stage: true,
        createdAt: true,
        businessId: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${deals.length} total deals:\n`);
    
    deals.forEach((deal, index) => {
      console.log(`${index + 1}. "${deal.title}"`);
      console.log(`   - Stage: ${deal.stage}`);
      console.log(`   - Value: $${deal.value || 0}`);
      console.log(`   - Created: ${deal.createdAt.toLocaleDateString()}`);
      console.log(`   - Business ID: ${deal.businessId}`);
      console.log('');
    });

    // Check for closed deals
    const closedDeals = deals.filter(deal => 
      deal.stage === 'closed_won' || 
      deal.stage === 'closed' || 
      deal.stage === 'won' || 
      deal.stage === 'completed'
    );

    console.log(`💰 Closed deals: ${closedDeals.length}`);
    if (closedDeals.length > 0) {
      const totalRevenue = closedDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
      console.log(`💰 Total revenue from closed deals: $${totalRevenue}`);
    }

    // Check deal stages
    const stages = {};
    deals.forEach(deal => {
      stages[deal.stage] = (stages[deal.stage] || 0) + 1;
    });
    
    console.log('\n📈 Deal stages breakdown:');
    Object.entries(stages).forEach(([stage, count]) => {
      console.log(`   - ${stage}: ${count} deals`);
    });

  } catch (error) {
    console.error('❌ Error checking deals:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDeals(); 