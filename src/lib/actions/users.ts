"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import {
  canAddActiveUser,
  getUserLimitMessage,
  isAdminRole,
  type UserLimitCounts,
} from "@/lib/user-limits";
import { actionError, actionSuccess, getValidationError } from "./types";

const userFieldsSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail"),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean(),
  password: z
    .union([
      z.literal(""),
      z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
    ])
    .optional(),
});

const createUserSchema = userFieldsSchema.extend({
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
  isActive: z.boolean().default(true),
});

async function countActiveUsers(excludeId?: string): Promise<UserLimitCounts> {
  const active = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { role: true },
  });

  const activeAdmins = active.filter((u) => isAdminRole(u.role)).length;
  return {
    totalActive: active.length,
    activeAdmins,
    activeStandard: active.length - activeAdmins,
  };
}

export async function getUserLimits() {
  await requireAuth();
  const counts = await countActiveUsers();
  return {
    ...counts,
    message: getUserLimitMessage(counts),
  };
}

export async function getUsers() {
  await requireAuth();
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function createUser(input: z.infer<typeof createUserSchema>) {
  try {
    const currentUser = await requireAuth();
    if (!hasPermission(currentUser.role, "users.edit")) {
      return actionError("Keine Berechtigung zum Anlegen von Benutzern");
    }

    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;
    const willBeActive = data.isActive !== false;

    if (willBeActive) {
      const limitCheck = canAddActiveUser(await countActiveUsers(), data.role);
      if (!limitCheck.ok) return actionError(limitCheck.error);
    }

    const emailTaken = await prisma.user.findFirst({
      where: { email: data.email.trim().toLowerCase() },
    });
    if (emailTaken) {
      return actionError("E-Mail-Adresse bereits vergeben");
    }

    const created = await prisma.user.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || null,
        role: data.role,
        isActive: willBeActive,
        passwordHash: await bcrypt.hash(data.password, 12),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      action: "CREATE",
      entityType: "User",
      entityId: created.id,
      newValue: created,
    });

    revalidatePath("/benutzer");
    return actionSuccess(created);
  } catch {
    return actionError("Benutzer konnte nicht angelegt werden");
  }
}

export async function updateUser(id: string, input: z.infer<typeof userFieldsSchema>) {
  try {
    const currentUser = await requireAuth();
    if (!hasPermission(currentUser.role, "users.edit")) {
      return actionError("Keine Berechtigung zum Bearbeiten von Benutzern");
    }

    if (!id) {
      return actionError("Benutzer-ID ist erforderlich");
    }

    const parsed = userFieldsSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return actionError("Benutzer nicht gefunden");
    }

    const data = parsed.data;

    if (currentUser.id === id && data.role !== "ADMIN") {
      return actionError("Sie können sich selbst die Administrator-Rolle nicht entziehen");
    }
    if (currentUser.id === id && !data.isActive) {
      return actionError("Sie können sich selbst nicht deaktivieren");
    }

    if (data.isActive) {
      const countsExcludingSelf = await countActiveUsers(id);
      const limitCheck = canAddActiveUser(countsExcludingSelf, data.role);
      if (!limitCheck.ok) return actionError(limitCheck.error);
    }

    const emailTaken = await prisma.user.findFirst({
      where: { email: data.email.trim().toLowerCase(), id: { not: id } },
    });
    if (emailTaken) {
      return actionError("E-Mail-Adresse bereits vergeben");
    }

    const password = data.password?.trim();
    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || null,
        role: data.role,
        isActive: data.isActive,
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      oldValue: {
        email: existing.email,
        firstName: existing.firstName,
        lastName: existing.lastName,
        role: existing.role,
        isActive: existing.isActive,
      },
      newValue: updated,
    });

    revalidatePath("/benutzer");
    return actionSuccess(updated);
  } catch {
    return actionError("Benutzer konnte nicht aktualisiert werden");
  }
}

export async function deleteUser(id: string) {
  try {
    const currentUser = await requireAuth();
    if (!hasPermission(currentUser.role, "users.edit")) {
      return actionError("Keine Berechtigung zum Löschen von Benutzern");
    }

    if (!id) {
      return actionError("Benutzer-ID ist erforderlich");
    }
    if (currentUser.id === id) {
      return actionError("Sie können sich selbst nicht löschen");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return actionError("Benutzer nicht gefunden");
    }

    // Soft-delete: Historie (Ausgaben/Rücknahmen etc.) bleibt erhalten
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      action: "DELETE",
      entityType: "User",
      entityId: id,
      oldValue: {
        email: existing.email,
        firstName: existing.firstName,
        lastName: existing.lastName,
        isActive: existing.isActive,
      },
      newValue: updated,
    });

    revalidatePath("/benutzer");
    return actionSuccess(updated);
  } catch {
    return actionError("Benutzer konnte nicht gelöscht werden");
  }
}
