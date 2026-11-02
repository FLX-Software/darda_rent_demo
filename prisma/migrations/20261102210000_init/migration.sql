-- FLX Rent, Initialmigration 20261102210000_init
-- Erzeugt aus prisma/schema.prisma mit Prisma 6.1 (migrate diff, leere Quelle).
-- Im Supabase-SQL-Editor einmal vollständig ausführen.
-- Enthält kein DROP, kein DELETE und keine Demo-Daten.
-- Danach lokal: npx prisma migrate resolve --applied 20261102210000_init
-- Diese Datei danach nicht mehr ändern, sonst weicht die Prisma-Prüfsumme ab.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DISPOSITION', 'LAGER', 'AUSSENDIENST', 'SERVICE', 'LESEND');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('VERFUEGBAR', 'RESERVIERT', 'VORGEMERKT', 'IN_VORBEREITUNG', 'ABHOLBEREIT', 'UNTERWEGS', 'BEIM_KUNDEN', 'AUF_MESSE', 'BEI_DEMO', 'INTERN_IM_EINSATZ', 'RUECKGABE_AUSSTEHEND', 'IN_PRUEFUNG', 'IN_WARTUNG', 'IN_REPARATUR', 'BESCHAEDIGT', 'GESPERRT', 'AUSGEMUSTERT');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEU', 'SEHR_GUT', 'GUT', 'BEFRIEDIGEND', 'MAENGELHAFT', 'BESCHAEDIGT');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('HAUPTLAGER', 'AUSSENLAGER', 'NIEDERLASSUNG', 'KUNDE', 'MESSE', 'DEMO', 'AUSSENDIENSTFAHRZEUG', 'SPEDITION', 'WERKSTATT', 'REPARATURDIENSTLEISTER', 'UNTERWEGS');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('KUNDENVERMIETUNG', 'MESSE', 'PRODUKTDEMO', 'VORFUEHRUNG', 'AUSSENDIENSTEINSATZ', 'INTERNER_EINSATZ', 'TRANSPORT', 'WARTUNG', 'REPARATUR', 'SPERZZEIT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('ENTWURF', 'ANFRAGE', 'VORGEMERKT', 'BESTAETIGT', 'IN_VORBEREITUNG', 'ABHOLBEREIT', 'AUSGEGEBEN', 'UNTERWEGS', 'AKTIV', 'RUECKGABE_FAELLIG', 'UEBERFAELLIG', 'ZURUECKGEGEBEN', 'IN_PRUEFUNG', 'ABGESCHLOSSEN', 'STORNIERT');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MESSE', 'KUNDENVORFUEHRUNG', 'INTERNE_SCHULUNG', 'HAENDLERSCHULUNG', 'PRODUKTTEST', 'AUSSENDIENST_DEMO');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('GEPLANT', 'VORBEREITUNG', 'LAUFEND', 'ABBAU', 'ABGESCHLOSSEN', 'STORNIERT');

-- CreateEnum
CREATE TYPE "DamageCategory" AS ENUM ('KRATZER', 'RISS', 'BRUCH', 'VERFORMUNG', 'HYDRAULIKSCHADEN', 'LECKAGE', 'ELEKTRISCHER_DEFEKT', 'VERSCHLEISS', 'FEHLENDES_TEIL', 'TRANSPORTSCHADEN', 'UNSACHGEMAESSE_NUTZUNG', 'SONSTIGER_SCHADEN');

-- CreateEnum
CREATE TYPE "DamageSeverity" AS ENUM ('GERING', 'MITTEL', 'SCHWER', 'SICHERHEITSRELEVANT');

-- CreateEnum
CREATE TYPE "DamageStatus" AS ENUM ('NEU', 'IN_PRUEFUNG', 'ANGEBOT_ANGEFORDERT', 'FREIGEGEBEN', 'IN_REPARATUR', 'REPARIERT', 'ABGERECHNET', 'GESCHLOSSEN');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('GEPLANT', 'FAELLIG', 'UEBERFAELLIG', 'IN_BEARBEITUNG', 'ABGESCHLOSSEN');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('ROUTINE', 'SICHERHEITSPRUEFUNG', 'INSPEKTION', 'REPARATUR', 'KALIBRIERUNG');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('MIETE', 'INTERNE_KOSTEN', 'TRANSPORT', 'VERSICHERUNG', 'REPARATUR', 'REINIGUNG', 'MESSE', 'DEMO', 'ERSTZTEIL', 'NACHBELASTUNG', 'KAUTION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('AUSGABE_MORGEN', 'RUECKGABE_MORGEN', 'RUECKGABE_UEBERFAELLIG', 'NEUE_BUCHUNG', 'BUCHUNGSKONFLIKT', 'SCHADEN_GEMELDET', 'WARTUNG_FAELLIG', 'ZUBEHOER_FEHLT', 'PRODUKT_VERSCHOBEN', 'PRODUKT_VERFUEGBAR');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "ShipmentMethod" AS ENUM ('ABHOLUNG', 'EIGENTRANSPORT', 'SPEDITION', 'KURIER', 'POST');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DATENBLATT', 'BEDIENUNGSANLEITUNG', 'VERTRAG', 'LIEFERSCHEIN', 'RUECKGABEPROTOKOLL', 'PRUEFBERICHT', 'RECHNUNG', 'SONSTIGES');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'LESEND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT,
    "billingStreet" TEXT NOT NULL,
    "billingCity" TEXT NOT NULL,
    "billingZip" TEXT NOT NULL,
    "billingCountry" TEXT NOT NULL DEFAULT 'Deutschland',
    "email" TEXT,
    "phone" TEXT,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Deutschland',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DeliveryAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDocument" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'SONSTIGES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProductPrice" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "dailyRateCents" INTEGER,
    "weeklyRateCents" INTEGER,

    CONSTRAINT "CustomerProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL DEFAULT 'Darda GmbH',
    "inventoryNumber" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT,
    "weightKg" DECIMAL(10,2),
    "dimensions" TEXT,
    "yearBuilt" INTEGER,
    "purchaseDate" TIMESTAMP(3),
    "purchaseValueCents" INTEGER,
    "replacementValueCents" INTEGER,
    "dailyRateCents" INTEGER NOT NULL DEFAULT 0,
    "weeklyRateCents" INTEGER,
    "internalCostCents" INTEGER,
    "depositCents" INTEGER,
    "status" "ProductStatus" NOT NULL DEFAULT 'VERFUEGBAR',
    "condition" "ProductCondition" NOT NULL DEFAULT 'GUT',
    "locationId" TEXT,
    "responsibleUserId" TEXT,
    "operatingHours" INTEGER,
    "lastUsedAt" TIMESTAMP(3),
    "nextBookingAt" TIMESTAMP(3),
    "lastMaintenanceAt" TIMESTAMP(3),
    "nextMaintenanceAt" TIMESTAMP(3),
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDocument" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'SONSTIGES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accessory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inventoryNumber" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Accessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAccessory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "accessoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductAccessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCompatibility" (
    "id" TEXT NOT NULL,
    "productAId" TEXT NOT NULL,
    "productBId" TEXT NOT NULL,

    CONSTRAINT "ProductCompatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "street" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Deutschland',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" TEXT,
    "bookingId" TEXT,
    "note" TEXT,

    CONSTRAINT "LocationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "type" "BookingType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'ENTWURF',
    "customerId" TEXT,
    "contactName" TEXT,
    "projectName" TEXT,
    "eventId" TEXT,
    "responsibleUserId" TEXT,
    "pickupLocationId" TEXT,
    "deliveryLocationId" TEXT,
    "deliveryAddress" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "plannedReturnDate" TIMESTAMP(3) NOT NULL,
    "plannedReturnTime" TEXT,
    "actualCheckoutAt" TIMESTAMP(3),
    "actualReturnAt" TIMESTAMP(3),
    "prepDaysBefore" INTEGER NOT NULL DEFAULT 0,
    "prepDaysAfter" INTEGER NOT NULL DEFAULT 0,
    "shipmentMethod" "ShipmentMethod",
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "rentalCostCents" INTEGER NOT NULL DEFAULT 0,
    "transportCostCents" INTEGER NOT NULL DEFAULT 0,
    "additionalCostCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "totalCostCents" INTEGER NOT NULL DEFAULT 0,
    "internalCostCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingItem" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "dailyRateCents" INTEGER,
    "notes" TEXT,

    CONSTRAINT "BookingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAccessory" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "accessoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isReturned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BookingAccessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingDocument" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'SONSTIGES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'GEPLANT',
    "customerId" TEXT,
    "venue" TEXT,
    "street" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "setupStartDate" TIMESTAMP(3),
    "setupEndDate" TIMESTAMP(3),
    "eventStartDate" TIMESTAMP(3) NOT NULL,
    "eventEndDate" TIMESTAMP(3) NOT NULL,
    "teardownStartDate" TIMESTAMP(3),
    "teardownEndDate" TIMESTAMP(3),
    "responsibleUserId" TEXT,
    "transportNotes" TEXT,
    "carrier" TEXT,
    "hotelInfo" TEXT,
    "budgetCents" INTEGER,
    "actualCostCents" INTEGER,
    "contactOnSite" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventProduct" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "EventProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventChecklist" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "productsReserved" BOOLEAN NOT NULL DEFAULT false,
    "accessoriesComplete" BOOLEAN NOT NULL DEFAULT false,
    "productChecked" BOOLEAN NOT NULL DEFAULT false,
    "transportOrganized" BOOLEAN NOT NULL DEFAULT false,
    "documentsReady" BOOLEAN NOT NULL DEFAULT false,
    "productsLoaded" BOOLEAN NOT NULL DEFAULT false,
    "returnPlanned" BOOLEAN NOT NULL DEFAULT false,
    "returnCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EventChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventDocument" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'SONSTIGES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckOut" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "checkedOutById" TEXT NOT NULL,
    "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientName" TEXT,
    "recipientSigned" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "operatingHours" INTEGER,

    CONSTRAINT "CheckOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckOutItem" (
    "id" TEXT NOT NULL,
    "checkOutId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "condition" "ProductCondition" NOT NULL,
    "serialVerified" BOOLEAN NOT NULL DEFAULT false,
    "accessoriesChecked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "CheckOutItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "checkedInById" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cleaningCostCents" INTEGER NOT NULL DEFAULT 0,
    "repairCostCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInItem" (
    "id" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "condition" "ProductCondition" NOT NULL,
    "missingAccessories" TEXT,
    "damageNoted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "CheckInItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionReport" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "condition" "ProductCondition" NOT NULL,
    "notes" TEXT,
    "checkOutId" TEXT,
    "checkInId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConditionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionReportImage" (
    "id" TEXT NOT NULL,
    "conditionReportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,

    CONSTRAINT "ConditionReportImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageReport" (
    "id" TEXT NOT NULL,
    "damageNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "bookingId" TEXT,
    "customerId" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedById" TEXT NOT NULL,
    "category" "DamageCategory" NOT NULL,
    "affectedPart" TEXT,
    "description" TEXT NOT NULL,
    "severity" "DamageSeverity" NOT NULL,
    "repairRequired" BOOLEAN NOT NULL DEFAULT false,
    "stillUsable" BOOLEAN NOT NULL DEFAULT false,
    "estimatedCostCents" INTEGER,
    "actualCostCents" INTEGER,
    "responsibility" TEXT,
    "isInsuranceCase" BOOLEAN NOT NULL DEFAULT false,
    "customerChargeCents" INTEGER,
    "status" "DamageStatus" NOT NULL DEFAULT 'NEU',
    "notes" TEXT,
    "markerX" DOUBLE PRECISION,
    "markerY" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DamageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageImage" (
    "id" TEXT NOT NULL,
    "damageReportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,

    CONSTRAINT "DamageImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageStatusHistory" (
    "id" TEXT NOT NULL,
    "damageReportId" TEXT NOT NULL,
    "fromStatus" "DamageStatus",
    "toStatus" "DamageStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "DamageStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'GEPLANT',
    "intervalDays" INTEGER,
    "lastDate" TIMESTAMP(3),
    "nextDate" TIMESTAMP(3),
    "operatingHours" INTEGER,
    "serviceProvider" TEXT,
    "costCents" INTEGER,
    "result" TEXT,
    "reportUrl" TEXT,
    "performedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceDocument" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "MaintenanceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cost" (
    "id" TEXT NOT NULL,
    "type" "CostType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT,
    "bookingId" TEXT,
    "eventId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Darda GmbH',
    "companyAddress" TEXT NOT NULL DEFAULT 'Darda-Straße 1, 78199 Bräunlingen',
    "contactEmail" TEXT NOT NULL DEFAULT 'info@darda.de',
    "prepDaysDefault" INTEGER NOT NULL DEFAULT 1,
    "returnDaysDefault" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "notifyCheckoutTomorrow" BOOLEAN NOT NULL DEFAULT true,
    "notifyReturnTomorrow" BOOLEAN NOT NULL DEFAULT true,
    "notifyOverdueReturn" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewBooking" BOOLEAN NOT NULL DEFAULT true,
    "notifyBookingConflict" BOOLEAN NOT NULL DEFAULT true,
    "notifyMaintenanceDue" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fromStatus" "ProductStatus",
    "toStatus" "ProductStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    "note" TEXT,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerNumber_key" ON "Customer"("customerNumber");

-- CreateIndex
CREATE INDEX "Customer_customerNumber_idx" ON "Customer"("customerNumber");

-- CreateIndex
CREATE INDEX "Customer_companyName_idx" ON "Customer"("companyName");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE INDEX "DeliveryAddress_customerId_idx" ON "DeliveryAddress"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProductPrice_customerId_productId_key" ON "CustomerProductPrice"("customerId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_inventoryNumber_key" ON "Product"("inventoryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Product_serialNumber_key" ON "Product"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Product_qrCode_key" ON "Product"("qrCode");

-- CreateIndex
CREATE INDEX "Product_inventoryNumber_idx" ON "Product"("inventoryNumber");

-- CreateIndex
CREATE INDEX "Product_serialNumber_idx" ON "Product"("serialNumber");

-- CreateIndex
CREATE INDEX "Product_qrCode_idx" ON "Product"("qrCode");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_locationId_idx" ON "Product"("locationId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Accessory_inventoryNumber_key" ON "Accessory"("inventoryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAccessory_productId_accessoryId_key" ON "ProductAccessory"("productId", "accessoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCompatibility_productAId_productBId_key" ON "ProductCompatibility"("productAId", "productBId");

-- CreateIndex
CREATE INDEX "Location_type_idx" ON "Location"("type");

-- CreateIndex
CREATE INDEX "LocationHistory_productId_idx" ON "LocationHistory"("productId");

-- CreateIndex
CREATE INDEX "LocationHistory_changedAt_idx" ON "LocationHistory"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_bookingNumber_idx" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_type_idx" ON "Booking"("type");

-- CreateIndex
CREATE INDEX "Booking_startDate_plannedReturnDate_idx" ON "Booking"("startDate", "plannedReturnDate");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- CreateIndex
CREATE INDEX "BookingItem_productId_idx" ON "BookingItem"("productId");

-- CreateIndex
CREATE INDEX "BookingItem_bookingId_idx" ON "BookingItem"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingItem_bookingId_productId_key" ON "BookingItem"("bookingId", "productId");

-- CreateIndex
CREATE INDEX "BookingAccessory_bookingId_idx" ON "BookingAccessory"("bookingId");

-- CreateIndex
CREATE INDEX "Event_eventStartDate_eventEndDate_idx" ON "Event"("eventStartDate", "eventEndDate");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_userId_key" ON "EventParticipant"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventProduct_eventId_productId_key" ON "EventProduct"("eventId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "EventChecklist_eventId_key" ON "EventChecklist"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "DamageReport_damageNumber_key" ON "DamageReport"("damageNumber");

-- CreateIndex
CREATE INDEX "DamageReport_damageNumber_idx" ON "DamageReport"("damageNumber");

-- CreateIndex
CREATE INDEX "DamageReport_productId_idx" ON "DamageReport"("productId");

-- CreateIndex
CREATE INDEX "DamageReport_status_idx" ON "DamageReport"("status");

-- CreateIndex
CREATE INDEX "Maintenance_productId_idx" ON "Maintenance"("productId");

-- CreateIndex
CREATE INDEX "Maintenance_nextDate_idx" ON "Maintenance"("nextDate");

-- CreateIndex
CREATE INDEX "Maintenance_status_idx" ON "Maintenance"("status");

-- CreateIndex
CREATE INDEX "Cost_type_idx" ON "Cost"("type");

-- CreateIndex
CREATE INDEX "Cost_date_idx" ON "Cost"("date");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "StatusHistory_productId_idx" ON "StatusHistory"("productId");

-- CreateIndex
CREATE INDEX "StatusHistory_changedAt_idx" ON "StatusHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAddress" ADD CONSTRAINT "DeliveryAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProductPrice" ADD CONSTRAINT "CustomerProductPrice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProductPrice" ADD CONSTRAINT "CustomerProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAccessory" ADD CONSTRAINT "ProductAccessory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAccessory" ADD CONSTRAINT "ProductAccessory_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompatibility" ADD CONSTRAINT "ProductCompatibility_productAId_fkey" FOREIGN KEY ("productAId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompatibility" ADD CONSTRAINT "ProductCompatibility_productBId_fkey" FOREIGN KEY ("productBId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationHistory" ADD CONSTRAINT "LocationHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationHistory" ADD CONSTRAINT "LocationHistory_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationHistory" ADD CONSTRAINT "LocationHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationHistory" ADD CONSTRAINT "LocationHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_deliveryLocationId_fkey" FOREIGN KEY ("deliveryLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAccessory" ADD CONSTRAINT "BookingAccessory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAccessory" ADD CONSTRAINT "BookingAccessory_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDocument" ADD CONSTRAINT "BookingDocument_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProduct" ADD CONSTRAINT "EventProduct_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProduct" ADD CONSTRAINT "EventProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChecklist" ADD CONSTRAINT "EventChecklist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDocument" ADD CONSTRAINT "EventDocument_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckOut" ADD CONSTRAINT "CheckOut_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckOut" ADD CONSTRAINT "CheckOut_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckOutItem" ADD CONSTRAINT "CheckOutItem_checkOutId_fkey" FOREIGN KEY ("checkOutId") REFERENCES "CheckOut"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInItem" ADD CONSTRAINT "CheckInItem_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionReport" ADD CONSTRAINT "ConditionReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionReport" ADD CONSTRAINT "ConditionReport_checkOutId_fkey" FOREIGN KEY ("checkOutId") REFERENCES "CheckOut"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionReport" ADD CONSTRAINT "ConditionReport_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionReportImage" ADD CONSTRAINT "ConditionReportImage_conditionReportId_fkey" FOREIGN KEY ("conditionReportId") REFERENCES "ConditionReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageImage" ADD CONSTRAINT "DamageImage_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "DamageReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageStatusHistory" ADD CONSTRAINT "DamageStatusHistory_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "DamageReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceDocument" ADD CONSTRAINT "MaintenanceDocument_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "Maintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
