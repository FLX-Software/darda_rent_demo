import {
  PrismaClient,
  UserRole,
  ProductStatus,
  ProductCondition,
  LocationType,
  BookingType,
  BookingStatus,
  EventType,
  EventStatus,
  DamageCategory,
  DamageSeverity,
  DamageStatus,
  MaintenanceStatus,
  MaintenanceType,
  CostType,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starte Seed...");

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

  const disposition = await prisma.user.create({
    data: {
      email: "disposition@darda.de",
      passwordHash: await bcrypt.hash("dispo123", 12),
      firstName: "Sabine",
      lastName: "Weber",
      role: UserRole.DISPOSITION,
      phone: "+49 7702 1234-101",
    },
  });

  const lager = await prisma.user.create({
    data: {
      email: "lager@darda.de",
      passwordHash: await bcrypt.hash("lager123", 12),
      firstName: "Klaus",
      lastName: "Fischer",
      role: UserRole.LAGER,
      phone: "+49 7702 1234-102",
    },
  });

  const aussendienst = await prisma.user.create({
    data: {
      email: "aussendienst@darda.de",
      passwordHash: await bcrypt.hash("aussen123", 12),
      firstName: "Markus",
      lastName: "Braun",
      role: UserRole.AUSSENDIENST,
      phone: "+49 170 1234567",
    },
  });

  const service = await prisma.user.create({
    data: {
      email: "service@darda.de",
      passwordHash: await bcrypt.hash("service123", 12),
      firstName: "Julia",
      lastName: "Schmidt",
      role: UserRole.SERVICE,
      phone: "+49 7702 1234-103",
    },
  });

  const lesend = await prisma.user.create({
    data: {
      email: "lesen@darda.de",
      passwordHash: await bcrypt.hash("lesen123", 12),
      firstName: "Peter",
      lastName: "Hoffmann",
      role: UserRole.LESEND,
    },
  });

  const locations = await Promise.all([
    prisma.location.create({ data: { name: "Hauptlager Blumberg", type: LocationType.HAUPTLAGER, city: "Blumberg", zip: "78176" } }),
    prisma.location.create({ data: { name: "Versand Blumberg", type: LocationType.HAUPTLAGER, city: "Blumberg", zip: "78176" } }),
    prisma.location.create({ data: { name: "Messe München", type: LocationType.MESSE, city: "München", zip: "81829" } }),
    prisma.location.create({ data: { name: "Kunde Stuttgart", type: LocationType.KUNDE, city: "Stuttgart", zip: "70173" } }),
    prisma.location.create({ data: { name: "Demo Freiburg", type: LocationType.DEMO, city: "Freiburg", zip: "79098" } }),
    prisma.location.create({ data: { name: "Servicewerkstatt", type: LocationType.WERKSTATT, city: "Blumberg", zip: "78176" } }),
    prisma.location.create({ data: { name: "Unterwegs", type: LocationType.UNTERWEGS } }),
    prisma.location.create({ data: { name: "Außenlager Singen", type: LocationType.AUSSENLAGER, city: "Singen", zip: "78224" } }),
  ]);

  const [hauptlager, versand, messeMuenchen, kundeStuttgart, demoFreiburg, werkstatt, unterwegs] = locations;

  const categories = await Promise.all([
    prisma.productCategory.create({ data: { name: "Abbruchzange", sortOrder: 1 } }),
    prisma.productCategory.create({ data: { name: "Spaltzange", sortOrder: 2 } }),
    prisma.productCategory.create({ data: { name: "Anbaugerät", sortOrder: 3 } }),
    prisma.productCategory.create({ data: { name: "Hydraulikaggregat", sortOrder: 4 } }),
    prisma.productCategory.create({ data: { name: "Vorführprodukt", sortOrder: 5 } }),
    prisma.productCategory.create({ data: { name: "Spezialwerkzeug", sortOrder: 6 } }),
  ]);

  const [abbruchzange, spaltzange, anbaugeraet, hydraulik, vorfuehr, spezial] = categories;

  const accessories = await Promise.all([
    prisma.accessory.create({ data: { name: "Hydraulikschläuche", inventoryNumber: "ZUB-HS-001", quantity: 20 } }),
    prisma.accessory.create({ data: { name: "Transportgestell", inventoryNumber: "ZUB-TG-001", quantity: 15 } }),
    prisma.accessory.create({ data: { name: "Anschlussadapter", inventoryNumber: "ZUB-AA-001", quantity: 30 } }),
    prisma.accessory.create({ data: { name: "Werkzeugkoffer", inventoryNumber: "ZUB-WK-001", quantity: 25 } }),
    prisma.accessory.create({ data: { name: "Bedienungsanleitung", inventoryNumber: "ZUB-BA-001", quantity: 50 } }),
    prisma.accessory.create({ data: { name: "Schmierset", inventoryNumber: "ZUB-SS-001", quantity: 40 } }),
    prisma.accessory.create({ data: { name: "Ersatzbacken", inventoryNumber: "ZUB-EB-001", quantity: 10 } }),
    prisma.accessory.create({ data: { name: "Druckmanometer", inventoryNumber: "ZUB-DM-001", quantity: 8 } }),
  ]);

  const [hydSchlaeuche, transportgestell, adapter, werkzeugkoffer, bedienungsanleitung] = accessories;

  const today = startOfDay(new Date());

  const productsData = [
    {
      name: "Darda MC300 Zange",
      model: "MC300",
      categoryId: abbruchzange.id,
      inventoryNumber: "DARDA-MC300-001",
      serialNumber: "MC300-DEMO-001",
      qrCode: "FLX-RENT-DARDA-MC300-001",
      status: ProductStatus.VERFUEGBAR,
      condition: ProductCondition.SEHR_GUT,
      locationId: hauptlager.id,
      dailyRateCents: 35000,
      weeklyRateCents: 175000,
      replacementValueCents: 1850000,
      depositCents: 250000,
      internalCostCents: 5000,
      description: "Hydraulische Abbruchzange MC300 – leistungsstarkes Vorführ- und Mietprodukt",
      weightKg: 28.5,
      dimensions: "1200 x 450 x 380 mm",
      yearBuilt: 2022,
      imageUrl: "/products/mc300.svg",
      accessories: [hydSchlaeuche.id, transportgestell.id, adapter.id, werkzeugkoffer.id, bedienungsanleitung.id],
    },
    {
      name: "Darda MC400 Zange",
      model: "MC400",
      categoryId: abbruchzange.id,
      inventoryNumber: "DARDA-MC400-001",
      serialNumber: "MC400-2023-042",
      qrCode: "FLX-RENT-DARDA-MC400-001",
      status: ProductStatus.BEIM_KUNDEN,
      condition: ProductCondition.GUT,
      locationId: kundeStuttgart.id,
      dailyRateCents: 45000,
      weeklyRateCents: 225000,
      replacementValueCents: 2450000,
      depositCents: 350000,
      internalCostCents: 6500,
      weightKg: 35.0,
      dimensions: "1350 x 480 x 400 mm",
      yearBuilt: 2023,
    },
    {
      name: "Darda MC200 Zange",
      model: "MC200",
      categoryId: abbruchzange.id,
      inventoryNumber: "DARDA-MC200-001",
      serialNumber: "MC200-2021-018",
      qrCode: "FLX-RENT-DARDA-MC200-001",
      status: ProductStatus.RESERVIERT,
      condition: ProductCondition.SEHR_GUT,
      locationId: hauptlager.id,
      dailyRateCents: 28000,
      weeklyRateCents: 140000,
      replacementValueCents: 1250000,
      depositCents: 180000,
      internalCostCents: 4000,
      weightKg: 22.0,
      yearBuilt: 2021,
    },
    {
      name: "Darda SC400 Spaltzange",
      model: "SC400",
      categoryId: spaltzange.id,
      inventoryNumber: "DARDA-SC400-001",
      serialNumber: "SC400-2022-007",
      qrCode: "FLX-RENT-DARDA-SC400-001",
      status: ProductStatus.AUF_MESSE,
      condition: ProductCondition.GUT,
      locationId: messeMuenchen.id,
      dailyRateCents: 38000,
      weeklyRateCents: 190000,
      replacementValueCents: 1680000,
      depositCents: 280000,
      weightKg: 30.0,
      yearBuilt: 2022,
    },
    {
      name: "Darda SC200 Spaltzange",
      model: "SC200",
      categoryId: spaltzange.id,
      inventoryNumber: "DARDA-SC200-001",
      serialNumber: "SC200-2020-033",
      qrCode: "FLX-RENT-DARDA-SC200-001",
      status: ProductStatus.BEI_DEMO,
      condition: ProductCondition.SEHR_GUT,
      locationId: demoFreiburg.id,
      dailyRateCents: 25000,
      weeklyRateCents: 125000,
      replacementValueCents: 980000,
      depositCents: 150000,
      weightKg: 18.5,
      yearBuilt: 2020,
    },
    {
      name: "Darda AB700 Anbaugerät",
      model: "AB700",
      categoryId: anbaugeraet.id,
      inventoryNumber: "DARDA-AB700-001",
      serialNumber: "AB700-2023-011",
      qrCode: "FLX-RENT-DARDA-AB700-001",
      status: ProductStatus.UNTERWEGS,
      condition: ProductCondition.GUT,
      locationId: unterwegs.id,
      dailyRateCents: 42000,
      weeklyRateCents: 210000,
      replacementValueCents: 2100000,
      depositCents: 300000,
      weightKg: 42.0,
      yearBuilt: 2023,
    },
    {
      name: "Darda HAG700 Aggregat",
      model: "HAG700",
      categoryId: hydraulik.id,
      inventoryNumber: "DARDA-HAG700-001",
      serialNumber: "HAG700-2021-005",
      qrCode: "FLX-RENT-DARDA-HAG700-001",
      status: ProductStatus.IN_WARTUNG,
      condition: ProductCondition.BEFRIEDIGEND,
      locationId: werkstatt.id,
      dailyRateCents: 18000,
      weeklyRateCents: 90000,
      replacementValueCents: 650000,
      depositCents: 100000,
      weightKg: 55.0,
      yearBuilt: 2021,
    },
    {
      name: "Darda HAG500 Aggregat",
      model: "HAG500",
      categoryId: hydraulik.id,
      inventoryNumber: "DARDA-HAG500-001",
      serialNumber: "HAG500-2022-019",
      qrCode: "FLX-RENT-DARDA-HAG500-001",
      status: ProductStatus.VERFUEGBAR,
      condition: ProductCondition.SEHR_GUT,
      locationId: hauptlager.id,
      dailyRateCents: 15000,
      weeklyRateCents: 75000,
      replacementValueCents: 480000,
      depositCents: 80000,
      weightKg: 38.0,
      yearBuilt: 2022,
    },
    {
      name: "Darda MC300 Vorführmodell",
      model: "MC300-DEMO",
      categoryId: vorfuehr.id,
      inventoryNumber: "DARDA-MC300-DEMO",
      serialNumber: "MC300-VORF-002",
      qrCode: "FLX-RENT-DARDA-MC300-DEMO",
      status: ProductStatus.INTERN_IM_EINSATZ,
      condition: ProductCondition.GUT,
      locationId: hauptlager.id,
      dailyRateCents: 0,
      replacementValueCents: 1650000,
      depositCents: 0,
      weightKg: 28.0,
      yearBuilt: 2019,
    },
    {
      name: "Darda SC600 Spaltzange",
      model: "SC600",
      categoryId: spaltzange.id,
      inventoryNumber: "DARDA-SC600-001",
      serialNumber: "SC600-2024-001",
      qrCode: "FLX-RENT-DARDA-SC600-001",
      status: ProductStatus.ABHOLBEREIT,
      condition: ProductCondition.NEU,
      locationId: versand.id,
      dailyRateCents: 52000,
      weeklyRateCents: 260000,
      replacementValueCents: 2890000,
      depositCents: 400000,
      weightKg: 45.0,
      yearBuilt: 2024,
    },
    {
      name: "Darda AB500 Anbaugerät",
      model: "AB500",
      categoryId: anbaugeraet.id,
      inventoryNumber: "DARDA-AB500-001",
      serialNumber: "AB500-2022-028",
      qrCode: "FLX-RENT-DARDA-AB500-001",
      status: ProductStatus.RUECKGABE_AUSSTEHEND,
      condition: ProductCondition.GUT,
      locationId: kundeStuttgart.id,
      dailyRateCents: 35000,
      weeklyRateCents: 175000,
      replacementValueCents: 1450000,
      depositCents: 220000,
      weightKg: 32.0,
      yearBuilt: 2022,
    },
    {
      name: "Darda Spezialbacken-Set",
      model: "SB-SET-01",
      categoryId: spezial.id,
      inventoryNumber: "DARDA-SB-001",
      serialNumber: "SB-2023-003",
      qrCode: "FLX-RENT-DARDA-SB-001",
      status: ProductStatus.VERFUEGBAR,
      condition: ProductCondition.SEHR_GUT,
      locationId: hauptlager.id,
      dailyRateCents: 8000,
      weeklyRateCents: 40000,
      replacementValueCents: 120000,
      depositCents: 25000,
      weightKg: 5.0,
      yearBuilt: 2023,
    },
    {
      name: "Darda MC500 Zange",
      model: "MC500",
      categoryId: abbruchzange.id,
      inventoryNumber: "DARDA-MC500-001",
      serialNumber: "MC500-2024-002",
      qrCode: "FLX-RENT-DARDA-MC500-001",
      status: ProductStatus.BESCHAEDIGT,
      condition: ProductCondition.BESCHAEDIGT,
      locationId: werkstatt.id,
      dailyRateCents: 55000,
      weeklyRateCents: 275000,
      replacementValueCents: 3200000,
      depositCents: 450000,
      weightKg: 48.0,
      yearBuilt: 2024,
    },
    {
      name: "Darda HAG300 Aggregat",
      model: "HAG300",
      categoryId: hydraulik.id,
      inventoryNumber: "DARDA-HAG300-001",
      serialNumber: "HAG300-2020-012",
      qrCode: "FLX-RENT-DARDA-HAG300-001",
      status: ProductStatus.GESPERRT,
      condition: ProductCondition.MAENGELHAFT,
      locationId: werkstatt.id,
      dailyRateCents: 12000,
      weeklyRateCents: 60000,
      replacementValueCents: 380000,
      depositCents: 60000,
      weightKg: 25.0,
      yearBuilt: 2020,
    },
    {
      name: "Darda AB300 Anbaugerät",
      model: "AB300",
      categoryId: anbaugeraet.id,
      inventoryNumber: "DARDA-AB300-001",
      serialNumber: "AB300-2021-044",
      qrCode: "FLX-RENT-DARDA-AB300-001",
      status: ProductStatus.VERFUEGBAR,
      condition: ProductCondition.GUT,
      locationId: hauptlager.id,
      dailyRateCents: 28000,
      weeklyRateCents: 140000,
      replacementValueCents: 980000,
      depositCents: 150000,
      weightKg: 22.0,
      yearBuilt: 2021,
    },
    {
      name: "Darda MC350 Zange",
      model: "MC350",
      categoryId: abbruchzange.id,
      inventoryNumber: "DARDA-MC350-001",
      serialNumber: "MC350-2023-015",
      qrCode: "FLX-RENT-DARDA-MC350-001",
      status: ProductStatus.IN_PRUEFUNG,
      condition: ProductCondition.GUT,
      locationId: hauptlager.id,
      dailyRateCents: 40000,
      weeklyRateCents: 200000,
      replacementValueCents: 2100000,
      depositCents: 300000,
      weightKg: 32.0,
      yearBuilt: 2023,
    },
  ];

  const products = [];
  for (const p of productsData) {
    const { accessories: accIds, imageUrl, ...productData } = p;
    const product = await prisma.product.create({
      data: {
        ...productData,
        purchaseDate: subDays(today, 365),
        purchaseValueCents: productData.replacementValueCents,
        lastMaintenanceAt: subDays(today, 90),
        nextMaintenanceAt: addDays(today, 90),
        images: imageUrl
          ? { create: [{ url: imageUrl, isPrimary: true, caption: productData.name }] }
          : undefined,
      },
    });
    products.push(product);

    if (accIds) {
      for (const accId of accIds) {
        await prisma.productAccessory.create({
          data: { productId: product.id, accessoryId: accId, isRequired: true },
        });
      }
    }
  }

  const mc300 = products[0];

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        customerNumber: "K-10001",
        companyName: "Bauunternehmen Keller GmbH",
        industry: "Bauwesen",
        billingStreet: "Industriestraße 12",
        billingCity: "Stuttgart",
        billingZip: "70173",
        email: "miete@keller-bau.de",
        phone: "+49 711 123456",
        contacts: { create: [{ firstName: "Hans", lastName: "Keller", email: "h.keller@keller-bau.de", phone: "+49 171 1111111", isPrimary: true }] },
        deliveryAddresses: { create: [{ label: "Baustelle Nord", street: "Am Tunnel 5", city: "Stuttgart", zip: "70435", isDefault: true }] },
      },
    }),
    prisma.customer.create({
      data: {
        customerNumber: "K-10002",
        companyName: "Abbruch & Recycling Schmidt AG",
        industry: "Abbruch",
        billingStreet: "Werkstraße 8",
        billingCity: "Freiburg",
        billingZip: "79108",
        email: "info@schmidt-abbruch.de",
        phone: "+49 761 987654",
        contacts: { create: [{ firstName: "Anna", lastName: "Schmidt", isPrimary: true, email: "a.schmidt@schmidt-abbruch.de" }] },
      },
    }),
    prisma.customer.create({
      data: {
        customerNumber: "K-10003",
        companyName: "Hochtief Infrastruktur GmbH",
        industry: "Infrastruktur",
        billingStreet: "Alfredstraße 236",
        billingCity: "Essen",
        billingZip: "45133",
        email: "einkauf@hochtief.de",
        phone: "+49 201 824-0",
        discountPercent: 10,
        contacts: { create: [{ firstName: "Michael", lastName: "Wagner", isPrimary: true }] },
      },
    }),
    prisma.customer.create({
      data: {
        customerNumber: "K-10004",
        companyName: "Tunnelbau Nord GmbH",
        industry: "Tunnelbau",
        billingStreet: "Hafenstraße 44",
        billingCity: "Hamburg",
        billingZip: "20457",
        email: "projekt@tunnelbau-nord.de",
        phone: "+49 40 555123",
        contacts: { create: [{ firstName: "Stefan", lastName: "Richter", isPrimary: true }] },
      },
    }),
    prisma.customer.create({
      data: {
        customerNumber: "K-10005",
        companyName: "Maschinenhandel Berger OHG",
        industry: "Handel",
        billingStreet: "Gewerbepark 3",
        billingCity: "Ulm",
        billingZip: "89079",
        email: "vermietung@berger-mh.de",
        phone: "+49 731 445566",
        contacts: { create: [{ firstName: "Lisa", lastName: "Berger", isPrimary: true }] },
      },
    }),
    prisma.customer.create({
      data: {
        customerNumber: "K-10006",
        companyName: "Ed. Züblin AG",
        industry: "Bauwesen",
        billingStreet: "Richtstrecke 21",
        billingCity: "Stuttgart",
        billingZip: "70567",
        email: "geraete@zueblin.de",
        phone: "+49 711 7883-0",
        contacts: { create: [{ firstName: "Robert", lastName: "Zimmermann", isPrimary: true }] },
      },
    }),
    prisma.customer.create({
      data: {
        customerNumber: "K-10007",
        companyName: "Implenia Schweiz AG",
        industry: "Bauwesen",
        billingStreet: "Richtistrasse 17",
        billingCity: "Dietlikon",
        billingZip: "8305",
        billingCountry: "Schweiz",
        email: "tools@implenia.com",
        phone: "+41 44 877 11 11",
        contacts: { create: [{ firstName: "Marco", lastName: "Bianchi", isPrimary: true }] },
      },
    }),
    prisma.customer.create({
      data: {
        customerNumber: "K-10008",
        companyName: "Deutsche Bahn InfraGO",
        industry: "Infrastruktur",
        billingStreet: "Potsdamer Platz 2",
        billingCity: "Berlin",
        billingZip: "10785",
        email: "geraeteverleih@deutschebahn.de",
        phone: "+49 30 297-0",
        paymentTerms: 45,
        contacts: { create: [{ firstName: "Christine", lastName: "Lehmann", isPrimary: true }] },
      },
    }),
  ]);

  const [keller, schmidt, hochtief, tunnelbau, berger, zueblin] = customers;

  const events = await Promise.all([
    prisma.event.create({
      data: {
        name: "bauma 2026 München",
        type: EventType.MESSE,
        status: EventStatus.VORBEREITUNG,
        customerId: null,
        venue: "Messe München",
        city: "München",
        zip: "81829",
        setupStartDate: subDays(today, 2),
        setupEndDate: addDays(today, 1),
        eventStartDate: addDays(today, 2),
        eventEndDate: addDays(today, 7),
        teardownStartDate: addDays(today, 8),
        teardownEndDate: addDays(today, 10),
        responsibleUserId: disposition.id,
        budgetCents: 2500000,
        contactOnSite: "Sabine Weber",
        contactPhone: "+49 170 9876543",
        checklist: { create: { productsReserved: true, accessoriesComplete: false, productChecked: true, transportOrganized: true } },
        products: { create: [{ productId: products[3].id }, { productId: products[0].id }] },
        participants: { create: [{ userId: disposition.id }, { userId: aussendienst.id }] },
      },
    }),
    prisma.event.create({
      data: {
        name: "Kundenvorführung Keller GmbH",
        type: EventType.KUNDENVORFUEHRUNG,
        status: EventStatus.GEPLANT,
        customerId: keller.id,
        venue: "Baustelle Nord Stuttgart",
        city: "Stuttgart",
        eventStartDate: addDays(today, 14),
        eventEndDate: addDays(today, 14),
        responsibleUserId: aussendienst.id,
        budgetCents: 50000,
        checklist: { create: {} },
        products: { create: [{ productId: mc300.id }] },
      },
    }),
    prisma.event.create({
      data: {
        name: "Händlerschulung Berger OHG",
        type: EventType.HAENDLERSCHULUNG,
        status: EventStatus.GEPLANT,
        customerId: berger.id,
        venue: "Schulungsraum Ulm",
        city: "Ulm",
        eventStartDate: addDays(today, 21),
        eventEndDate: addDays(today, 22),
        responsibleUserId: disposition.id,
        budgetCents: 80000,
        checklist: { create: { productsReserved: true } },
        products: { create: [{ productId: products[7].id }] },
      },
    }),
    prisma.event.create({
      data: {
        name: "Produkttest SC600",
        type: EventType.PRODUKTTEST,
        status: EventStatus.LAUFEND,
        venue: "Testgelände Blumberg",
        city: "Blumberg",
        eventStartDate: subDays(today, 3),
        eventEndDate: addDays(today, 4),
        responsibleUserId: service.id,
        checklist: { create: { productChecked: true, transportOrganized: true } },
        products: { create: [{ productId: products[9].id }] },
      },
    }),
  ]);

  const [bauma] = events;

  const bookingsData = [
    { num: "B-2026-10001", type: BookingType.KUNDENVERMIETUNG, status: BookingStatus.AKTIV, customerId: keller.id, productIdx: 1, start: subDays(today, 5), end: addDays(today, 10), responsible: aussendienst.id, rental: 225000 },
    { num: "B-2026-10002", type: BookingType.MESSE, status: BookingStatus.IN_VORBEREITUNG, customerId: null, productIdx: 3, start: subDays(today, 1), end: addDays(today, 8), eventId: bauma.id, responsible: disposition.id, rental: 0 },
    { num: "B-2026-10003", type: BookingType.PRODUKTDEMO, status: BookingStatus.AKTIV, customerId: schmidt.id, productIdx: 4, start: subDays(today, 2), end: addDays(today, 3), responsible: aussendienst.id, rental: 0 },
    { num: "B-2026-10004", type: BookingType.KUNDENVERMIETUNG, status: BookingStatus.UNTERWEGS, customerId: hochtief.id, productIdx: 5, start: today, end: addDays(today, 14), responsible: aussendienst.id, rental: 588000 },
    { num: "B-2026-10005", type: BookingType.WARTUNG, status: BookingStatus.AKTIV, productIdx: 6, start: subDays(today, 3), end: addDays(today, 2), responsible: service.id, rental: 0 },
    { num: "B-2026-10006", type: BookingType.KUNDENVERMIETUNG, status: BookingStatus.BESTAETIGT, customerId: tunnelbau.id, productIdx: 2, start: addDays(today, 3), end: addDays(today, 17), responsible: disposition.id, rental: 392000 },
    { num: "B-2026-10007", type: BookingType.VORFUEHRUNG, status: BookingStatus.BESTAETIGT, customerId: keller.id, productIdx: 0, start: addDays(today, 14), end: addDays(today, 14), responsible: aussendienst.id, rental: 0 },
    { num: "B-2026-10008", type: BookingType.KUNDENVERMIETUNG, status: BookingStatus.ABHOLBEREIT, customerId: zueblin.id, productIdx: 9, start: addDays(today, 1), end: addDays(today, 15), responsible: lager.id, rental: 780000 },
    { num: "B-2026-10009", type: BookingType.KUNDENVERMIETUNG, status: BookingStatus.UEBERFAELLIG, customerId: berger.id, productIdx: 10, start: subDays(today, 20), end: subDays(today, 3), responsible: disposition.id, rental: 595000 },
    { num: "B-2026-10010", type: BookingType.AUSSENDIENSTEINSATZ, status: BookingStatus.AKTIV, productIdx: 8, start: subDays(today, 7), end: addDays(today, 7), responsible: aussendienst.id, rental: 0 },
    { num: "B-2026-10011", type: BookingType.INTERNER_EINSATZ, status: BookingStatus.ABGESCHLOSSEN, productIdx: 14, start: subDays(today, 30), end: subDays(today, 25), responsible: service.id, rental: 0 },
    { num: "B-2026-10012", type: BookingType.KUNDENVERMIETUNG, status: BookingStatus.ENTWURF, customerId: hochtief.id, productIdx: 15, start: addDays(today, 30), end: addDays(today, 45), responsible: disposition.id, rental: 600000 },
    { num: "B-2026-10013", type: BookingType.TRANSPORT, status: BookingStatus.AKTIV, productIdx: 5, start: today, end: today, responsible: lager.id, rental: 0 },
    { num: "B-2026-10014", type: BookingType.REPARATUR, status: BookingStatus.AKTIV, productIdx: 12, start: subDays(today, 5), end: addDays(today, 10), responsible: service.id, rental: 0 },
    { num: "B-2026-10015", type: BookingType.KUNDENVERMIETUNG, status: BookingStatus.ZURUECKGEGEBEN, customerId: schmidt.id, productIdx: 15, start: subDays(today, 15), end: subDays(today, 8), responsible: lager.id, rental: 280000 },
    { num: "B-2026-10016", type: BookingType.MESSE, status: BookingStatus.BESTAETIGT, productIdx: 0, start: addDays(today, 2), end: addDays(today, 7), eventId: bauma.id, responsible: disposition.id, rental: 0 },
    { num: "B-2026-10017", type: BookingType.SPERZZEIT, status: BookingStatus.BESTAETIGT, productIdx: 13, start: addDays(today, 5), end: addDays(today, 20), responsible: service.id, rental: 0 },
    { num: "B-2026-10018", type: BookingType.KUNDENVERMIETUNG, status: BookingStatus.ANFRAGE, customerId: tunnelbau.id, productIdx: 7, start: addDays(today, 7), end: addDays(today, 21), responsible: disposition.id, rental: 210000 },
    { num: "B-2026-10019", type: BookingType.KUNDENVERMIETUNG, status: BookingStatus.IN_PRUEFUNG, customerId: berger.id, productIdx: 15, start: subDays(today, 10), end: subDays(today, 3), responsible: lager.id, rental: 280000 },
    { num: "B-2026-10020", type: BookingType.PRODUKTDEMO, status: BookingStatus.BESTAETIGT, customerId: berger.id, productIdx: 11, start: addDays(today, 5), end: addDays(today, 6), responsible: aussendienst.id, rental: 0 },
    { num: "B-2026-10021", type: BookingType.KUNDENVERMIETUNG, status: BookingStatus.AUSGEGEBEN, customerId: keller.id, productIdx: 14, start: today, end: addDays(today, 7), responsible: lager.id, rental: 280000 },
    { num: "B-2026-10022", type: BookingType.VORFUEHRUNG, status: BookingStatus.VORGEMERKT, customerId: zueblin.id, productIdx: 0, start: addDays(today, 28), end: addDays(today, 28), responsible: aussendienst.id, rental: 0 },
  ];

  for (const b of bookingsData) {
    await prisma.booking.create({
      data: {
        bookingNumber: b.num,
        type: b.type,
        status: b.status,
        customerId: b.customerId ?? null,
        eventId: b.eventId ?? null,
        responsibleUserId: b.responsible,
        pickupLocationId: hauptlager.id,
        deliveryLocationId: b.type === BookingType.MESSE ? messeMuenchen.id : kundeStuttgart.id,
        startDate: b.start,
        plannedReturnDate: b.end,
        rentalCostCents: b.rental,
        totalCostCents: b.rental,
        depositCents: 250000,
        items: { create: [{ productId: products[b.productIdx].id }] },
      },
    });
  }

  const damages = await Promise.all([
    prisma.damageReport.create({
      data: {
        damageNumber: "S-2026-001",
        productId: products[12].id,
        customerId: keller.id,
        reportedById: lager.id,
        category: DamageCategory.HYDRAULIKSCHADEN,
        affectedPart: "Hydraulikzylinder",
        description: "Ölverlust am Hauptzylinder, Dichtung beschädigt",
        severity: DamageSeverity.SCHWER,
        repairRequired: true,
        stillUsable: false,
        estimatedCostCents: 450000,
        status: DamageStatus.IN_REPARATUR,
        markerX: 0.45,
        markerY: 0.62,
      },
    }),
    prisma.damageReport.create({
      data: {
        damageNumber: "S-2026-002",
        productId: products[10].id,
        customerId: berger.id,
        reportedById: service.id,
        category: DamageCategory.KRATZER,
        affectedPart: "Gehäuse",
        description: "Tiefe Kratzer am Gehäuse durch unsachgemäßen Transport",
        severity: DamageSeverity.MITTEL,
        repairRequired: false,
        stillUsable: true,
        estimatedCostCents: 15000,
        customerChargeCents: 15000,
        status: DamageStatus.IN_PRUEFUNG,
      },
    }),
    prisma.damageReport.create({
      data: {
        damageNumber: "S-2026-003",
        productId: products[6].id,
        reportedById: service.id,
        category: DamageCategory.VERSCHLEISS,
        affectedPart: "Backen",
        description: "Verschleiß an den Backen über Normalmaß",
        severity: DamageSeverity.GERING,
        repairRequired: true,
        stillUsable: true,
        estimatedCostCents: 80000,
        status: DamageStatus.ANGEBOT_ANGEFORDERT,
      },
    }),
    prisma.damageReport.create({
      data: {
        damageNumber: "S-2026-004",
        productId: products[13].id,
        reportedById: admin.id,
        category: DamageCategory.HYDRAULIKSCHADEN,
        affectedPart: "Druckbegrenzungsventil",
        description: "Sicherheitsventil reagiert nicht korrekt – Produkt gesperrt",
        severity: DamageSeverity.SICHERHEITSRELEVANT,
        repairRequired: true,
        stillUsable: false,
        estimatedCostCents: 120000,
        isInsuranceCase: true,
        status: DamageStatus.NEU,
      },
    }),
  ]);

  const maintenances = await Promise.all([
    prisma.maintenance.create({
      data: {
        productId: products[6].id,
        type: MaintenanceType.ROUTINE,
        status: MaintenanceStatus.IN_BEARBEITUNG,
        intervalDays: 180,
        lastDate: subDays(today, 180),
        nextDate: subDays(today, 3),
        serviceProvider: "Darda Servicewerkstatt",
        costCents: 85000,
        performedById: service.id,
        notes: "Routine-Wartung inkl. Ölwechsel und Dichtungsprüfung",
      },
    }),
    prisma.maintenance.create({
      data: {
        productId: mc300.id,
        type: MaintenanceType.SICHERHEITSPRUEFUNG,
        status: MaintenanceStatus.GEPLANT,
        intervalDays: 365,
        lastDate: subDays(today, 300),
        nextDate: addDays(today, 65),
        serviceProvider: "Darda Servicewerkstatt",
        performedById: service.id,
      },
    }),
    prisma.maintenance.create({
      data: {
        productId: products[3].id,
        type: MaintenanceType.INSPEKTION,
        status: MaintenanceStatus.FAELLIG,
        intervalDays: 90,
        lastDate: subDays(today, 95),
        nextDate: subDays(today, 5),
        serviceProvider: "Darda Servicewerkstatt",
        performedById: service.id,
      },
    }),
    prisma.maintenance.create({
      data: {
        productId: products[13].id,
        type: MaintenanceType.SICHERHEITSPRUEFUNG,
        status: MaintenanceStatus.UEBERFAELLIG,
        intervalDays: 365,
        lastDate: subDays(today, 400),
        nextDate: subDays(today, 35),
        serviceProvider: "TÜV Süd",
        performedById: service.id,
        notes: "Überfällige Sicherheitsprüfung – Produkt gesperrt",
      },
    }),
    prisma.maintenance.create({
      data: {
        productId: products[1].id,
        type: MaintenanceType.ROUTINE,
        status: MaintenanceStatus.ABGESCHLOSSEN,
        intervalDays: 180,
        lastDate: subDays(today, 10),
        nextDate: addDays(today, 170),
        serviceProvider: "Darda Servicewerkstatt",
        costCents: 45000,
        result: "Bestanden – keine Mängel",
        performedById: service.id,
      },
    }),
  ]);

  await prisma.cost.createMany({
    data: [
      { type: CostType.MIETE, amountCents: 225000, description: "MC400 Vermietung Keller", bookingId: (await prisma.booking.findFirst({ where: { bookingNumber: "B-2026-10001" } }))!.id, date: subDays(today, 5) },
      { type: CostType.MIETE, amountCents: 595000, description: "AB500 Vermietung Berger (überfällig)", bookingId: (await prisma.booking.findFirst({ where: { bookingNumber: "B-2026-10009" } }))!.id, date: subDays(today, 20) },
      { type: CostType.MESSE, amountCents: 450000, description: "bauma Standkosten", eventId: bauma.id, date: today },
      { type: CostType.TRANSPORT, amountCents: 125000, description: "Spedition München", eventId: bauma.id, date: subDays(today, 1) },
      { type: CostType.REPARATUR, amountCents: 450000, description: "MC500 Hydraulikreparatur", date: subDays(today, 3) },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: disposition.id, type: NotificationType.RUECKGABE_UEBERFAELLIG, title: "Überfällige Rückgabe", message: "AB500 bei Berger OHG – Rückgabe seit 3 Tagen überfällig", link: "/buchungen" },
      { userId: lager.id, type: NotificationType.AUSGABE_MORGEN, title: "Abholung morgen", message: "SC600 für Züblin AG – Abholbereit im Versand", link: "/ausgaben-rueckgaben" },
      { userId: service.id, type: NotificationType.WARTUNG_FAELLIG, title: "Wartung fällig", message: "SC400 – Inspektion überfällig seit 5 Tagen", link: "/wartungen" },
      { userId: admin.id, type: NotificationType.SCHADEN_GEMELDET, title: "Neuer Schadensfall", message: "HAG300 – Sicherheitsrelevantes Problem gemeldet", link: "/schaeden" },
      { userId: disposition.id, type: NotificationType.BUCHUNGSKONFLIKT, title: "Buchungskonflikt", message: "MC300 – Überschneidung bei bauma und Vorführung Keller", link: "/planung" },
    ],
  });

  console.log("✅ Seed abgeschlossen!");
  console.log("");
  console.log("Demo-Logins:");
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
