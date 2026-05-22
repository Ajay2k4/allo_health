import { prisma } from "./prisma";

export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();
  const expired = await prisma.reservation.findMany({
    where: { status: "PENDING", expiresAt: { lte: now } },
    select: { id: true, productId: true, warehouseId: true, quantity: true },
  });
  if (expired.length === 0) return 0;
  await prisma.$transaction(async (tx) => {
    for (const r of expired) {
      await tx.reservation.update({ where: { id: r.id }, data: { status: "EXPIRED" } });
      await tx.stock.update({
        where: { productId_warehouseId: { productId: r.productId, warehouseId: r.warehouseId } },
        data: { reserved: { decrement: r.quantity } },
      });
    }
  });
  return expired.length;
}

export const RESERVATION_TTL_MINUTES = 10;
