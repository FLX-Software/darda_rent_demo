import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // Session-Pooler (Supabase) hat ein kleines Limit; Hot-Reload darf nicht viele Clients öffnen.
  if (url.includes("connection_limit=")) return url;
  return url.includes("?")
    ? `${url}&connection_limit=5`
    : `${url}?connection_limit=5`;
}

function createPrismaClient() {
  const url = databaseUrl();
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
