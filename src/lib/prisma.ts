import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  // DATABASE_URL looks like "file:./prisma/dev.db" and is resolved from the
  // process working directory (the project root) for both the Prisma CLI and
  // the running Next.js server.
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

  const adapter = new PrismaBetterSqlite3({ url });

  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
