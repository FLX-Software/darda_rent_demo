import { Prisma, type PrismaClient } from "@prisma/client";
import { BookingStatus, BookingType, ProductStatus } from "@prisma/client";
import { addDays, subDays } from "date-fns";
import { prisma } from "./prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export const BLOCKING_STATUSES: BookingStatus[] = [
  "VORGEMERKT",
  "BESTAETIGT",
  "IN_VORBEREITUNG",
  "ABHOLBEREIT",
  "AUSGEGEBEN",
  "UNTERWEGS",
  "AKTIV",
  "RUECKGABE_FAELLIG",
  "UEBERFAELLIG",
];

const BLOCKING_TYPES: BookingType[] = [
  "KUNDENVERMIETUNG",
  "MESSE",
  "PRODUKTDEMO",
  "VORFUEHRUNG",
  "AUSSENDIENSTEINSATZ",
  "INTERNER_EINSATZ",
  "TRANSPORT",
  "WARTUNG",
  "REPARATUR",
  "SPERZZEIT",
];

export interface AvailabilityConflict {
  productId: string;
  productName: string;
  inventoryNumber: string;
  bookingId: string;
  bookingNumber: string;
  bookingType: BookingType;
  startDate: Date;
  endDate: Date;
  responsibleName?: string;
  overlapStart: Date;
  overlapEnd: Date;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: AvailabilityConflict[];
  alternatives: { id: string; name: string; inventoryNumber: string }[];
  nextFreeSlot?: { start: Date; end: Date };
}

export function getEffectiveRange(
  startDate: Date,
  endDate: Date,
  prepBefore: number,
  prepAfter: number
) {
  return {
    start: subDays(startDate, prepBefore),
    end: addDays(endDate, prepAfter),
  };
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function isBlockingStatus(status: BookingStatus): boolean {
  return BLOCKING_STATUSES.includes(status);
}

/** Sperrt Produktzeilen in der Transaktion gegen parallele Buchungen. */
export async function lockProducts(tx: Prisma.TransactionClient, productIds: string[]) {
  const unique = [...new Set(productIds)].filter(Boolean);
  if (unique.length === 0) return;
  await tx.$queryRaw`
    SELECT id FROM "Product"
    WHERE id IN (${Prisma.join(unique)})
    FOR UPDATE
  `;
}

export async function checkProductAvailability(
  productId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string,
  prepBefore = 0,
  prepAfter = 0,
  db: Db = prisma
): Promise<AvailabilityResult> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });

  if (!product || product.isArchived) {
    return { available: false, conflicts: [], alternatives: [] };
  }

  if (product.status === "GESPERRT" || product.status === "AUSGEMUSTERT") {
    return { available: false, conflicts: [], alternatives: [] };
  }

  const overdueMaintenance = await db.maintenance.findFirst({
    where: {
      productId,
      status: "UEBERFAELLIG",
      type: "SICHERHEITSPRUEFUNG",
    },
  });

  if (overdueMaintenance) {
    return { available: false, conflicts: [], alternatives: [] };
  }

  const range = getEffectiveRange(startDate, endDate, prepBefore, prepAfter);

  const existingBookings = await db.booking.findMany({
    where: {
      isArchived: false,
      status: { in: BLOCKING_STATUSES },
      type: { in: BLOCKING_TYPES },
      items: { some: { productId } },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    include: {
      items: { where: { productId }, include: { product: true } },
      responsibleUser: true,
      customer: true,
    },
  });

  const conflicts: AvailabilityConflict[] = [];

  for (const booking of existingBookings) {
    const bookingRange = getEffectiveRange(
      booking.startDate,
      booking.plannedReturnDate,
      booking.prepDaysBefore,
      booking.prepDaysAfter
    );

    if (rangesOverlap(range.start, range.end, bookingRange.start, bookingRange.end)) {
      const overlapStart = new Date(Math.max(range.start.getTime(), bookingRange.start.getTime()));
      const overlapEnd = new Date(Math.min(range.end.getTime(), bookingRange.end.getTime()));

      conflicts.push({
        productId,
        productName: product.name,
        inventoryNumber: product.inventoryNumber,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        bookingType: booking.type,
        startDate: booking.startDate,
        endDate: booking.plannedReturnDate,
        responsibleName: booking.responsibleUser
          ? `${booking.responsibleUser.firstName} ${booking.responsibleUser.lastName}`
          : undefined,
        overlapStart,
        overlapEnd,
      });
    }
  }

  let alternatives: { id: string; name: string; inventoryNumber: string }[] = [];

  if (conflicts.length > 0) {
    alternatives = await db.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: productId },
        isArchived: false,
        status: { in: ["VERFUEGBAR", "RESERVIERT"] },
      },
      select: { id: true, name: true, inventoryNumber: true },
      take: 5,
    });
  }

  return {
    available: conflicts.length === 0,
    conflicts,
    alternatives,
  };
}

export async function checkMultipleProductsAvailability(
  productIds: string[],
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string,
  prepBefore = 0,
  prepAfter = 0,
  db: Db = prisma
): Promise<AvailabilityResult> {
  const allConflicts: AvailabilityConflict[] = [];
  const allAlternatives: { id: string; name: string; inventoryNumber: string }[] = [];

  for (const productId of productIds) {
    const result = await checkProductAvailability(
      productId,
      startDate,
      endDate,
      excludeBookingId,
      prepBefore,
      prepAfter,
      db
    );
    allConflicts.push(...result.conflicts);
    allAlternatives.push(...result.alternatives);
  }

  const uniqueAlternatives = allAlternatives.filter(
    (alt, index, self) => self.findIndex((a) => a.id === alt.id) === index
  );

  return {
    available: allConflicts.length === 0,
    conflicts: allConflicts,
    alternatives: uniqueAlternatives.slice(0, 5),
  };
}

export function formatConflictMessage(conflicts: AvailabilityConflict[]): string {
  return conflicts.map((c) => `${c.productName} (${c.inventoryNumber})`).join(", ");
}

export function getProductStatusForBookingType(type: BookingType): ProductStatus {
  const map: Partial<Record<BookingType, ProductStatus>> = {
    KUNDENVERMIETUNG: "BEIM_KUNDEN",
    MESSE: "AUF_MESSE",
    PRODUKTDEMO: "BEI_DEMO",
    VORFUEHRUNG: "BEI_DEMO",
    AUSSENDIENSTEINSATZ: "INTERN_IM_EINSATZ",
    INTERNER_EINSATZ: "INTERN_IM_EINSATZ",
    TRANSPORT: "UNTERWEGS",
    WARTUNG: "IN_WARTUNG",
    REPARATUR: "IN_REPARATUR",
    SPERZZEIT: "GESPERRT",
  };
  return map[type] ?? "RESERVIERT";
}
