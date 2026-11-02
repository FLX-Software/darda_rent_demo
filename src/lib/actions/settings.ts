"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { serializeForClient } from "@/lib/utils";
import {
  DEFAULT_APP_SETTINGS,
  type AppSettingsData,
} from "@/lib/settings-types";
import { actionError, actionSuccess, getValidationError } from "./types";

const SETTINGS_ID = "default";

const updateSettingsSchema = z.object({
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
  companyAddress: z.string().min(1, "Adresse ist erforderlich"),
  contactEmail: z.string().email("Ungültige E-Mail"),
  prepDaysDefault: z.coerce.number().int().min(0).max(30),
  returnDaysDefault: z.coerce.number().int().min(0).max(30),
  notifyCheckoutTomorrow: z.boolean(),
  notifyReturnTomorrow: z.boolean(),
  notifyOverdueReturn: z.boolean(),
  notifyNewBooking: z.boolean(),
  notifyBookingConflict: z.boolean(),
  notifyMaintenanceDue: z.boolean(),
});

function toSettingsData(row: {
  companyName: string;
  companyAddress: string;
  contactEmail: string;
  prepDaysDefault: number;
  returnDaysDefault: number;
  currency: string;
  notifyCheckoutTomorrow: boolean;
  notifyReturnTomorrow: boolean;
  notifyOverdueReturn: boolean;
  notifyNewBooking: boolean;
  notifyBookingConflict: boolean;
  notifyMaintenanceDue: boolean;
}): AppSettingsData {
  return serializeForClient({
    companyName: row.companyName,
    companyAddress: row.companyAddress,
    contactEmail: row.contactEmail,
    prepDaysDefault: row.prepDaysDefault,
    returnDaysDefault: row.returnDaysDefault,
    currency: row.currency,
    notifyCheckoutTomorrow: row.notifyCheckoutTomorrow,
    notifyReturnTomorrow: row.notifyReturnTomorrow,
    notifyOverdueReturn: row.notifyOverdueReturn,
    notifyNewBooking: row.notifyNewBooking,
    notifyBookingConflict: row.notifyBookingConflict,
    notifyMaintenanceDue: row.notifyMaintenanceDue,
  });
}

export async function getSettings(): Promise<AppSettingsData> {
  const user = await getCurrentUser();
  if (!user) return DEFAULT_APP_SETTINGS;

  try {
    const row = await prisma.appSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
    return toSettingsData(row);
  } catch (error) {
    console.error("getSettings failed:", error);
    return DEFAULT_APP_SETTINGS;
  }
}

export async function updateSettings(input: z.infer<typeof updateSettingsSchema>) {
  const user = await getCurrentUser();
  if (!user) {
    return actionError("Nicht angemeldet. Bitte neu anmelden.");
  }
  if (!hasPermission(user.role, "settings.edit")) {
    return actionError("Keine Berechtigung zum Ändern der Einstellungen");
  }

  const parsed = updateSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(getValidationError(parsed.error));
  }

  const data = parsed.data;

  try {
    const existing = await prisma.appSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    const updated = await prisma.appSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: {
        companyName: data.companyName,
        companyAddress: data.companyAddress,
        contactEmail: data.contactEmail,
        prepDaysDefault: data.prepDaysDefault,
        returnDaysDefault: data.returnDaysDefault,
        notifyCheckoutTomorrow: data.notifyCheckoutTomorrow,
        notifyReturnTomorrow: data.notifyReturnTomorrow,
        notifyOverdueReturn: data.notifyOverdueReturn,
        notifyNewBooking: data.notifyNewBooking,
        notifyBookingConflict: data.notifyBookingConflict,
        notifyMaintenanceDue: data.notifyMaintenanceDue,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "AppSettings",
      entityId: SETTINGS_ID,
      oldValue: existing
        ? {
            companyName: existing.companyName,
            companyAddress: existing.companyAddress,
            contactEmail: existing.contactEmail,
            prepDaysDefault: existing.prepDaysDefault,
            returnDaysDefault: existing.returnDaysDefault,
          }
        : DEFAULT_APP_SETTINGS,
      newValue: {
        companyName: updated.companyName,
        companyAddress: updated.companyAddress,
        contactEmail: updated.contactEmail,
        prepDaysDefault: updated.prepDaysDefault,
        returnDaysDefault: updated.returnDaysDefault,
      },
    });

    revalidatePath("/einstellungen");
    return actionSuccess(toSettingsData(updated));
  } catch (error) {
    console.error("updateSettings failed:", error);
    const message =
      error instanceof Error ? error.message : "Einstellungen konnten nicht gespeichert werden";
    return actionError(message);
  }
}
