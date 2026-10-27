/**
 * Legt eine Demo-Schadensmeldung an, ohne die restliche DB zu löschen.
 * Aufruf: npx tsx prisma/seed-demo-damage.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const year = new Date().getFullYear();
  const damageNumber = `S-${year}-1001`;

  const existing = await prisma.damageReport.findFirst({
    where: { damageNumber },
  });
  if (existing) {
    console.log(`Bereits vorhanden: ${existing.damageNumber}`);
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const product =
    (await prisma.product.findFirst({
      where: { inventoryNumber: "DARDA-MC200-001" },
    })) ??
    (await prisma.product.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!admin || !product) {
    throw new Error("Admin oder Produkt fehlt");
  }

  const booking = await prisma.booking.findFirst({
    where: { status: "AKTIV", items: { some: { productId: product.id } } },
  });

  const report = await prisma.damageReport.create({
    data: {
      damageNumber,
      productId: product.id,
      bookingId: booking?.id,
      customerId: booking?.customerId,
      reportedById: admin.id,
      category: "HYDRAULIKSCHADEN",
      affectedPart: "Hydraulikschlauch Druckleitung",
      description:
        "Bei Rückgabe nach Brückenabbruch Karlsruhe Ölleckage am rechten Hydraulikschlauch festgestellt. Schlauchmantel eingerissen, Druckabfall unter Last. Gerät vorläufig außer Betrieb.",
      severity: "SCHWER",
      repairRequired: true,
      stillUsable: false,
      estimatedCostCents: 85000,
      responsibility: "KUNDE",
      isInsuranceCase: false,
      status: "NEU",
      notes: "Fotos vom Einsatzort angefordert. Kunde informiert.",
      history: {
        create: {
          fromStatus: null,
          toStatus: "NEU",
          note: "Schadensmeldung erfasst",
        },
      },
    },
  });

  console.log(`✅ Schadensmeldung angelegt: ${report.damageNumber} (${product.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
