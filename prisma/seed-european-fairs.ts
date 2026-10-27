/**
 * Fügt europäische Branchenmessen hinzu, ohne die restliche DB zu löschen.
 * Aufruf: npx tsx prisma/seed-european-fairs.ts
 */
import { PrismaClient } from "@prisma/client";
import { EUROPEAN_FAIRS } from "./european-fairs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  let skipped = 0;

  for (const fair of EUROPEAN_FAIRS) {
    const existing = await prisma.event.findFirst({
      where: { name: fair.name, type: "MESSE" },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.event.create({
      data: {
        ...fair,
        responsibleUserId: admin?.id,
        checklist: { create: {} },
      },
    });
    created += 1;
  }

  console.log(`✅ Messen: ${created} neu angelegt, ${skipped} bereits vorhanden.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
