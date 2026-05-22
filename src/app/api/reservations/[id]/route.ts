import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: { product: true, warehouse: true },
  });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (reservation.status === "PENDING" && reservation.expiresAt <= new Date()) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: "EXPIRED" } });
      await tx.stock.update({ where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } }, data: { reserved: { decrement: reservation.quantity } } });
    });
    reservation.status = "EXPIRED";
  }

  return NextResponse.json({ id: reservation.id, productId: reservation.productId, productName: reservation.product.name, productImage: reservation.product.imageUrl, warehouseId: reservation.warehouseId, warehouseName: reservation.warehouse.name, quantity: reservation.quantity, status: reservation.status, expiresAt: reservation.expiresAt.toISOString(), createdAt: reservation.createdAt.toISOString() });
}
