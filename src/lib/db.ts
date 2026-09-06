import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function buildDatabaseUrl() {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  if (!base.startsWith("postgresql")) return base;
  if (base.includes("connection_limit=")) return base;

  const params = new URLSearchParams();
  const poolLimit = process.env.DATABASE_POOL_SIZE ?? "20";
  const poolTimeout = process.env.DATABASE_POOL_TIMEOUT ?? "30";

  params.set("connection_limit", poolLimit);
  params.set("pool_timeout", poolTimeout);

  // pgBouncer / serverless poolers often require this.
  if (process.env.DATABASE_PGBOUNCER === "1") {
    params.set("pgbouncer", "true");
  }

  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${params.toString()}`;
}

const databaseUrl = buildDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
