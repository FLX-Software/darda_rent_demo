import {
  PrismaClient,
  UserRole,
  LocationType,
  ProductCondition,
  ProductStatus,
  BookingStatus,
  BookingType,
  MaintenanceType,
  MaintenanceStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starte Seed mit Demo-Daten...");

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

  const admin = await prisma.user.create({
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

  const hauptlager = await prisma.location.create({
    data: {
      name: "DARDA Blumberg",
      type: LocationType.HAUPTLAGER,
      street: "Im Tal 1",
      city: "Blumberg",
      zip: "78176",
      country: "Deutschland",
    },
  });

  await prisma.location.create({
    data: {
      name: "Außenlager Süd",
      type: LocationType.AUSSENLAGER,
      street: "Industriestr. 12",
      city: "Singen",
      zip: "78224",
      country: "Deutschland",
    },
  });

  await prisma.location.create({
    data: {
      name: "Werkstatt Blumberg",
      type: LocationType.WERKSTATT,
      street: "Im Tal 1",
      city: "Blumberg",
      zip: "78176",
      country: "Deutschland",
    },
  });

  const catZange = await prisma.productCategory.create({
    data: { name: "Zange", description: "Betonzangen / Multi Cutter", sortOrder: 1 },
  });
  const catSpalter = await prisma.productCategory.create({
    data: { name: "Spalter", description: "Hydraulikspalter", sortOrder: 2 },
  });
  const catAggregat = await prisma.productCategory.create({
    data: { name: "Aggregat", description: "Hydraulikaggregate", sortOrder: 3 },
  });

  const p1 = await prisma.product.create({
    data: {
      name: "Multi Cutter",
      model: "MC300",
      categoryId: catZange.id,
      inventoryNumber: "DARDA-Betonzange-MC300",
      serialNumber: "MC300-1001",
      qrCode: "FLX-RENT-DARDA-Betonzange-MC300",
      manufacturer: "Darda GmbH",
      dailyRateCents: 50000,
      status: ProductStatus.RESERVIERT,
      condition: ProductCondition.NEU,
      locationId: hauptlager.id,
      weightKg: 28.5,
      dimensions: "80 × 40 × 25 cm",
      yearBuilt: 2023,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: "Hydraulikspalter C12",
      model: "C12",
      categoryId: catSpalter.id,
      inventoryNumber: "DARDA-C12-001",
      serialNumber: "C12-2001",
      qrCode: "FLX-RENT-DARDA-C12-001",
      manufacturer: "Darda GmbH",
      dailyRateCents: 35000,
      status: ProductStatus.VERFUEGBAR,
      condition: ProductCondition.GUT,
      locationId: hauptlager.id,
      weightKg: 18,
      dimensions: "60 × 30 × 20 cm",
      yearBuilt: 2021,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      name: "Hydraulikaggregat A2",
      model: "A2",
      categoryId: catAggregat.id,
      inventoryNumber: "DARDA-A2-001",
      serialNumber: "A2-3001",
      qrCode: "FLX-RENT-DARDA-A2-001",
      manufacturer: "Darda GmbH",
      dailyRateCents: 28000,
      status: ProductStatus.VERFUEGBAR,
      condition: ProductCondition.SEHR_GUT,
      locationId: hauptlager.id,
      weightKg: 45,
      yearBuilt: 2022,
    },
  });

  const p4 = await prisma.product.create({
    data: {
      name: "Multi Cutter Compact",
      model: "MC200",
      categoryId: catZange.id,
      inventoryNumber: "DARDA-MC200-001",
      serialNumber: "MC200-1002",
      qrCode: "FLX-RENT-DARDA-MC200-001",
      manufacturer: "Darda GmbH",
      dailyRateCents: 42000,
      status: ProductStatus.BEIM_KUNDEN,
      condition: ProductCondition.GUT,
      locationId: hauptlager.id,
      yearBuilt: 2020,
    },
  });

  const customer1 = await prisma.customer.create({
    data: {
      customerNumber: "K-10001",
      companyName: "Bau AG Südwest",
      industry: "Bau",
      billingStreet: "Baustellenweg 5",
      billingCity: "Stuttgart",
      billingZip: "70173",
      billingCountry: "Deutschland",
      email: "einkauf@bau-ag-suedwest.de",
      phone: "+49 711 555-0",
      paymentTerms: 30,
      discountPercent: 5,
      contacts: {
        create: {
          firstName: "Anna",
          lastName: "Keller",
          email: "a.keller@bau-ag-suedwest.de",
          phone: "+49 711 555-12",
          position: "Einkauf",
          isPrimary: true,
        },
      },
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      customerNumber: "K-10002",
      companyName: "Abbruch Meister GmbH",
      industry: "Abbruch",
      billingStreet: "Trümmerplatz 8",
      billingCity: "Karlsruhe",
      billingZip: "76131",
      billingCountry: "Deutschland",
      email: "info@abbruch-meister.de",
      phone: "+49 721 888-0",
      paymentTerms: 14,
      discountPercent: 0,
      contacts: {
        create: {
          firstName: "Bernd",
          lastName: "Meister",
          email: "b.meister@abbruch-meister.de",
          isPrimary: true,
        },
      },
    },
  });

  const today = new Date();
  const inThreeDays = new Date(today);
  inThreeDays.setDate(today.getDate() + 3);
  const inTenDays = new Date(today);
  inTenDays.setDate(today.getDate() + 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const inFiveDays = new Date(today);
  inFiveDays.setDate(today.getDate() + 5);
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setDate(today.getDate() - 5);

  await prisma.booking.create({
    data: {
      bookingNumber: `B-${today.getFullYear()}-10001`,
      type: BookingType.KUNDENVERMIETUNG,
      status: BookingStatus.ABHOLBEREIT,
      customerId: customer1.id,
      contactName: "Anna Keller",
      projectName: "Abrissparkhaus Stuttgart",
      responsibleUserId: admin.id,
      startDate: today,
      plannedReturnDate: inTenDays,
      rentalCostCents: 50000,
      totalCostCents: 50000,
      items: {
        create: {
          productId: p1.id,
          quantity: 1,
          dailyRateCents: 50000,
        },
      },
    },
  });

  await prisma.booking.create({
    data: {
      bookingNumber: `B-${today.getFullYear()}-10002`,
      type: BookingType.KUNDENVERMIETUNG,
      status: BookingStatus.AKTIV,
      customerId: customer2.id,
      contactName: "Bernd Meister",
      projectName: "Brückenabbruch Karlsruhe",
      responsibleUserId: admin.id,
      startDate: fiveDaysAgo,
      plannedReturnDate: inThreeDays,
      actualCheckoutAt: fiveDaysAgo,
      rentalCostCents: 42000,
      totalCostCents: 42000,
      items: {
        create: {
          productId: p4.id,
          quantity: 1,
          dailyRateCents: 42000,
        },
      },
    },
  });

  await prisma.booking.create({
    data: {
      bookingNumber: `B-${today.getFullYear()}-10003`,
      type: BookingType.KUNDENVERMIETUNG,
      status: BookingStatus.BESTAETIGT,
      customerId: customer1.id,
      contactName: "Anna Keller",
      projectName: "Fundamentsanierung",
      responsibleUserId: admin.id,
      startDate: inThreeDays,
      plannedReturnDate: inFiveDays,
      rentalCostCents: 63000,
      totalCostCents: 63000,
      items: {
        create: [
          { productId: p2.id, quantity: 1, dailyRateCents: 35000 },
          { productId: p3.id, quantity: 1, dailyRateCents: 28000 },
        ],
      },
    },
  });

  await prisma.maintenance.create({
    data: {
      productId: p2.id,
      type: MaintenanceType.SICHERHEITSPRUEFUNG,
      status: MaintenanceStatus.FAELLIG,
      nextDate: yesterday,
      intervalDays: 365,
      notes: "Jährliche Sicherheitsprüfung",
    },
  });

  await prisma.maintenance.create({
    data: {
      productId: p3.id,
      type: MaintenanceType.ROUTINE,
      status: MaintenanceStatus.GEPLANT,
      nextDate: inTenDays,
      intervalDays: 180,
    },
  });

  console.log("✅ Seed abgeschlossen mit Demo-Daten.");
  console.log("");
  console.log("Logins:");
  console.log("  Admin:        admin@darda.de / admin123");
  console.log("  Disposition:  disposition@darda.de / dispo123");
  console.log("  Lager:        lager@darda.de / lager123");
  console.log("  Außendienst:  aussendienst@darda.de / aussen123");
  console.log("  Service:      service@darda.de / service123");
  console.log("  Lesend:       lesen@darda.de / lesen123");
  console.log("");
  console.log("Demo: 3 Standorte, 3 Kategorien, 4 Produkte, 2 Kunden, 3 Buchungen, 2 Wartungen");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
