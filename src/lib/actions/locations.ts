"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LocationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/session";
import { actionError, actionSuccess, getValidationError } from "./types";

const locationFiltersSchema = z.object({
  type: z.nativeEnum(LocationType).optional(),
  includeInactive: z.boolean().optional(),
  search: z.string().optional(),
});

const createLocationSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  type: z.nativeEnum(LocationType),
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default("Deutschland"),
  notes: z.string().optional(),
});

export async function getLocations(filters?: z.infer<typeof locationFiltersSchema>) {
  try {
    await requireAuth();

    const parsed = filters
      ? locationFiltersSchema.safeParse(filters)
      : { success: true as const, data: {} };

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const { type, includeInactive, search } = parsed.data;

    const locations = await prisma.location.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(type ? { type } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
                { street: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return actionSuccess(locations);
  } catch {
    return actionError("Standorte konnten nicht geladen werden");
  }
}

export async function createLocation(input: z.infer<typeof createLocationSchema>) {
  try {
    const user = await requireAuth();
    const parsed = createLocationSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;

    const existing = await prisma.location.findFirst({
      where: { name: data.name, type: data.type },
    });

    if (existing) {
      return actionError("Standort mit diesem Namen und Typ existiert bereits");
    }

    const location = await prisma.location.create({
      data,
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "Location",
      entityId: location.id,
      newValue: location,
    });

    revalidatePath("/standorte");
    return actionSuccess(location);
  } catch {
    return actionError("Standort konnte nicht erstellt werden");
  }
}

const updateLocationSchema = createLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export async function updateLocation(
  id: string,
  input: z.infer<typeof updateLocationSchema>
) {
  try {
    const user = await requireAuth();
    const parsed = updateLocationSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    if (!id) {
      return actionError("Standort-ID ist erforderlich");
    }

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return actionError("Standort nicht gefunden");
    }

    const location = await prisma.location.update({
      where: { id },
      data: parsed.data,
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "Location",
      entityId: location.id,
      oldValue: existing,
      newValue: location,
    });

    revalidatePath("/standorte");
    return actionSuccess(location);
  } catch {
    return actionError("Standort konnte nicht aktualisiert werden");
  }
}

export async function deleteLocation(id: string) {
  try {
    const user = await requireAuth();

    if (!id) {
      return actionError("Standort-ID ist erforderlich");
    }

    const existing = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            bookingsPickup: true,
            bookingsDelivery: true,
          },
        },
      },
    });

    if (!existing) {
      return actionError("Standort nicht gefunden");
    }

    const linked =
      existing._count.products +
      existing._count.bookingsPickup +
      existing._count.bookingsDelivery;

    if (linked > 0) {
      const location = await prisma.location.update({
        where: { id },
        data: { isActive: false },
      });

      await createAuditLog({
        userId: user.id,
        action: "UPDATE",
        entityType: "Location",
        entityId: location.id,
        oldValue: existing,
        newValue: location,
      });

      revalidatePath("/standorte");
      return actionSuccess(location);
    }

    await prisma.location.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      entityType: "Location",
      entityId: id,
      oldValue: existing,
    });

    revalidatePath("/standorte");
    return actionSuccess({ id });
  } catch {
    return actionError("Standort konnte nicht gelöscht werden");
  }
}

/** Alias für bestehende Seiten */
export async function getLocationsList() {
  const result = await getLocations({ includeInactive: true });
  if (!result.success) return [];
  return result.data ?? [];
}
