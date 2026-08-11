import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Lösche Geschäftsdaten...");

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.damageStatusHistory.deleteMany();
  await prisma.damageImage.deleteMany();
  await prisma.damageReport.deleteMany();
  await prisma.conditionReportImage.deleteMany();
  await prisma.conditionReport.deleteMany();
  await prisma.checkInItem.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.checkOutItem.deleteMany();
  await prisma.checkOut.deleteMany();
  await prisma.cost.deleteMany();
  await prisma.maintenanceDocument.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.bookingDocument.deleteMany();
  await prisma.bookingAccessory.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.eventChecklist.deleteMany();
  await prisma.eventDocument.deleteMany();
  await prisma.eventProduct.deleteMany();
  await prisma.eventParticipant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.locationHistory.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.productCompatibility.deleteMany();
  await prisma.productAccessory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productDocument.deleteMany();
  await prisma.customerProductPrice.deleteMany();
  await prisma.customerDocument.deleteMany();
  await prisma.deliveryAddress.deleteMany();
  await prisma.customerContact.deleteMany();

  const customers = await prisma.customer.deleteMany();
  const products = await prisma.product.deleteMany();
  const accessories = await prisma.accessory.deleteMany();
  const categories = await prisma.productCategory.deleteMany();
  const locations = await prisma.location.deleteMany();

  console.log(`Kunden gelöscht: ${customers.count}`);
  console.log(`Produkte gelöscht: ${products.count}`);
  console.log(`Zubehör gelöscht: ${accessories.count}`);
  console.log(`Kategorien gelöscht: ${categories.count}`);
  console.log(`Standorte gelöscht: ${locations.count}`);
  console.log("✅ Fertig – Benutzer bleiben erhalten.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
