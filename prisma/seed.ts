import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");
  await prisma.idempotencyKey.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const mumbai = await prisma.warehouse.create({ data: { name: "Mumbai Central", location: "Mumbai, MH" } });
  const delhi = await prisma.warehouse.create({ data: { name: "Delhi Hub", location: "Delhi, DL" } });
  const bangalore = await prisma.warehouse.create({ data: { name: "Bangalore South", location: "Bangalore, KA" } });

  const p1 = await prisma.product.create({ data: { name: "Wireless Noise-Cancelling Headphones", description: "Premium ANC headphones with 30hr battery life", imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400" } });
  const p2 = await prisma.product.create({ data: { name: "Mechanical Keyboard TKL", description: "Tenkeyless mechanical keyboard with RGB backlighting", imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400" } });
  const p3 = await prisma.product.create({ data: { name: "4K Webcam Pro", description: "Ultra HD webcam with autofocus and built-in mic", imageUrl: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400" } });
  const p4 = await prisma.product.create({ data: { name: "USB-C Hub 7-in-1", description: "Compact hub with HDMI, USB-A, SD card, and more", imageUrl: "https://images.unsplash.com/photo-1625895197185-efcec01cffe0?w=400" } });
  const p5 = await prisma.product.create({ data: { name: "Ergonomic Mouse", description: "Vertical ergonomic mouse for all-day comfort", imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400" } });

  const stocks = [
    { productId: p1.id, warehouseId: mumbai.id, total: 5 },
    { productId: p1.id, warehouseId: delhi.id, total: 3 },
    { productId: p1.id, warehouseId: bangalore.id, total: 1 },
    { productId: p2.id, warehouseId: mumbai.id, total: 10 },
    { productId: p2.id, warehouseId: bangalore.id, total: 7 },
    { productId: p3.id, warehouseId: mumbai.id, total: 2 },
    { productId: p3.id, warehouseId: bangalore.id, total: 4 },
    { productId: p4.id, warehouseId: mumbai.id, total: 15 },
    { productId: p4.id, warehouseId: delhi.id, total: 8 },
    { productId: p5.id, warehouseId: delhi.id, total: 6 },
    { productId: p5.id, warehouseId: bangalore.id, total: 3 },
  ];

  for (const s of stocks) await prisma.stock.create({ data: s });
  console.log("✅ Seed complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
