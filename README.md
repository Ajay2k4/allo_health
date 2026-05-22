# Allo Inventory

Multi-warehouse inventory reservation platform built with Next.js 14, Prisma, and PostgreSQL.

## Local Setup

```bash
npm install
cp .env.example .env.local
# Add your DATABASE_URL to .env.local
npx prisma db push
npm run db:seed
npm run dev
```

## Expiry Mechanism

Reservations expire after 10 minutes via two mechanisms:
1. **Lazy cleanup** — every `GET /api/products` call releases expired reservations
2. **Cron job** — `GET /api/cron/release-expired` called every 5 minutes (protected by `CRON_SECRET`)

## Concurrency

Uses PostgreSQL Serializable transactions to guarantee exactly one winner when two users attempt to reserve the last unit simultaneously.
