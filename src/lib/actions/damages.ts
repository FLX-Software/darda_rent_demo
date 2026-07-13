"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DamageCategory, DamageSeverity, DamageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog, createNotification } from "@/lib/audit";
import { requireAuth } from "@/lib/session";
import { generateDamageNumber } from "@/lib/utils";
import { actionError, actionSuccess, getValidationError } from "./types";

const damageFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(DamageStatus).optional(),
  severity: z.nativeEnum(DamageSeverity).optional(),
  productId: z.string().optional(),
  customerId: z.string().optional(),
});

const createDamageSchema = z.object({
  productId: z.string().min(1, "Produkt ist erforderlich"),
  bookingId: z.string().optional(),
  customerId: z.string().optional(),
  category: z.nativeEnum(DamageCategory),
  affectedPart: z.string().optional(),
  description: z.string().min(1, "Beschreibung ist erforderlich"),
  severity: z.nativeEnum(DamageSeverity),
  repairRequired: z.boolean().default(false),
  stillUsable: z.boolean().default(false),
  estimatedCostCents: z.number().int().min(0).optional(),
  responsibility: z.string().optional(),
  isInsuranceCase: z.boolean().default(false),
  customerChargeCents: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  markerX: z.number().optional(),
  markerY: z.number().optional(),
});

const updateDamageSchema = createDamageSchema.partial().extend({
  status: z.nativeEnum(DamageStatus).optional(),
  actualCostCents: z.number().int().min(0).optional(),
});

export async function getDamages(filters?: z.infer<typeof damageFiltersSchema>) {
  try {
    await requireAuth();

    const parsed = filters ? damageFiltersSchema.safeParse(filters) : { success: true as const, data: {} };
    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const { search, status, severity, productId, customerId } = parsed.data;

    const damages = await prisma.damageReport.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
        ...(productId ? { productId } : {}),
        ...(customerId ? { customerId } : {}),
        ...(search
          ? {
              OR: [
                { damageNumber: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { product: { name: { contains: search, mode: "insensitive" } } },
                { product: { inventoryNumber: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        product: true,
        booking: true,
        customer: true,
        reportedBy: true,
        images: true,
      },
      orderBy: { reportedAt: "desc" },
    });

    return actionSuccess(damages);
  } catch {
    return actionError("Schäden konnten nicht geladen werden");
  }
}

export async function getDamage(id: string) {
  try {
    await requireAuth();

    if (!id) {
      return actionError("Schadens-ID ist erforderlich");
    }

    const damage = await prisma.damageReport.findUnique({
      where: { id },
      include: {
        product: { include: { category: true, images: true } },
        booking: true,
        customer: true,
        reportedBy: true,
        images: true,
        history: { orderBy: { changedAt: "desc" } },
      },
    });

    if (!damage) {
      return actionError("Schadensmeldung nicht gefunden");
    }

    return actionSuccess(damage);
  } catch {
    return actionError("Schadensmeldung konnte nicht geladen werden");
  }
}

export async function createDamage(input: z.infer<typeof createDamageSchema>) {
  try {
    const user = await requireAuth();
    const parsed = createDamageSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) {
      return actionError("Produkt nicht gefunden");
    }

    const damage = await prisma.$transaction(async (tx) => {
      const created = await tx.damageReport.create({
        data: {
          damageNumber: generateDamageNumber(),
          productId: data.productId,
          bookingId: data.bookingId,
          customerId: data.customerId,
          reportedById: user.id,
          category: data.category,
          affectedPart: data.affectedPart,
          description: data.description,
          severity: data.severity,
          repairRequired: data.repairRequired,
          stillUsable: data.stillUsable,
          estimatedCostCents: data.estimatedCostCents,
          responsibility: data.responsibility,
          isInsuranceCase: data.isInsuranceCase,
          customerChargeCents: data.customerChargeCents,
          notes: data.notes,
          markerX: data.markerX,
          markerY: data.markerY,
        },
        include: {
          product: true,
          booking: true,
          customer: true,
          reportedBy: true,
        },
      });

      await tx.damageStatusHistory.create({
        data: {
          damageReportId: created.id,
          toStatus: "NEU",
          note: "Schadensmeldung erstellt",
        },
      });

      if (!data.stillUsable || data.repairRequired) {
        const previousStatus = product.status;
        const newStatus = data.repairRequired ? "IN_REPARATUR" : "BESCHAEDIGT";

        await tx.product.update({
          where: { id: data.productId },
          data: { status: newStatus },
        });

        await tx.statusHistory.create({
          data: {
            productId: data.productId,
            fromStatus: previousStatus,
            toStatus: newStatus,
            changedById: user.id,
            note: `Schadensmeldung ${created.damageNumber}`,
          },
        });
      }

      return created;
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "DamageReport",
      entityId: damage.id,
      newValue: damage,
    });

    const serviceUsers = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SERVICE"] }, isActive: true },
      select: { id: true },
    });

    for (const serviceUser of serviceUsers) {
      await createNotification({
        userId: serviceUser.id,
        type: "SCHADEN_GEMELDET",
        title: "Neuer Schaden gemeldet",
        message: `Schaden ${damage.damageNumber} an ${product.name} (${product.inventoryNumber})`,
        link: `/schaeden/${damage.id}`,
      });
    }

    revalidatePath("/schaeden");
    revalidatePath("/produkte");
    return actionSuccess(damage);
  } catch {
    return actionError("Schadensmeldung konnte nicht erstellt werden");
  }
}

export async function updateDamage(id: string, input: z.infer<typeof updateDamageSchema>) {
  try {
    const user = await requireAuth();
    const parsed = updateDamageSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    if (!id) {
      return actionError("Schadens-ID ist erforderlich");
    }

    const existing = await prisma.damageReport.findUnique({ where: { id } });
    if (!existing) {
      return actionError("Schadensmeldung nicht gefunden");
    }

    const data = parsed.data;

    const damage = await prisma.$transaction(async (tx) => {
      const updated = await tx.damageReport.update({
        where: { id },
        data,
        include: {
          product: true,
          booking: true,
          customer: true,
          reportedBy: true,
        },
      });

      if (data.status && data.status !== existing.status) {
        await tx.damageStatusHistory.create({
          data: {
            damageReportId: id,
            fromStatus: existing.status,
            toStatus: data.status,
          },
        });

        if (data.status === "REPARIERT" || data.status === "GESCHLOSSEN") {
          const product = await tx.product.findUnique({ where: { id: existing.productId } });
          if (product && (product.status === "IN_REPARATUR" || product.status === "BESCHAEDIGT")) {
            await tx.product.update({
              where: { id: existing.productId },
              data: { status: "VERFUEGBAR" },
            });

            await tx.statusHistory.create({
              data: {
                productId: existing.productId,
                fromStatus: product.status,
                toStatus: "VERFUEGBAR",
                changedById: user.id,
                note: `Schaden ${updated.damageNumber} abgeschlossen`,
              },
            });
          }
        }
      }

      return updated;
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "DamageReport",
      entityId: damage.id,
      oldValue: existing,
      newValue: damage,
    });

    revalidatePath("/schaeden");
    revalidatePath(`/schaeden/${id}`);
    return actionSuccess(damage);
  } catch {
    return actionError("Schadensmeldung konnte nicht aktualisiert werden");
  }
}

/** Aliase für bestehende Seiten */
export const getDamageReports = getDamages;
export const getDamageReport = getDamage;
export const createDamageReport = createDamage;
