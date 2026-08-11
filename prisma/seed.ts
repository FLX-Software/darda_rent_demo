import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starte Seed (nur Benutzer)...");

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
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.accessory.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("admin123", 12);

  await prisma.user.create({
    data: {
      email: "admin@darda.de",
      passwordHash,
      firstName: "Thomas",
      lastName: "Müller",
      role: UserRole.ADMIN,
      phone: "+49 7702 1234-100",
    },
  });

  await prisma.user.create({
    data: {
      email: "disposition@darda.de",
      passwordHash: await bcrypt.hash("dispo123", 12),
      firstName: "Sabine",
      lastName: "Weber",
      role: UserRole.DISPOSITION,
      phone: "+49 7702 1234-101",
    },
  });

  await prisma.user.create({
    data: {
      email: "lager@darda.de",
      passwordHash: await bcrypt.hash("lager123", 12),
      firstName: "Klaus",
      lastName: "Fischer",
      role: UserRole.LAGER,
      phone: "+49 7702 1234-102",
    },
  });

  await prisma.user.create({
    data: {
      email: "aussendienst@darda.de",
      passwordHash: await bcrypt.hash("aussen123", 12),
      firstName: "Markus",
      lastName: "Braun",
      role: UserRole.AUSSENDIENST,
      phone: "+49 170 1234567",
    },
  });

  await prisma.user.create({
    data: {
      email: "service@darda.de",
      passwordHash: await bcrypt.hash("service123", 12),
      firstName: "Julia",
      lastName: "Schmidt",
      role: UserRole.SERVICE,
      phone: "+49 7702 1234-103",
    },
  });

  await prisma.user.create({
    data: {
      email: "lesen@darda.de",
      passwordHash: await bcrypt.hash("lesen123", 12),
      firstName: "Peter",
      lastName: "Hoffmann",
      role: UserRole.LESEND,
    },
  });

  console.log("✅ Seed abgeschlossen – keine Demo-Kunden/Produkte/Standorte.");
  console.log("");
  console.log("Logins:");
  console.log("  Admin:        admin@darda.de / admin123");
  console.log("  Disposition:  disposition@darda.de / dispo123");
  console.log("  Lager:        lager@darda.de / lager123");
  console.log("  Außendienst:  aussendienst@darda.de / aussen123");
  console.log("  Service:      service@darda.de / service123");
  console.log("  Lesend:       lesen@darda.de / lesen123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
