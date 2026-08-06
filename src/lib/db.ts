import { PrismaClient } from "@prisma/client";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Short-lived Vercel demo mode. Serverless functions cannot keep a SQLite file
 * beside the deployed code, so each function instance gets a writable copy in
 * /tmp. It deliberately resets on cold starts; use a hosted database for any
 * real deployment.
 */
function getDatabaseUrl() {
  if (process.env.DEMO_SQLITE_ON_VERCEL !== "1") {
    return process.env.DATABASE_URL;
  }

  const directory = path.join("/tmp", "lpugpt-demo");
  const target = path.join(directory, "dev.db");
  if (!existsSync(target)) {
    mkdirSync(directory, { recursive: true });
    copyFileSync(path.join(process.cwd(), "prisma", "dev.db"), target);
  }
  return `file:${target}`;
}

const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
