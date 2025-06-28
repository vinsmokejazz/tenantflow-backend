const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestRevenueData() {
  try {
    console.log('=== Creating Test Revenue Data ===\n');
    
    // Get the first business
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true }
    });
    
    if (businesses.length === 0) {
      console.log('No businesses found. Please create a business first.');
      return;
    }
    
    const business = businesses[0];
    console.log(`Using business: ${business.name} (${business.id})\n`);
    
    // Get or create a test client
    let client = await prisma.client.findFirst({
      where: { businessId: business.id }
    });
    
    if (!client) {
      console.log('Creating test client...');
      client = await prisma.client.create({
        data: {
          name: 'Test Client for Revenue',
          email: 'revenue@test.com',
          phone: '123-456-7890',
          businessId: business.id
        }
      });
      console.log(`✓ Created client: ${client.name}\n`);
    } else {
      console.log(`Using existing client: ${client.name}\n`);
    }
    
    // Create test deals with different stages and values across different months
    const testDeals = [
      // January deals
      { title: 'Jan Deal 1', value: 5000, stage: 'closed_won', month: 0 },
      { title: 'Jan Deal 2', value: 3000, stage: 'prospecting', month: 0 },
      
      // February deals
      { title: 'Feb Deal 1', value: 7500, stage: 'closed_won', month: 1 },
      { title: 'Feb Deal 2', value: 4500, stage: 'won', month: 1 },
      { title: 'Feb Deal 3', value: 2000, stage: 'prospecting', month: 1 },
      
      // March deals
      { title: 'Mar Deal 1', value: 12000, stage: 'closed_won', month: 2 },
      { title: 'Mar Deal 2', value: 8000, stage: 'completed', month: 2 },
      { title: 'Mar Deal 3', value: 3500, stage: 'negotiation', month: 2 },
      
      // April deals
      { title: 'Apr Deal 1', value: 15000, stage: 'closed_won', month: 3 },
      { title: 'Apr Deal 2', value: 9000, stage: 'won', month: 3 },
      { title: 'Apr Deal 3', value: 6000, stage: 'closed', month: 3 },
      
      // May deals
      { title: 'May Deal 1', value: 18000, stage: 'closed_won', month: 4 },
      { title: 'May Deal 2', value: 11000, stage: 'completed', month: 4 },
      { title: 'May Deal 3', value: 7000, stage: 'proposal', month: 4 },
      
      // June deals (current month)
      { title: 'Jun Deal 1', value: 22000, stage: 'closed_won', month: 5 },
      { title: 'Jun Deal 2', value: 14000, stage: 'won', month: 5 },
      { title: 'Jun Deal 3', value: 8500, stage: 'closed', month: 5 },
      { title: 'Jun Deal 4', value: 5000, stage: 'negotiation', month: 5 },
    ];
    
    console.log('Creating test deals...\n');
    
    for (const dealData of testDeals) {
      // Calculate the date for this month
      const currentDate = new Date();
      const dealDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - dealData.month, 15);
      
      const deal = await prisma.deal.create({
        data: {
          title: dealData.title,
          value: dealData.value,
          stage: dealData.stage,
          description: `Test deal for ${dealData.title}`,
          clientId: client.id,
          businessId: business.id,
          createdAt: dealDate,
          updatedAt: dealDate
        }
      });
      
      console.log(`✓ Created deal: ${deal.title} - $${deal.value} (${deal.stage}) - ${dealDate.toLocaleDateString()}`);
    }
    
    console.log('\n=== Revenue Chart Data Summary ===');
    console.log('Created deals across 6 months with different stages:');
    console.log('- closed_won: Revenue-generating deals');
    console.log('- won: Revenue-generating deals');
    console.log('- closed: Revenue-generating deals');
    console.log('- completed: Revenue-generating deals');
    console.log('- prospecting: Non-revenue deals');
    console.log('- negotiation: Non-revenue deals');
    console.log('- proposal: Non-revenue deals');
    
    console.log('\nNow refresh your dashboard to see the Revenue Overview chart!');
    console.log('The chart will show:');
    console.log('- Monthly revenue (from closed deals)');
    console.log('- Monthly deal count');
    console.log('- Conversion rates');
    console.log('- Growth trends');
    
  } catch (error) {
    console.error('Error creating test revenue data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestRevenueData(); 