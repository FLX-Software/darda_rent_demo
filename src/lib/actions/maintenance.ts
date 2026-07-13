"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MaintenanceStatus, MaintenanceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/session";
import { actionError, actionSuccess, getValidationError } from "./types";

const maintenanceFiltersSchema = z.object({
  productId: z.string().optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  type: z.nativeEnum(MaintenanceType).optional(),
  overdueOnly: z.boolean().optional(),
});

const createMaintenanceSchema = z.object({
  productId: z.string().min(1, "Produkt ist erforderlich"),
  type: z.nativeEnum(MaintenanceType),
  status: z.nativeEnum(MaintenanceStatus).default("GEPLANT"),
  intervalDays: z.number().int().min(1).optional(),
  lastDate: z.coerce.date().optional(),
  nextDate: z.coerce.date().optional(),
  operatingHours: z.number().int().min(0).optional(),
  serviceProvider: z.string().optional(),
  costCents: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

const updateMaintenanceSchema = createMaintenanceSchema.partial().extend({
  result: z.string().optional(),
  reportUrl: z.string().optional(),
  performedById: z.string().optional(),
});

export async function getMaintenances(filters?: z.infer<typeof maintenanceFiltersSchema>) {
  try {
    await requireAuth();

    const parsed = filters
      ? maintenanceFiltersSchema.safeParse(filters)
      : { success: true as const, data: {} };

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const { productId, status, type, overdueOnly } = parsed.data;

    const maintenances = await prisma.maintenance.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(overdueOnly
          ? {
              OR: [
                { status: "UEBERFAELLIG" },
                { status: "FAELLIG", nextDate: { lte: new Date() } },
              ],
            }
          : {}),
      },
      include: {
        product: { include: { category: true } },
        performedBy: true,
      },
      orderBy: [{ nextDate: "asc" }, { createdAt: "desc" }],
    });

    return actionSuccess(maintenances);
  } catch {
    return actionError("Wartungen konnten nicht geladen werden");
  }
}

export async function createMaintenance(input: z.infer<typeof createMaintenanceSchema>) {
  try {
    const user = await requireAuth();
    const parsed = createMaintenanceSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) {
      return actionError("Produkt nicht gefunden");
    }

    const maintenance = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenance.create({
        data: {
          productId: data.productId,
          type: data.type,
          status: data.status,
          intervalDays: data.intervalDays,
          lastDate: data.lastDate,
          nextDate: data.nextDate,
          operatingHours: data.operatingHours,
          serviceProvider: data.serviceProvider,
          costCents: data.costCents,
          notes: data.notes,
        },
        include: {
          product: true,
          performedBy: true,
        },
      });

      if (data.nextDate) {
        await tx.product.update({
          where: { id: data.productId },
          data: { nextMaintenanceAt: data.nextDate },
        });
      }

      if (data.type === "SICHERHEITSPRUEFUNG" && data.status !== "ABGESCHLOSSEN") {
        const productCurrent = await tx.product.findUnique({ where: { id: data.productId } });
        if (productCurrent && productCurrent.status === "VERFUEGBAR") {
          await tx.product.update({
            where: { id: data.productId },
            data: { status: "IN_WARTUNG" },
          });

          await tx.statusHistory.create({
            data: {
              productId: data.productId,
              fromStatus: productCurrent.status,
              toStatus: "IN_WARTUNG",
              changedById: user.id,
              note: "Sicherheitsprüfung geplant",
            },
          });
        }
      }

      return created;
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "Maintenance",
      entityId: maintenance.id,
      newValue: maintenance,
    });

    revalidatePath("/produkte");
    revalidatePath("/produkte");
    return actionSuccess(maintenance);
  } catch {
    return actionError("Wartung konnte nicht erstellt werden");
  }
}

export async function updateMaintenance(
  id: string,
  input: z.infer<typeof updateMaintenanceSchema>
) {
  try {
    const user = await requireAuth();
    const parsed = updateMaintenanceSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    if (!id) {
      return actionError("Wartungs-ID ist erforderlich");
    }

    const existing = await prisma.maintenance.findUnique({ where: { id } });
    if (!existing) {
      return actionError("Wartung nicht gefunden");
    }

    const data = parsed.data;

    const maintenance = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenance.update({
        where: { id },
        data: {
          ...data,
          performedById:
            data.performedById ?? (data.status === "ABGESCHLOSSEN" ? user.id : undefined),
        },
        include: {
          product: true,
          performedBy: true,
        },
      });

      if (data.nextDate) {
        await tx.product.update({
          where: { id: updated.productId },
          data: { nextMaintenanceAt: data.nextDate },
        });
      }

      if (data.status === "ABGESCHLOSSEN") {
        await tx.product.update({
          where: { id: updated.productId },
          data: {
            lastMaintenanceAt: data.lastDate ?? new Date(),
            nextMaintenanceAt: data.nextDate ?? updated.nextDate,
            status: "VERFUEGBAR",
          },
        });

        const product = await tx.product.findUnique({ where: { id: updated.productId } });
        if (product) {
          await tx.statusHistory.create({
            data: {
              productId: updated.productId,
              fromStatus: product.status,
              toStatus: "VERFUEGBAR",
              changedById: user.id,
              note: "Wartung abgeschlossen",
            },
          });
        }
      }

      return updated;
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "Maintenance",
      entityId: maintenance.id,
      oldValue: existing,
      newValue: maintenance,
    });

    revalidatePath("/produkte");
    revalidatePath("/produkte");
    return actionSuccess(maintenance);
  } catch {
    return actionError("Wartung konnte nicht aktualisiert werden");
  }
}

/** Alias für bestehende Seiten */
export async function getMaintenanceRecords(filters?: { status?: MaintenanceStatus }) {
  const result = await getMaintenances(filters);
  if (!result.success) return [];
  return result.data ?? [];
}
