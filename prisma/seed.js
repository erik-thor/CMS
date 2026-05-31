const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding crowdfunding inventory tiers...');

  const tiers = [
    {
      id: 'tier-digital-epub',
      name: 'Digital EPUB Bundle',
      type: 'digital',
      price: 2000, // $20.00 in cents
      max_limit: null,
    },
    {
      id: 'tier-paperback-epub',
      name: 'Paperback + EPUB Bundle',
      type: 'physical',
      price: 3500, // $35.00 in cents
      max_limit: null,
    },
    {
      id: 'tier-signed-hardcover',
      name: 'Limited Signed Hardcover + EPUB Bundle',
      type: 'physical',
      price: 10000, // $100.00 in cents
      max_limit: 50, // Scarcity constraint
    },
  ];

  for (const tier of tiers) {
    const item = await prisma.inventoryItem.upsert({
      where: { id: tier.id },
      update: {
        name: tier.name,
        type: tier.type,
        price: tier.price,
        max_limit: tier.max_limit,
      },
      create: {
        id: tier.id,
        name: tier.name,
        type: tier.type,
        price: tier.price,
        max_limit: tier.max_limit,
        stock_allocated: 0,
      },
    });
    console.log(`- Upserted InventoryItem: ${item.name} (${item.id}) - Price: $${(item.price / 100).toFixed(2)}`);
  }

  // Create a default admin user
  const adminEmail = 'admin@erikthor.com';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      display_name: 'Erik Thor',
      role: 'ADMIN',
    },
  });
  console.log(`- Upserted Admin User: ${admin.display_name} (${admin.email})`);

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
