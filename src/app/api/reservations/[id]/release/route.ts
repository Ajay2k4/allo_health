import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id: params.id } });
      if (!reservation) return { error: "Not found", status: 404 };
      if (reservation.status === "RELEASED" || reservation.status === "EXPIRED") return { message: "Already released", status: 200 };
      if (reservation.status === "CONFIRMED") return { error: "Cannot release confirmed reservation", status: 400 };
      await tx.stock.update({ where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } }, data: { reserved: { decrement: reservation.quantity } } });
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: "RELEASED" } });
      return { message: "Released", status: 200 };
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ message: result.message });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
