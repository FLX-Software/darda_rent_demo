"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BookingStatus, ProductCondition } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getProductStatusForBookingType } from "@/lib/availability";
import { requireAuth } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { actionError, actionSuccess, getValidationError } from "./types";

const CHECKOUT_STATUSES: BookingStatus[] = ["ABHOLBEREIT", "IN_VORBEREITUNG", "BESTAETIGT"];
const CHECKIN_STATUSES: BookingStatus[] = [
  "AUSGEGEBEN",
  "AKTIV",
  "UNTERWEGS",
  "RUECKGABE_FAELLIG",
  "UEBERFAELLIG",
];

const checkOutItemSchema = z.object({
  productId: z.string().min(1, "Produkt ist erforderlich"),
  condition: z.nativeEnum(ProductCondition),
  serialVerified: z.boolean().default(false),
  accessoriesChecked: z.boolean().default(false),
  notes: z.string().optional(),
});

const performCheckOutSchema = z.object({
  bookingId: z.string().min(1, "Buchungs-ID ist erforderlich"),
  recipientName: z.string().optional(),
  recipientSigned: z.boolean().default(false),
  notes: z.string().optional(),
  operatingHours: z.number().int().min(0).optional(),
  items: z.array(checkOutItemSchema).min(1, "Mindestens ein Produkt erforderlich"),
});

const checkInItemSchema = z.object({
  productId: z.string().min(1, "Produkt ist erforderlich"),
  condition: z.nativeEnum(ProductCondition),
  missingAccessories: z.string().optional(),
  damageNoted: z.boolean().default(false),
  notes: z.string().optional(),
});

const performCheckInSchema = z.object({
  bookingId: z.string().min(1, "Buchungs-ID ist erforderlich"),
  cleaningCostCents: z.number().int().min(0).default(0),
  repairCostCents: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(checkInItemSchema).min(1, "Mindestens ein Produkt erforderlich"),
});

export async function getPendingCheckouts() {
  try {
    await requireAuth();

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [pendingCheckouts, pendingCheckins] = await Promise.all([
      prisma.booking.findMany({
        where: {
          isArchived: false,
          status: { in: CHECKOUT_STATUSES },
          startDate: { lte: todayEnd },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
          pickupLocation: true,
        },
        orderBy: { startDate: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          isArchived: false,
          status: { in: CHECKIN_STATUSES },
          plannedReturnDate: { lte: todayEnd },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
          deliveryLocation: true,
        },
        orderBy: { plannedReturnDate: "asc" },
      }),
    ]);

    return actionSuccess({
      checkouts: pendingCheckouts,
      checkins: pendingCheckins,
      todayStart,
      todayEnd,
    });
  } catch {
    return actionError("Ausstehende Ausgaben/Rückgaben konnten nicht geladen werden");
  }
}

export async function performCheckOut(input: z.infer<typeof performCheckOutSchema>) {
  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, "checkout.perform")) {
      return actionError("Keine Berechtigung für Ausgaben");
    }
    const parsed = performCheckOutSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { items: true },
    });

    if (!booking) {
      return actionError("Buchung nicht gefunden");
    }

    if (!CHECKOUT_STATUSES.includes(booking.status)) {
      return actionError("Buchung ist nicht zur Ausgabe bereit");
    }

    const bookingProductIds = booking.items.map((item) => item.productId);
    const itemProductIds = data.items.map((item) => item.productId);
    const invalidProducts = itemProductIds.filter((id) => !bookingProductIds.includes(id));

    if (invalidProducts.length > 0) {
      return actionError("Ein oder mehrere Produkte gehören nicht zu dieser Buchung");
    }

    const result = await prisma.$transaction(async (tx) => {
      const checkOut = await tx.checkOut.create({
        data: {
          bookingId: data.bookingId,
          checkedOutById: user.id,
          recipientName: data.recipientName,
          recipientSigned: data.recipientSigned,
          notes: data.notes,
          operatingHours: data.operatingHours,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              condition: item.condition,
              serialVerified: item.serialVerified,
              accessoriesChecked: item.accessoriesChecked,
              notes: item.notes,
            })),
          },
        },
        include: { items: true },
      });

      const newBookingStatus: BookingStatus =
        booking.type === "TRANSPORT" ? "UNTERWEGS" : "AKTIV";

      const updatedBooking = await tx.booking.update({
        where: { id: data.bookingId },
        data: {
          status: newBookingStatus,
          actualCheckoutAt: new Date(),
        },
      });

      const productStatus = getProductStatusForBookingType(booking.type);

      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            status: productStatus,
            lastUsedAt: new Date(),
            condition: item.condition,
          },
        });

        await tx.statusHistory.create({
          data: {
            productId: item.productId,
            fromStatus: product.status,
            toStatus: productStatus,
            changedById: user.id,
            note: `Ausgabe Buchung ${booking.bookingNumber}`,
          },
        });

        await tx.conditionReport.create({
          data: {
            productId: item.productId,
            condition: item.condition,
            notes: item.notes,
            checkOutId: checkOut.id,
          },
        });
      }

      return { checkOut, booking: updatedBooking };
    });

    await createAuditLog({
      userId: user.id,
      action: "STATUS_CHANGE",
      entityType: "Booking",
      entityId: booking.id,
      oldValue: { status: booking.status },
      newValue: { status: result.booking.status, checkOutId: result.checkOut.id },
    });

    revalidatePath("/ausgaben-rueckgaben");
    revalidatePath("/buchungen");
    revalidatePath("/produkte");
    return actionSuccess(result);
  } catch {
    return actionError("Ausgabe konnte nicht durchgeführt werden");
  }
}

export async function performCheckIn(input: z.infer<typeof performCheckInSchema>) {
  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, "checkin.perform")) {
      return actionError("Keine Berechtigung für Rückgaben");
    }
    const parsed = performCheckInSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { items: true },
    });

    if (!booking) {
      return actionError("Buchung nicht gefunden");
    }

    if (!CHECKIN_STATUSES.includes(booking.status)) {
      return actionError("Buchung ist nicht zur Rückgabe bereit");
    }

    const bookingProductIds = booking.items.map((item) => item.productId);
    const itemProductIds = data.items.map((item) => item.productId);
    const invalidProducts = itemProductIds.filter((id) => !bookingProductIds.includes(id));

    if (invalidProducts.length > 0) {
      return actionError("Ein oder mehrere Produkte gehören nicht zu dieser Buchung");
    }

    const hasDamage = data.items.some((item) => item.damageNoted);
    const newBookingStatus: BookingStatus = hasDamage ? "IN_PRUEFUNG" : "ZURUECKGEGEBEN";

    const result = await prisma.$transaction(async (tx) => {
      const checkIn = await tx.checkIn.create({
        data: {
          bookingId: data.bookingId,
          checkedInById: user.id,
          cleaningCostCents: data.cleaningCostCents,
          repairCostCents: data.repairCostCents,
          notes: data.notes,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              condition: item.condition,
              missingAccessories: item.missingAccessories,
              damageNoted: item.damageNoted,
              notes: item.notes,
            })),
          },
        },
        include: { items: true },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: data.bookingId },
        data: {
          status: newBookingStatus,
          actualReturnAt: new Date(),
        },
      });

      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const newProductStatus = item.damageNoted ? "IN_PRUEFUNG" : "VERFUEGBAR";

        await tx.product.update({
          where: { id: item.productId },
          data: {
            status: newProductStatus,
            condition: item.condition,
            nextBookingAt: null,
          },
        });

        await tx.statusHistory.create({
          data: {
            productId: item.productId,
            fromStatus: product.status,
            toStatus: newProductStatus,
            changedById: user.id,
            note: `Rückgabe Buchung ${booking.bookingNumber}`,
          },
        });

        await tx.conditionReport.create({
          data: {
            productId: item.productId,
            condition: item.condition,
            notes: item.notes,
            checkInId: checkIn.id,
          },
        });
      }

      return { checkIn, booking: updatedBooking };
    });

    await createAuditLog({
      userId: user.id,
      action: "STATUS_CHANGE",
      entityType: "Booking",
      entityId: booking.id,
      oldValue: { status: booking.status },
      newValue: { status: result.booking.status, checkInId: result.checkIn.id },
    });

    revalidatePath("/ausgaben-rueckgaben");
    revalidatePath("/buchungen");
    revalidatePath("/produkte");
    return actionSuccess(result);
  } catch {
    return actionError("Rückgabe konnte nicht durchgeführt werden");
  }
}
