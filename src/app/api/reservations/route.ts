import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acquireLock, releaseLock } from "@/lib/redis";
import { ReserveSchema } from "@/lib/schemas";
import { RESERVATION_TTL_MINUTES } from "@/lib/expiry";

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("Idempotency-Key");

  if (idempotencyKey) {
    const existing = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
    if (existing) return NextResponse.json(JSON.parse(existing.responseBody), { status: existing.statusCode });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = ReserveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const { productId, warehouseId, quantity } = parsed.data;
  const lockKey = `lock:stock:${productId}:${warehouseId}`;
  const lockValue = await acquireLock(lockKey, 8000);

  let responseBody: object;
  let statusCode: number;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } });
      if (!stock) return { error: "Stock not found", status: 404 };
      const available = stock.total - stock.reserved;
      if (available < quantity) return { error: `Not enough stock. Available: ${available}, requested: ${quantity}`, status: 409 };
      await tx.stock.update({ where: { productId_warehouseId: { productId, warehouseId } }, data: { reserved: { increment: quantity } } });
      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);
      const reservation = await tx.reservation.create({
        data: { productId, warehouseId, quantity, expiresAt, status: "PENDING" },
        include: { product: true, warehouse: true },
      });
      return { reservation, status: 201 };
    }, { isolationLevel: "Serializable" });

    if ("error" in result) {
      responseBody = { error: result.error };
      statusCode = result.status;
    } else {
      const r = result.reservation;
      responseBody = { id: r.id, productId: r.productId, productName: r.product.name, warehouseId: r.warehouseId, warehouseName: r.warehouse.name, quantity: r.quantity, status: r.status, expiresAt: r.expiresAt.toISOString(), createdAt: r.createdAt.toISOString() };
      statusCode = 201;
    }
  } catch (err) {
    console.error("Reservation error:", err);
    responseBody = { error: "Internal server error" };
    statusCode = 500;
  } finally {
    await releaseLock(lockKey, lockValue!);
  }

  if (idempotencyKey && statusCode < 500) {
    const reservationId = "id" in responseBody ? (responseBody as { id: string }).id : undefined;
    await prisma.idempotencyKey.create({ data: { key: idempotencyKey, endpoint: "/api/reservations", responseBody: JSON.stringify(responseBody), statusCode } }).catch(() => {});
  }

  return NextResponse.json(responseBody, { status: statusCode });
}
