import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id: params.id }, include: { product: true, warehouse: true } });
      if (!reservation) return { error: "Not found", status: 404 };
      if (reservation.status === "CONFIRMED") return { reservation, status: 200 };
      if (reservation.status !== "PENDING" || reservation.expiresAt <= new Date()) return { error: "Reservation has expired", status: 410 };
      await tx.stock.update({ where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } }, data: { total: { decrement: reservation.quantity }, reserved: { decrement: reservation.quantity } } });
      const confirmed = await tx.reservation.update({ where: { id: reservation.id }, data: { status: "CONFIRMED" }, include: { product: true, warehouse: true } });
      return { reservation: confirmed, status: 200 };
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    const r = result.reservation;
    return NextResponse.json({ id: r.id, status: r.status, productName: r.product.name, warehouseName: r.warehouse.name, quantity: r.quantity });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
