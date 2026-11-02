"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BookingStatus, BookingType, ProductCondition } from "@prisma/client";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getProductStatusForBookingType } from "@/lib/availability";
import { requireAuth } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { saveFile } from "@/lib/storage";
import { generateBookingNumber, serializeForClient } from "@/lib/utils";
import { actionError, actionSuccess, getValidationError } from "./types";

const DEMO_HANDOVER_MARKER = "DEMO-ÜBERGABE";

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

const checkOutImageSchema = z.object({
  productId: z.string().min(1),
  url: z.string().min(1),
  caption: z.string().optional(),
});

const performCheckOutSchema = z.object({
  bookingId: z.string().min(1, "Buchungs-ID ist erforderlich"),
  recipientName: z.string().optional(),
  recipientSigned: z.boolean().default(false),
  notes: z.string().optional(),
  operatingHours: z.number().int().min(0).optional(),
  items: z.array(checkOutItemSchema).min(1, "Mindestens ein Produkt erforderlich"),
  images: z.array(checkOutImageSchema).optional(),
});

const checkInItemSchema = z.object({
  productId: z.string().min(1, "Produkt ist erforderlich"),
  condition: z.nativeEnum(ProductCondition),
  missingAccessories: z.string().optional(),
  notes: z.string().optional(),
});

const checkInImageSchema = z.object({
  productId: z.string().min(1),
  url: z.string().min(1),
  caption: z.string().optional(),
});

const performCheckInSchema = z.object({
  bookingId: z.string().min(1, "Buchungs-ID ist erforderlich"),
  cleaningCostCents: z.number().int().min(0).default(0),
  repairCostCents: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  createProtocol: z.boolean().default(false),
  items: z.array(checkInItemSchema).min(1, "Mindestens ein Produkt erforderlich"),
  images: z.array(checkInImageSchema).optional(),
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

    return actionSuccess(
      serializeForClient({
        checkouts: pendingCheckouts,
        checkins: pendingCheckins,
        todayStart,
        todayEnd,
      })
    );
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

        const imagesForProduct = (data.images ?? []).filter(
          (image) => image.productId === item.productId
        );

        await tx.conditionReport.create({
          data: {
            productId: item.productId,
            condition: item.condition,
            notes: item.notes,
            checkOutId: checkOut.id,
            images:
              imagesForProduct.length > 0
                ? {
                    create: imagesForProduct.map((image) => ({
                      url: image.url,
                      caption: image.caption,
                    })),
                  }
                : undefined,
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
    revalidatePath(`/buchungen/${booking.id}`);
    revalidatePath("/produkte");
    return actionSuccess(
      serializeForClient({
        checkOutId: result.checkOut.id,
        bookingId: result.booking.id,
        status: result.booking.status,
      })
    );
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

    const newBookingStatus: BookingStatus = "ZURUECKGEGEBEN";
    const returnedAt = new Date();
    const returnDay = startOfDay(returnedAt);
    const startDay = startOfDay(booking.startDate);
    const plannedDay = startOfDay(booking.plannedReturnDate);
    const shortenedEarly =
      returnDay.getTime() < plannedDay.getTime()
        ? returnDay.getTime() < startDay.getTime()
          ? startDay
          : returnDay
        : null;

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
              damageNoted: false,
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
          actualReturnAt: returnedAt,
          ...(shortenedEarly
            ? { plannedReturnDate: shortenedEarly }
            : {}),
        },
      });

      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const newProductStatus = "VERFUEGBAR";

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
            note: shortenedEarly
              ? `Rücknahme Buchung ${booking.bookingNumber} (früher zurück – Planung bis ${shortenedEarly.toISOString().slice(0, 10)} verkürzt)`
              : `Rücknahme Buchung ${booking.bookingNumber}`,
          },
        });

        const imagesForProduct = (data.images ?? []).filter(
          (image) => image.productId === item.productId
        );

        await tx.conditionReport.create({
          data: {
            productId: item.productId,
            condition: item.condition,
            notes: item.notes,
            checkInId: checkIn.id,
            images:
              data.createProtocol && imagesForProduct.length > 0
                ? {
                    create: imagesForProduct.map((image) => ({
                      url: image.url,
                      caption: image.caption,
                    })),
                  }
                : undefined,
          },
        });
      }

      return {
        checkIn,
        booking: updatedBooking,
        planningShortened: Boolean(shortenedEarly),
        previousPlannedReturnDate: booking.plannedReturnDate,
        createProtocol: data.createProtocol,
      };
    });

    await createAuditLog({
      userId: user.id,
      action: "STATUS_CHANGE",
      entityType: "Booking",
      entityId: booking.id,
      oldValue: {
        status: booking.status,
        plannedReturnDate: booking.plannedReturnDate,
      },
      newValue: {
        status: result.booking.status,
        checkInId: result.checkIn.id,
        plannedReturnDate: result.booking.plannedReturnDate,
        planningShortened: result.planningShortened,
      },
    });

    revalidatePath("/ausgaben-rueckgaben");
    revalidatePath("/buchungen");
    revalidatePath(`/buchungen/${booking.id}`);
    revalidatePath("/produkte");
    revalidatePath("/planung");
    revalidatePath("/dashboard");
    return actionSuccess(
      serializeForClient({
        checkInId: result.checkIn.id,
        bookingId: result.booking.id,
        status: result.booking.status,
        planningShortened: result.planningShortened,
      })
    );
  } catch {
    return actionError("Rückgabe konnte nicht durchgeführt werden");
  }
}

/** Legt/aktualisiert eine abholbereite Demo-Buchung für Übergabe-Tests an. */
export async function prepareDemoHandoverBooking() {
  try {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
      return actionError("Demo-Übergabe nur für Administratoren");
    }
    if (!hasPermission(user.role, "checkout.perform")) {
      return actionError("Keine Berechtigung für Übergaben");
    }

    const today = startOfDay(new Date());
    const returnDate = addDays(today, 7);

    const customer = await prisma.customer.findFirst({
      where: { isActive: true },
      orderBy: { companyName: "asc" },
    });
    if (!customer) {
      return actionError("Kein Kunde vorhanden. Bitte zuerst einen Kunden anlegen.");
    }

    const products = await prisma.product.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
      take: 2,
    });
    if (products.length === 0) {
      return actionError("Kein Produkt vorhanden. Bitte zuerst Produkte anlegen.");
    }

    const existing = await prisma.booking.findFirst({
      where: {
        isArchived: false,
        projectName: DEMO_HANDOVER_MARKER,
        status: { in: CHECKOUT_STATUSES },
      },
      include: { items: true },
    });

    if (existing) {
      const updated = await prisma.booking.update({
        where: { id: existing.id },
        data: {
          status: "ABHOLBEREIT",
          startDate: today,
          plannedReturnDate: returnDate,
          contactName: customer.companyName,
          notes: "Testdaten für Übergabe (Kamera, Checkliste, Protokoll).",
        },
      });

      revalidatePath("/ausgaben-rueckgaben");
      revalidatePath("/buchungen");
      revalidatePath("/planung");
      revalidatePath("/dashboard");
      return actionSuccess({
        bookingId: updated.id,
        bookingNumber: updated.bookingNumber,
        created: false,
      });
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: generateBookingNumber(),
        type: BookingType.KUNDENVERMIETUNG,
        status: BookingStatus.ABHOLBEREIT,
        customerId: customer.id,
        contactName: "Demo Empfänger",
        projectName: DEMO_HANDOVER_MARKER,
        responsibleUserId: user.id,
        startDate: today,
        plannedReturnDate: returnDate,
        rentalCostCents: products.reduce((sum, p) => sum + p.dailyRateCents * 7, 0),
        totalCostCents: products.reduce((sum, p) => sum + p.dailyRateCents * 7, 0),
        notes: "Testdaten für Übergabe (Kamera, Checkliste, Protokoll).",
        items: {
          create: products.map((p) => ({
            productId: p.id,
            quantity: 1,
            dailyRateCents: p.dailyRateCents,
          })),
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "Booking",
      entityId: booking.id,
      newValue: {
        bookingNumber: booking.bookingNumber,
        projectName: DEMO_HANDOVER_MARKER,
        status: booking.status,
      },
    });

    revalidatePath("/ausgaben-rueckgaben");
    revalidatePath("/buchungen");
    revalidatePath("/planung");
    revalidatePath("/dashboard");

    return actionSuccess({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      created: true,
    });
  } catch (error) {
    console.error("prepareDemoHandoverBooking failed:", error);
    return actionError("Demo-Übergabe konnte nicht vorbereitet werden");
  }
}

export async function uploadCheckoutImage(formData: FormData) {
  try {
    const user = await requireAuth();
    if (
      !hasPermission(user.role, "checkout.perform") &&
      !hasPermission(user.role, "checkin.perform")
    ) {
      return actionError("Keine Berechtigung für Übergabe-/Rücknahmefotos");
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File) || file.size === 0) {
      return actionError("Keine gültige Datei hochgeladen");
    }
    if (!file.type.startsWith("image/")) {
      return actionError("Nur Bilddateien sind erlaubt");
    }

    const caption = formData.get("caption")?.toString() || undefined;
    const folder = formData.get("folder")?.toString() === "return" ? "return" : "handover";
    const { url } = await saveFile(file, folder);

    return actionSuccess({ url, caption });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message) return actionError(message);
    return actionError("Foto konnte nicht hochgeladen werden");
  }
}
