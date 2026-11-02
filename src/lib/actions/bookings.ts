"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BookingStatus, BookingType, Prisma, ShipmentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  checkMultipleProductsAvailability,
  formatConflictMessage,
  isBlockingStatus,
  lockProducts,
} from "@/lib/availability";
import { calcRentalCostCents } from "@/lib/pricing";
import { authorize } from "@/lib/session";
import { generateBookingNumber, serializeForClient } from "@/lib/utils";
import { getNextBookingStatus } from "@/lib/booking-status";
import { actionError, actionSuccess, getValidationError } from "./types";

const CONFIRMED_STATUSES: BookingStatus[] = ["BESTAETIGT", "IN_VORBEREITUNG", "ABHOLBEREIT"];

const CHECKOUT_READY_STATUSES: BookingStatus[] = [
  "ABHOLBEREIT",
  "BESTAETIGT",
  "IN_VORBEREITUNG",
  "AUSGEGEBEN",
  "UNTERWEGS",
  "AKTIV",
  "RUECKGABE_FAELLIG",
  "UEBERFAELLIG",
];

const bookingFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  type: z.nativeEnum(BookingType).optional(),
  customerId: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  includeArchived: z.boolean().optional(),
});

const bookingItemSchema = z.object({
  productId: z.string().min(1, "Produkt ist erforderlich"),
  quantity: z.number().int().min(1).default(1),
});

const createBookingBaseSchema = z.object({
  type: z.nativeEnum(BookingType),
  status: z.nativeEnum(BookingStatus).default("ENTWURF"),
  customerId: z.string().optional(),
  contactName: z.string().optional(),
  projectName: z.string().optional(),
  startDate: z.coerce.date(),
  plannedReturnDate: z.coerce.date(),
  prepDaysBefore: z.number().int().min(0).default(0),
  prepDaysAfter: z.number().int().min(0).default(0),
  shipmentMethod: z.nativeEnum(ShipmentMethod).optional(),
  notes: z.string().optional(),
  items: z.array(bookingItemSchema).min(1, "Mindestens ein Produkt erforderlich"),
});

const createBookingSchema = createBookingBaseSchema.refine(
  (data) => data.plannedReturnDate >= data.startDate,
  {
    message: "Rückgabedatum muss nach dem Startdatum liegen",
    path: ["plannedReturnDate"],
  }
);

const updateBookingSchema = createBookingBaseSchema
  .omit({ items: true })
  .partial()
  .extend({
    items: z.array(bookingItemSchema).optional(),
    eventId: z.string().optional(),
    responsibleUserId: z.string().optional(),
    pickupLocationId: z.string().optional(),
    deliveryLocationId: z.string().optional(),
    deliveryAddress: z.string().optional(),
    startTime: z.string().optional(),
    plannedReturnTime: z.string().optional(),
    carrier: z.string().optional(),
    trackingNumber: z.string().optional(),
    rentalCostCents: z.number().int().min(0).optional(),
    transportCostCents: z.number().int().min(0).optional(),
    additionalCostCents: z.number().int().min(0).optional(),
    discountCents: z.number().int().min(0).optional(),
    depositCents: z.number().int().min(0).optional(),
  });

function coerceDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

async function reserveProductsForBooking(
  tx: Prisma.TransactionClient,
  productIds: string[],
  bookingNumber: string,
  startDate: Date,
  userId: string
) {
  for (const productId of productIds) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product || product.status === "RESERVIERT") continue;

    await tx.product.update({
      where: { id: productId },
      data: { status: "RESERVIERT", nextBookingAt: startDate },
    });

    await tx.statusHistory.create({
      data: {
        productId,
        fromStatus: product.status,
        toStatus: "RESERVIERT",
        changedById: userId,
        note: `Reserviert für Buchung ${bookingNumber}`,
      },
    });
  }
}

async function releaseReservedProducts(
  tx: Prisma.TransactionClient,
  productIds: string[],
  bookingNumber: string,
  userId: string
) {
  for (const productId of productIds) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== "RESERVIERT") continue;

    await tx.product.update({
      where: { id: productId },
      data: { status: "VERFUEGBAR", nextBookingAt: null },
    });

    await tx.statusHistory.create({
      data: {
        productId,
        fromStatus: product.status,
        toStatus: "VERFUEGBAR",
        changedById: userId,
        note: `Freigegeben nach Stornierung ${bookingNumber}`,
      },
    });
  }
}

export async function getBookings(filters?: z.infer<typeof bookingFiltersSchema>) {
  try {
    const auth = await authorize("bookings.view");
    if (!auth.ok) return actionError(auth.error);

    const parsed = filters
      ? bookingFiltersSchema.safeParse(filters)
      : { success: true as const, data: {} };

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const { search, status, type, customerId, fromDate, toDate, includeArchived } = parsed.data;

    const bookings = await prisma.booking.findMany({
      where: {
        ...(includeArchived ? {} : { isArchived: false }),
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(customerId ? { customerId } : {}),
        ...(fromDate || toDate
          ? {
              AND: [
                ...(fromDate ? [{ plannedReturnDate: { gte: fromDate } }] : []),
                ...(toDate ? [{ startDate: { lte: toDate } }] : []),
              ],
            }
          : {}),
        ...(search
          ? {
              OR: [
                { bookingNumber: { contains: search, mode: "insensitive" } },
                { projectName: { contains: search, mode: "insensitive" } },
                { contactName: { contains: search, mode: "insensitive" } },
                { customer: { companyName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        customer: { select: { companyName: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    return actionSuccess(serializeForClient(bookings));
  } catch {
    return actionError("Buchungen konnten nicht geladen werden");
  }
}

export async function getBooking(id: string) {
  try {
    const auth = await authorize("bookings.view");
    if (!auth.ok) return actionError(auth.error);

    if (!id) {
      return actionError("Buchungs-ID ist erforderlich");
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: { include: { contacts: true, deliveryAddresses: true } },
        items: { include: { product: { include: { category: true, images: true } } } },
        accessories: { include: { accessory: true } },
        pickupLocation: true,
        deliveryLocation: true,
        responsibleUser: true,
        checkOuts: { include: { items: true }, orderBy: { checkedOutAt: "desc" } },
        checkIns: { include: { items: true }, orderBy: { checkedInAt: "desc" } },
      },
    });

    if (!booking) {
      return actionError("Buchung nicht gefunden");
    }

    return actionSuccess(serializeForClient(booking));
  } catch {
    return actionError("Buchung konnte nicht geladen werden");
  }
}

export async function createBooking(input: z.input<typeof createBookingSchema>) {
  try {
    const auth = await authorize("bookings.create");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;
    const parsed = createBookingSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;
    const productIds = data.items.map((item) => item.productId);
    const needsLock = isBlockingStatus(data.status);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, dailyRateCents: true },
    });
    const rateByProductId = new Map(products.map((p) => [p.id, p.dailyRateCents]));
    const rentalCostCents = calcRentalCostCents(
      data.items,
      rateByProductId,
      data.startDate,
      data.plannedReturnDate
    );

    const booking = await prisma.$transaction(async (tx) => {
      if (needsLock) {
        await lockProducts(tx, productIds);
        const availability = await checkMultipleProductsAvailability(
          productIds,
          data.startDate,
          data.plannedReturnDate,
          undefined,
          data.prepDaysBefore,
          data.prepDaysAfter,
          tx
        );
        if (!availability.available) {
          throw new Error(
            `Verfügbarkeitskonflikt bei: ${formatConflictMessage(availability.conflicts)}`
          );
        }
      }

      const created = await tx.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          type: data.type,
          status: data.status,
          customerId: data.customerId,
          contactName: data.contactName,
          projectName: data.projectName,
          responsibleUserId: user.id,
          startDate: data.startDate,
          plannedReturnDate: data.plannedReturnDate,
          prepDaysBefore: data.prepDaysBefore,
          prepDaysAfter: data.prepDaysAfter,
          shipmentMethod: data.shipmentMethod,
          rentalCostCents,
          totalCostCents: rentalCostCents,
          notes: data.notes,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              dailyRateCents: rateByProductId.get(item.productId),
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      if (CONFIRMED_STATUSES.includes(data.status)) {
        await reserveProductsForBooking(
          tx,
          productIds,
          created.bookingNumber,
          data.startDate,
          user.id
        );
      }

      return created;
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "Booking",
      entityId: booking.id,
      newValue: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        startDate: booking.startDate,
        plannedReturnDate: booking.plannedReturnDate,
      },
    });

    revalidatePath("/buchungen");
    revalidatePath("/planung");
    revalidatePath("/produkte");
    return actionSuccess(serializeForClient({ id: booking.id, bookingNumber: booking.bookingNumber }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Verfügbarkeitskonflikt")) return actionError(message);
    return actionError("Buchung konnte nicht erstellt werden");
  }
}

export async function updateBooking(id: string, input: z.infer<typeof updateBookingSchema>) {
  try {
    const auth = await authorize("bookings.edit");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;
    const parsed = updateBookingSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    if (!id) {
      return actionError("Buchungs-ID ist erforderlich");
    }

    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return actionError("Buchung nicht gefunden");
    }

    const data = parsed.data;
    const startDate = data.startDate ?? existing.startDate;
    const plannedReturnDate = data.plannedReturnDate ?? existing.plannedReturnDate;
    const prepDaysBefore = data.prepDaysBefore ?? existing.prepDaysBefore;
    const prepDaysAfter = data.prepDaysAfter ?? existing.prepDaysAfter;
    const status = data.status ?? existing.status;

    if (plannedReturnDate < startDate) {
      return actionError("Rückgabedatum muss nach dem Startdatum liegen");
    }

    const productIds = data.items
      ? data.items.map((item) => item.productId)
      : existing.items.map((item) => item.productId);

    const { items, ...bookingData } = data;

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, dailyRateCents: true },
    });
    const rateByProductId = new Map(products.map((p) => [p.id, p.dailyRateCents]));
    const itemRows = items ?? existing.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    const rentalCostCents =
      bookingData.rentalCostCents ??
      calcRentalCostCents(itemRows, rateByProductId, startDate, plannedReturnDate);

    const transportCostCents = bookingData.transportCostCents ?? existing.transportCostCents;
    const additionalCostCents = bookingData.additionalCostCents ?? existing.additionalCostCents;
    const discountCents = bookingData.discountCents ?? existing.discountCents;
    const totalCostCents =
      rentalCostCents + transportCostCents + additionalCostCents - discountCents;

    const booking = await prisma.$transaction(async (tx) => {
      if (isBlockingStatus(status)) {
        await lockProducts(tx, productIds);
        const availability = await checkMultipleProductsAvailability(
          productIds,
          startDate,
          plannedReturnDate,
          id,
          prepDaysBefore,
          prepDaysAfter,
          tx
        );
        if (!availability.available) {
          throw new Error(
            `Verfügbarkeitskonflikt bei: ${formatConflictMessage(availability.conflicts)}`
          );
        }
      }

      if (items) {
        await tx.bookingItem.deleteMany({ where: { bookingId: id } });
      }

      const updated = await tx.booking.update({
        where: { id },
        data: {
          ...bookingData,
          rentalCostCents,
          transportCostCents,
          additionalCostCents,
          discountCents,
          totalCostCents,
          items: items
            ? {
                create: items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  dailyRateCents: rateByProductId.get(item.productId),
                })),
              }
            : undefined,
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      if (CONFIRMED_STATUSES.includes(status)) {
        await reserveProductsForBooking(
          tx,
          productIds,
          updated.bookingNumber,
          startDate,
          user.id
        );
      } else if (status === "STORNIERT") {
        await releaseReservedProducts(tx, productIds, updated.bookingNumber, user.id);
      }

      return updated;
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "Booking",
      entityId: booking.id,
      oldValue: {
        status: existing.status,
        startDate: existing.startDate,
        plannedReturnDate: existing.plannedReturnDate,
      },
      newValue: {
        status: booking.status,
        startDate: booking.startDate,
        plannedReturnDate: booking.plannedReturnDate,
      },
    });

    revalidatePath("/buchungen");
    revalidatePath("/planung");
    revalidatePath(`/buchungen/${id}`);
    return actionSuccess(serializeForClient({ id: booking.id, bookingNumber: booking.bookingNumber }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Verfügbarkeitskonflikt")) return actionError(message);
    console.error("updateBooking failed:", error);
    return actionError("Buchung konnte nicht aktualisiert werden");
  }
}

export async function advanceBookingStatus(id: string) {
  try {
    const auth = await authorize("bookings.edit");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;

    if (!id) {
      return actionError("Buchungs-ID ist erforderlich");
    }

    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return actionError("Buchung nicht gefunden");
    }

    const nextStatus = getNextBookingStatus(existing.status);
    if (!nextStatus) {
      return actionError("Für diesen Status gibt es keinen nächsten Schritt");
    }

    const productIds = existing.items.map((item) => item.productId);

    const booking = await prisma.$transaction(async (tx) => {
      if (isBlockingStatus(nextStatus)) {
        await lockProducts(tx, productIds);
        const availability = await checkMultipleProductsAvailability(
          productIds,
          existing.startDate,
          existing.plannedReturnDate,
          id,
          existing.prepDaysBefore,
          existing.prepDaysAfter,
          tx
        );
        if (!availability.available) {
          throw new Error(
            `Verfügbarkeitskonflikt bei: ${formatConflictMessage(availability.conflicts)}`
          );
        }
      }

      const updated = await tx.booking.update({
        where: { id },
        data: { status: nextStatus },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      if (CONFIRMED_STATUSES.includes(nextStatus)) {
        await reserveProductsForBooking(
          tx,
          productIds,
          updated.bookingNumber,
          existing.startDate,
          user.id
        );
      }

      return updated;
    });

    await createAuditLog({
      userId: user.id,
      action: "STATUS_CHANGE",
      entityType: "Booking",
      entityId: booking.id,
      oldValue: { status: existing.status },
      newValue: { status: booking.status },
    });

    revalidatePath("/buchungen");
    revalidatePath(`/buchungen/${id}`);
    revalidatePath("/ausgaben-rueckgaben");
    revalidatePath("/planung");
    revalidatePath("/produkte");
    return actionSuccess(serializeForClient({ id: booking.id, status: booking.status }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Verfügbarkeitskonflikt")) return actionError(message);
    return actionError("Status konnte nicht aktualisiert werden");
  }
}

export async function updateBookingDates(
  bookingId: string,
  productId: string,
  startDate: Date | string,
  endDate: Date | string
) {
  try {
    const planningAuth = await authorize("planning.edit");
    const auth = planningAuth.ok ? planningAuth : await authorize("bookings.edit");
    if (!auth.ok) return actionError(auth.error);
    const actor = auth.user;

    if (!bookingId) {
      return actionError("Buchungs-ID ist erforderlich");
    }
    if (!productId) {
      return actionError("Produkt-ID ist erforderlich");
    }

    const parsedStart = coerceDate(startDate);
    const parsedEnd = coerceDate(endDate);

    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return actionError("Ungültiges Datum");
    }
    if (parsedEnd < parsedStart) {
      return actionError("Enddatum muss nach dem Startdatum liegen");
    }

    const actualBookingId = bookingId.includes("-") ? bookingId.split("-")[0] : bookingId;

    const existing = await prisma.booking.findUnique({
      where: { id: actualBookingId },
      include: { items: true },
    });

    if (!existing) {
      return actionError("Buchung nicht gefunden");
    }

    const bookingHasProduct = existing.items.some((item) => item.productId === productId);
    if (!bookingHasProduct) {
      return actionError("Produkt gehört nicht zu dieser Buchung");
    }

    const productIds = existing.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, dailyRateCents: true },
    });
    const rateByProductId = new Map(products.map((p) => [p.id, p.dailyRateCents]));
    const rentalCostCents = calcRentalCostCents(
      existing.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      rateByProductId,
      parsedStart,
      parsedEnd
    );
    const totalCostCents =
      rentalCostCents +
      existing.transportCostCents +
      existing.additionalCostCents -
      existing.discountCents;

    const booking = await prisma.$transaction(async (tx) => {
      if (isBlockingStatus(existing.status)) {
        await lockProducts(tx, productIds);
        const availability = await checkMultipleProductsAvailability(
          productIds,
          parsedStart,
          parsedEnd,
          actualBookingId,
          existing.prepDaysBefore,
          existing.prepDaysAfter,
          tx
        );
        if (!availability.available) {
          throw new Error(
            `Verfügbarkeitskonflikt bei: ${formatConflictMessage(availability.conflicts)}`
          );
        }
      }

      const updated = await tx.booking.update({
        where: { id: actualBookingId },
        data: {
          startDate: parsedStart,
          plannedReturnDate: parsedEnd,
          rentalCostCents,
          totalCostCents,
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { nextBookingAt: parsedStart },
        });
      }

      return updated;
    });

    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entityType: "Booking",
      entityId: booking.id,
      oldValue: { startDate: existing.startDate, plannedReturnDate: existing.plannedReturnDate },
      newValue: { startDate: parsedStart, plannedReturnDate: parsedEnd },
    });

    revalidatePath("/planung");
    revalidatePath("/buchungen");

    return actionSuccess({
      bookingId: booking.id,
      conflicts: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Verfügbarkeitskonflikt")) return actionError(message);
    return actionError("Buchungsdaten konnten nicht aktualisiert werden");
  }
}

export async function archiveBooking(id: string) {
  try {
    const auth = await authorize("bookings.delete");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;

    if (!id) {
      return actionError("Buchungs-ID ist erforderlich");
    }

    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return actionError("Buchung nicht gefunden");
    }

    const booking = await prisma.$transaction(async (tx) => {
      const archived = await tx.booking.update({
        where: { id },
        data: { isArchived: true, status: "ABGESCHLOSSEN" },
      });

      for (const item of existing.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product?.status === "RESERVIERT") {
          await tx.product.update({
            where: { id: item.productId },
            data: { status: "VERFUEGBAR", nextBookingAt: null },
          });
        }
      }

      return archived;
    });

    await createAuditLog({
      userId: user.id,
      action: "ARCHIVE",
      entityType: "Booking",
      entityId: booking.id,
      oldValue: existing,
      newValue: booking,
    });

    revalidatePath("/buchungen");
    revalidatePath("/planung");
    return actionSuccess(serializeForClient({ id: booking.id, isArchived: booking.isArchived }));
  } catch {
    return actionError("Buchung konnte nicht archiviert werden");
  }
}

export async function cancelBooking(id: string) {
  try {
    const auth = await authorize("bookings.delete");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;

    if (!id) {
      return actionError("Buchungs-ID ist erforderlich");
    }

    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return actionError("Buchung nicht gefunden");
    }

    if (existing.isArchived) {
      return actionError("Buchung ist bereits gelöscht");
    }

    const productIds = existing.items.map((item) => item.productId);

    const booking = await prisma.$transaction(async (tx) => {
      if (existing.status !== "STORNIERT") {
        await tx.booking.update({
          where: { id },
          data: { status: "STORNIERT" },
        });
      }

      await releaseReservedProducts(tx, productIds, existing.bookingNumber, user.id);

      return tx.booking.update({
        where: { id },
        data: { isArchived: true },
      });
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "Booking",
      entityId: booking.id,
      oldValue: existing,
      newValue: booking,
    });

    revalidatePath("/buchungen");
    revalidatePath("/planung");
    revalidatePath(`/buchungen/${id}`);
    return actionSuccess(serializeForClient({ id: booking.id, isArchived: booking.isArchived }));
  } catch {
    return actionError("Buchung konnte nicht gelöscht werden");
  }
}

export async function checkAvailability(
  productIds: string[],
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string
) {
  try {
    const auth = await authorize("bookings.view");
    if (!auth.ok) return actionError(auth.error);

    if (!productIds.length) {
      return actionError("Mindestens ein Produkt erforderlich");
    }
    if (endDate < startDate) {
      return actionError("Enddatum muss nach dem Startdatum liegen");
    }

    const result = await checkMultipleProductsAvailability(
      productIds,
      startDate,
      endDate,
      excludeBookingId
    );

    return actionSuccess(result);
  } catch {
    return actionError("Verfügbarkeit konnte nicht geprüft werden");
  }
}

export async function getBookingsForCheckout() {
  const auth = await authorize("checkout.view");
  if (!auth.ok) return [];
  const bookings = await prisma.booking.findMany({
    where: {
      isArchived: false,
      status: { in: CHECKOUT_READY_STATUSES },
    },
    include: {
      customer: { select: { companyName: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              inventoryNumber: true,
              condition: true,
            },
          },
        },
      },
    },
    orderBy: { startDate: "asc" },
  });
  return serializeForClient(bookings);
}
